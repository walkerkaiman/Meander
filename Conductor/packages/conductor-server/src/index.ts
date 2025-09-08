import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import fs from "fs";
import { promises as fsp } from "fs";
import multer from "multer";
import AdmZip from "adm-zip";
import dotenv from "dotenv";
import { EventEmitter } from "eventemitter3";
import { z } from "zod";
import { audienceRouter } from "./routes/audience";
import { Sequencer } from "./sequencer";
import { eventBus as serverEventBus } from "./eventBus";
import { snapshot } from "./routes/audience";

// Load env
dotenv.config();

const envSchema = z.object({
  SERVER_PORT: z.string().default("4000"),
  OSC_PORT: z.string().default("57121"),
  DATA_DIR: z.string().default(`${require("os").homedir()}/.meander`),
  LOG_LEVEL: z.string().default("info"),
});
const env = envSchema.parse(process.env);

// Instantiate core pieces
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const sequencer = new Sequencer(env.DATA_DIR);

// Middlewares - Configure Helmet for local development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for local dev
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "blob:", "*"], // Allow all image sources for local development
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "*"], // Allow all media sources for local development
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for local development
}));
app.use(cors({ 
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: "10mb" }));
app.use("/audience", audienceRouter);

// Serve media assets extracted from show packages
// Assets are expected under <DATA_DIR>/assets/<filename>
// In dev we want CurrentProject folder alongside repository root so files are easy to inspect.
const PROJECT_ROOT = path.resolve(process.cwd());
const projectDir = path.join(PROJECT_ROOT, "CurrentProject");
const projectAssetsDir = path.join(projectDir, "assets");

// Ensure directories exist and mount static handler
fs.mkdirSync(projectAssetsDir, { recursive: true });
// Handle OPTIONS requests for media endpoint
app.options('/media/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

app.use(
  "/media",
  express.static(projectAssetsDir, {
    etag: false,
    maxAge: 0,
    cacheControl: false,
    setHeaders(res) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    },
  })
);

// Serve built audience page directly from Conductor server with permissive CSP
const audiencePagePath = path.join(__dirname, '../../audience-page/dist');
app.use('/audience-page', express.static(audiencePagePath, {
  setHeaders: (res, path) => {
    // More permissive CSP for audience page
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *; " +
      "style-src 'self' 'unsafe-inline' *; " +
      "img-src 'self' data: blob: *; " +
      "connect-src 'self' ws: wss: *; " +
      "font-src 'self' data: *; " +
      "object-src 'none'; " +
      "media-src 'self' *; " +
      "frame-src 'none';"
    );
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  }
}));

// Redirect root audience route to the built page
app.get('/audience', (req, res) => {
  res.redirect('/audience-page/');
});

// Redirect conductor route to the conductor UI
app.get('/conductor', (req, res) => {
  // Always redirect to localhost since conductor UI is typically used locally
  res.redirect('http://localhost:5173/');
});

// Legacy audience UI route (for backwards compatibility)
app.use('/audience-ui', express.static(path.join(__dirname, '../public')));

// ------------------ Upload Show Package ------------------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.post("/upload", upload.single("show"), async (req, res) => {
  console.log('📡 Upload request received');
  console.log('📄 File details:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');

  try {
    if (!req.file) {
      console.log('❌ No file in upload request');
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    // Extract zip in memory using AdmZip
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    // read show.json
    const showEntry = zipEntries.find((e) => e.entryName === "show.json");
    if (!showEntry) {
      return res.status(400).json({ success: false, error: "show.json missing in package" });
    }
    let showJson: any = JSON.parse(showEntry.getData().toString("utf-8"));

    // Convert legacy format (states array) to nodes record expected by Sequencer
    if (!showJson.nodes && Array.isArray(showJson.states)) {
      const nodesRec: Record<string, any> = {};
      for (const s of showJson.states) {
        nodesRec[s.id] = { ...s }; // keep all properties (position, performerText, etc.)
      }
      showJson = {
        metadata: { initialStateId: showJson.show?.initialStateId ?? showJson.show?.initialStateId ?? Object.keys(nodesRec)[0] },
        nodes: nodesRec,
        connections: showJson.connections ?? [],
      };
    }

    // Wipe previous project dir
    try {
      await fsp.rm(projectDir, { recursive: true, force: true });
    } catch (_) {}
    await fsp.mkdir(projectAssetsDir, { recursive: true });

    // Manually extract entries so we can catch errors and ensure files are written
    for (const entry of zipEntries) {
      const destPath = path.join(projectDir, entry.entryName);
      if (entry.isDirectory) {
        await fsp.mkdir(destPath, { recursive: true });
      } else {
        await fsp.mkdir(path.dirname(destPath), { recursive: true });
        await fsp.writeFile(destPath, entry.getData());
      }
    }

    // Delegate to sequencer to load package
    console.log('📦 Loading show package...');
    sequencer.loadShow(showJson);
    console.log('✅ Show package loaded and persisted');

    res.json({ success: true });
  } catch (e: any) {
    console.error("Upload failed", e);
    res.status(500).json({ success: false, error: e?.message ?? "Server error" });
  }
});

// Health endpoint
app.get("/healthz", (_, res) => {
  res.json({ status: "ok" });
});

