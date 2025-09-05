import express from 'express';
import { createServer } from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import AdmZip from 'adm-zip';
import { validateShow } from 'editor-validator';
import { serverEventBus } from './eventBus';
import { audienceRouter } from './routes/audience';
import { initOscPublisher, stopOscPublisher } from './osc';
import { Sequencer } from './sequencer';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Validate environment variables
const envSchema = z.object({
  SERVER_PORT: z.string().default('4000').transform(val => parseInt(val, 10)),
  OSC_PORT: z.string().default('57121').transform(val => parseInt(val, 10)),
  DATA_DIR: z.string().default('~/.meander'),
  LOG_LEVEL: z.string().default('info'),
  RATE_LIMIT_WINDOW: z.string().default('10').transform(val => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().default('6').transform(val => parseInt(val, 10)),
  OPERATOR_DOMAIN: z.string().default('http://localhost:5173'),
});

const env = envSchema.parse(process.env);

// Initialize logging with Pino
const logDir = join(env.DATA_DIR, 'conductor', 'logs');
await fs.mkdir(logDir, { recursive: true });
const logger = pino({
  level: env.LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  // Rotate logs daily
  timestamp: pino.stdTimeFunctions.isoTime,
  // Use file transport for rotation (requires pino-file or similar, but for simplicity we'll log to console with pretty)
});

logger.info('Starting MEANDER Conductor Server');

// Initialize app and server
const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:'],
    },
  },
}));
app.use(cors({
  origin: env.OPERATOR_DOMAIN,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// CSRF Protection Middleware
const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const csrfToken = req.cookies['csrf-token'];
  const providedToken = req.headers['x-csrf-token'] as string;

  if (req.method === 'POST' && req.url === '/audience/vote') {
    if (!csrfToken || !providedToken || csrfToken !== providedToken) {
      logger.warn('CSRF token validation failed for /audience/vote');
      return res.status(403).json({ error: 'CSRF token validation failed' });
    }
  }

  // Generate and set CSRF token for the client if not present
  if (!csrfToken) {
    const newToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', newToken, { httpOnly: true, sameSite: 'lax' });
  }

  next();
};
app.use(csrfProtection);

// Setup multer for file uploads
const upload = multer({ dest: os.tmpdir() });

// Health check endpoint
app.get('/healthz', (req, res) => {
  const sequencer = new Sequencer(serverEventBus);
  const currentState = sequencer.getCurrentState();
  res.status(200).json({
    status: 'ok',
    sequencerState: currentState || null,
  });
});

// Audience routes with rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW * 1000,
  max: env.RATE_LIMIT_MAX,
});
app.use('/audience', limiter, audienceRouter);

// Upload route for show packages
app.post('/upload', upload.single('show'), async (req, res) => {
  try {
    if (!req.file) {
      logger.warn('No file uploaded in /upload request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const zipPath = req.file.path;
    const extractPath = path.join(os.tmpdir(), `meander-${Date.now()}`);
    await fs.mkdir(extractPath, { recursive: true });
    logger.info(`Extracting uploaded ZIP to ${extractPath}`);

    // Extract ZIP
const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    // Validate show package
    logger.info('Validating show package');
    const validationResult = await validateShow(extractPath);
    if (!validationResult.success) {
      logger.warn('Show package validation failed', { errors: validationResult.errors });
      serverEventBus.emit('validationError', validationResult.errors);
      return res.status(400).json({ success: false, errors: validationResult.errors });
    }

    // Load into Sequencer
    const sequencer = new Sequencer(serverEventBus);
    await sequencer.loadShow(validationResult.data);
    serverEventBus.emit('showLoaded', validationResult.data);
    logger.info('Show package loaded successfully');

    // Clean up temporary files
    await fs.unlink(zipPath);
    await fs.rm(extractPath, { recursive: true, force: true });
    logger.info('Cleaned up temporary files');

    return res.json({ success: true });
  } catch (error) {
    logger.error('Upload error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Manual jump endpoint for operator to advance to any node
app.post('/jump', (req, res) => {
  const jumpSchema = z.object({
    nodeId: z.string(),
  });

  const result = jumpSchema.safeParse(req.body);
  if (!result.success) {
    logger.warn('Invalid request for /jump', { error: result.error });
    return res.status(400).json({ error: 'Invalid request', details: result.error });
  }

  const { nodeId } = result.data;
  const sequencer = new Sequencer(serverEventBus);
  const success = sequencer.advance(nodeId);
  logger.info(`Manual jump requested to node ${nodeId}`, { success });

  if (success) {
    return res.json({ success: true });
  } else {
    return res.status(400).json({ success: false, error: 'Failed to advance to the specified node' });
  }
});

// WebSocket connection handling
wss.on('connection', (client) => {
  logger.info('WebSocket client connected');
  client.on('message', (message) => {
    // Handle WebSocket messages if needed
    logger.debug('WebSocket message received', { message });
  });

  client.on('close', () => {
    logger.info('WebSocket client disconnected');
    // Handle disconnection
  });

  // Send initial state or welcome message if needed
  client.send(JSON.stringify({ type: 'connection', status: 'connected' }));
});

// Initialize OSC publisher
const oscPublisher = initOscPublisher(env.OSC_PORT, serverEventBus);
logger.info(`OSC Publisher initialized on port ${env.OSC_PORT}`);

// Start server
server.listen(env.SERVER_PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${env.SERVER_PORT}`);
});

// Handle server shutdown
const shutdownSafe = async () => {
  logger.info('Initiating safe shutdown...');
  try {
    // Stop OSC publisher
    stopOscPublisher();
    logger.info('OSC publisher stopped');
    // Additional cleanup if needed (e.g., closing DB connections)
    // Close server
    server.close(() => {
      logger.info('Server shut down complete.');
      process.exit(0);
    });
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdownSafe();
});

process.on('uncaughtException', (err) => {
  logger.fatal('Uncaught Exception thrown:', err);
  shutdownSafe();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down server...');
  shutdownSafe();
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down server...');
  shutdownSafe();
});