// Manual advance endpoint
app.post("/advance", (_req, res) => {
  console.log('🔄 ADVANCE REQUEST RECEIVED');
  console.log('Current state before advance:', sequencer.current);
  console.log('Show data available:', !!sequencer.show);
  console.log('Show nodes available:', sequencer.show ? Object.keys(sequencer.show.nodes || {}).length : 'no show');

  sequencer.manualAdvance();

  console.log('New state after advance:', sequencer.current);
  console.log('✅ Advance request completed');
  res.status(202).end();
});

// Reload show endpoint for testing
app.post("/reload", (_req, res) => {
  console.log('🔄 RELOAD REQUEST RECEIVED');
  try {
    // Re-read the show.json file and reload the show
    const showFilePath = path.join(PROJECT_ROOT, "CurrentProject", "show.json");
    if (fs.existsSync(showFilePath)) {
      const showData = JSON.parse(fs.readFileSync(showFilePath, 'utf8'));
      sequencer.loadShow(showData);
      console.log('✅ Show reloaded successfully');
      res.status(200).json({ success: true, message: 'Show reloaded' });
    } else {
      console.log('❌ show.json file not found');
      res.status(404).json({ error: 'show.json not found' });
    }
  } catch (error) {
    console.error('❌ Failed to reload show:', error);
    res.status(500).json({ error: 'Failed to reload show' });
  }
});

// ----- Voting State -----
type VoteSession = {
  forkId: string;
  remaining: number;
  interval: NodeJS.Timeout;
};

let activeVote: VoteSession | null = null;
const VOTE_DURATION = 15; // seconds

// ---- Timer broadcast ----
setInterval(() => {
  const seq = sequencer as any;
  if (!seq.timers || !seq.timers.showStart) return;
  const now = Date.now();
  const showSeconds = Math.floor((now - seq.timers.showStart) / 1000);
  const sceneSeconds = seq.timers.sceneStart ? Math.floor((now - seq.timers.sceneStart) / 1000) : 0;
  broadcast({ type: "timerTick", payload: { showSeconds, sceneSeconds } });
}, 1000);

function broadcast(data: any) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

function startVote(forkId: string) {
  if (activeVote) return; // ignore if already voting

  // Get countdown duration from the fork node
  let countdownSeconds = VOTE_DURATION; // default fallback
  if (sequencer && (sequencer as any).show && (sequencer as any).show.nodes) {
    const forkNode = (sequencer as any).show.nodes[forkId];
    if (forkNode && forkNode.countdownSeconds) {
      countdownSeconds = forkNode.countdownSeconds;
      console.log(`Using fork-specific countdown: ${countdownSeconds}s for ${forkId}`);
    }
  }

  let remaining = countdownSeconds;
  const interval = setInterval(() => {
    remaining -= 1;
    broadcast({ type: "voteTick", payload: { forkId, remainingSeconds: remaining } });
    if (remaining <= 0) {
      clearInterval(interval);
      
      // Tally actual votes instead of random selection
      const voteResult = sequencer.tallyVotes(forkId);
      console.log('🗳️ Vote countdown complete. Final result:', voteResult);
      
      broadcast({ type: "voteResult", payload: { forkId, counts: voteResult.counts, winnerIndex: voteResult.winnerIndex } });
      activeVote = null;
      
      // Advance to the path based on the winning choice
      sequencer.advanceToChoice(forkId, voteResult.winnerIndex);
    }
  }, 1000);

  activeVote = { forkId, remaining, interval };
  broadcast({ type: "voteTick", payload: { forkId, remainingSeconds: remaining } });
}

// WebSocket connection handler
wss.on("connection", (ws) => {
  // Immediately send current state if available
  if (snapshot.activeState) {
    ws.send(JSON.stringify({ type: "stateChanged", payload: snapshot.activeState }));
  }
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "startVote") {
        startVote(msg.payload.forkId);
      }
    } catch (e) {
      console.warn("WS bad message", e);
    }
  });
});

// Wire internal events to WS
serverEventBus.on("stateChanged", (payload) => {
  console.log('📡 Broadcasting stateChanged to WebSocket clients:', payload);
  console.log('📡 Current graph snapshot has states:', snapshot.graph?.states?.length || 0);

  // Verify the node exists in the graph snapshot before broadcasting
  const nodeExists = snapshot.graph?.states?.some((state: any) => state.id === payload.id);
  if (!nodeExists) {
    console.log('⚠️ WARNING: Broadcasting state change for node that doesn\'t exist in graph snapshot!');
    console.log('⚠️ Available nodes in snapshot:', snapshot.graph?.states?.map((s: any) => s.id) || []);
  } else {
    console.log('✅ Node exists in graph snapshot, safe to broadcast');
  }

  snapshot.activeState = payload; // keep REST snapshot in sync
  broadcast({ type: "stateChanged", payload }); // broadcast to all WebSocket clients
  console.log('📡 WebSocket broadcast completed');
});

serverEventBus.on("showLoaded", (payload) => {
  console.log('📡 Broadcasting showLoaded to WebSocket clients:', payload);
  broadcast({ type: "showLoaded", payload });
});

serverEventBus.on("validationError", (payload) => broadcast({ type: "validationError", payload }));

// Start server
server.listen(Number(env.SERVER_PORT), "0.0.0.0", () => {
  console.log(`Conductor server listening on :${env.SERVER_PORT}`);
  console.log(`📊 Show data persistence: ${env.DATA_DIR}/db/current`);
});
