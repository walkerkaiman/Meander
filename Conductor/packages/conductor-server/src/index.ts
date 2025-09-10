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
import QRCode from "qrcode";
import { networkInterfaces } from "os";
import { audienceRouter } from "./routes/audience";
import { Sequencer } from "./sequencer";
import { eventBus as serverEventBus } from "./eventBus";
import { snapshot } from "./routes/audience";
import { OscPublisher } from "./osc";

// Load env
dotenv.config();

const envSchema = z.object({
  SERVER_PORT: z.string().default("4000"),
  OSC_PORT: z.string().default("57121"),
  DATA_DIR: z.string().default(`${require("os").homedir()}/.meander`),
  LOG_LEVEL: z.string().default("info"),
});
const env = envSchema.parse(process.env);

// Get local network IP address
function getLocalNetworkIP(): string {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const networkInterface = interfaces[name];
    if (networkInterface) {
      for (const net of networkInterface) {
        // Skip internal (loopback) and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return 'localhost'; // fallback
}

const localIP = getLocalNetworkIP();
const serverPort = Number(env.SERVER_PORT);

// Instantiate core pieces
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const sequencer = new Sequencer(env.DATA_DIR);
const oscPublisher = new OscPublisher(Number(env.OSC_PORT));

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

// QR Code page route
app.get('/QR', async (req, res) => {
  try {
    const baseUrl = `http://${localIP}:${serverPort}`;
    const audienceUrl = `${baseUrl}/audience-page`;
    const performerUrl = `${baseUrl}/performer-page`; // Future performer page
    
    // Generate QR codes as data URLs
    const audienceQR = await QRCode.toDataURL(audienceUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    const performerQR = await QRCode.toDataURL(performerUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MEANDER QR Codes</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #000;
            color: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            width: 100%;
            text-align: center;
        }
        
        h1 {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, #0066cc, #00aaff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .qr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 3rem;
            margin-top: 2rem;
        }
        
        .qr-section {
            background: #111;
            border-radius: 20px;
            padding: 2rem;
            border: 2px solid #333;
            transition: transform 0.3s ease, border-color 0.3s ease;
        }
        
        .qr-section:hover {
            transform: translateY(-5px);
            border-color: #0066cc;
        }
        
        .qr-section h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #fff;
        }
        
        .qr-section p {
            font-size: 1rem;
            color: #ccc;
            margin-bottom: 1.5rem;
            line-height: 1.5;
        }
        
        .qr-code {
            margin: 1rem 0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 102, 204, 0.3);
        }
        
        .qr-code img {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .url-display {
            background: #222;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            color: #00aaff;
            word-break: break-all;
            border: 1px solid #333;
        }
        
        .server-info {
            margin-top: 3rem;
            padding: 1.5rem;
            background: #111;
            border-radius: 15px;
            border: 1px solid #333;
        }
        
        .server-info h3 {
            font-size: 1.2rem;
            margin-bottom: 0.5rem;
            color: #00aaff;
        }
        
        .server-info p {
            color: #ccc;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2rem;
            }
            
            .qr-grid {
                grid-template-columns: 1fr;
                gap: 2rem;
            }
            
            .qr-section {
                padding: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>MEANDER QR Codes</h1>
        
        <div class="qr-grid">
            <div class="qr-section">
                <h2>🎭 Audience Page</h2>
                <p>Scan this QR code to access the audience voting interface on your mobile device.</p>
                <div class="qr-code">
                    <img src="${audienceQR}" alt="Audience Page QR Code">
                </div>
                <div class="url-display">${audienceUrl}</div>
            </div>
            
            <div class="qr-section">
                <h2>🎪 Performer Page</h2>
                <p>Scan this QR code to access the performer interface (coming soon).</p>
                <div class="qr-code">
                    <img src="${performerQR}" alt="Performer Page QR Code">
                </div>
                <div class="url-display">${performerUrl}</div>
            </div>
        </div>
        
        <div class="server-info">
            <h3>🌐 Server Information</h3>
            <p>Local Network IP: <strong>${localIP}</strong> | Port: <strong>${serverPort}</strong></p>
            <p>Make sure all devices are connected to the same local network.</p>
        </div>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating QR codes:', error);
    res.status(500).send('Error generating QR codes');
  }
});

// Placeholder for future performer page
app.get('/performer-page', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MEANDER Performer Page - Coming Soon</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #000;
            color: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
        }
        h1 {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #0066cc, #00aaff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        p {
            font-size: 1.2rem;
            color: #ccc;
            margin-bottom: 2rem;
        }
        .coming-soon {
            background: #111;
            border-radius: 20px;
            padding: 2rem;
            border: 2px solid #333;
            max-width: 600px;
        }
    </style>
</head>
<body>
    <div class="coming-soon">
        <h1>🎪 Performer Page</h1>
        <p>This page is coming soon!</p>
        <p>The performer interface will provide special controls and information for performers during interactive shows.</p>
    </div>
</body>
</html>
  `);
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

// OSC test endpoint
app.post("/test-osc", (_req, res) => {
  console.log('🧪 Testing OSC messages...');
  oscPublisher.testMessage();
  oscPublisher.stateChanged("scene", "Test Scene");
  oscPublisher.forkCountdown("Test Fork", 5);
  res.json({ success: true, message: "OSC test messages sent" });
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

// Reset endpoint - sets state to Opening scene
app.post("/reset", (_req, res) => {
  console.log('🔄 RESET REQUEST RECEIVED - Setting to Opening scene');
  try {
    // Get the initial state ID from the show data
    const showFilePath = path.join(PROJECT_ROOT, "CurrentProject", "show.json");
    console.log('🔄 Looking for show.json at:', showFilePath);

    if (fs.existsSync(showFilePath)) {
      console.log('✅ show.json file exists');
      let showData;
      try {
        const rawData = fs.readFileSync(showFilePath, 'utf8');
        console.log('✅ Read file successfully, parsing JSON...');
        showData = JSON.parse(rawData);
        console.log('✅ JSON parsed successfully');
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        return res.status(500).json({ error: 'Invalid show.json format' });
      }

      // Find the initial state ID (Opening scene)
      let initialStateId = showData.show?.initialStateId;
      console.log('🔍 initialStateId from show.show:', initialStateId);

      if (!initialStateId && showData.states && showData.states.length > 0) {
        console.log('🔄 No initialStateId found, looking for first scene...');
        // Fallback to first scene if no initialStateId
        const openingScene = showData.states.find((s: any) => s.type === 'scene');
        if (openingScene) {
          initialStateId = openingScene.id;
          console.log('✅ Found opening scene:', initialStateId);
        } else {
          console.log('❌ No scene found in states array');
        }
      }

      if (initialStateId) {
        console.log('🎯 Resetting to initial state:', initialStateId);
        try {
          sequencer.resetToState(initialStateId);
          console.log('✅ Reset to Opening scene successful');
          res.status(200).json({ success: true, message: 'Reset to Opening scene successful' });
        } catch (resetError) {
          console.error('❌ Sequencer reset error:', resetError);
          res.status(500).json({ error: 'Failed to reset sequencer state' });
        }
      } else {
        console.log('❌ No initial state found in show data');
        console.log('🔍 Show data structure:', {
          hasShow: !!showData.show,
          hasStates: !!showData.states,
          statesCount: showData.states?.length || 0,
          states: showData.states?.map((s: any) => ({ id: s.id, type: s.type })) || []
        });
        res.status(404).json({ error: 'No initial state found' });
      }
    } else {
      console.log('❌ show.json file not found at:', showFilePath);
      console.log('🔍 Current directory:', process.cwd());
      console.log('🔍 PROJECT_ROOT:', PROJECT_ROOT);
      res.status(404).json({ error: 'show.json not found' });
    }
  } catch (error) {
    console.error('❌ Failed to reset show:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Failed to reset show' });
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
  let forkName = forkId; // fallback to id
  if (sequencer && (sequencer as any).show && (sequencer as any).show.nodes) {
    const forkNode = (sequencer as any).show.nodes[forkId];
    if (forkNode) {
      if (forkNode.countdownSeconds) {
        countdownSeconds = forkNode.countdownSeconds;
        console.log(`Using fork-specific countdown: ${countdownSeconds}s for ${forkId}`);
      }
      // Get fork name for OSC messages
      forkName = forkNode.title || forkNode.id;
    }
  }

  let remaining = countdownSeconds;
  const interval = setInterval(() => {
    remaining -= 1;
    broadcast({ type: "voteTick", payload: { forkId, remainingSeconds: remaining } });
    
    // Send OSC countdown message
    oscPublisher.forkCountdown(forkName, remaining);
    
    if (remaining <= 0) {
      clearInterval(interval);

      // Add a small buffer delay to allow any pending votes to be processed
      // This prevents race conditions where votes arrive after countdown finishes
      console.log('🗳️ Vote countdown finished, waiting 500ms for any pending votes...');
      setTimeout(() => {
        // Tally actual votes instead of random selection
        const voteResult = sequencer.tallyVotes(forkId);
        console.log('🗳️ Vote countdown complete. Final result:', voteResult);

        broadcast({ type: "voteResult", payload: { forkId, counts: voteResult.counts, winnerIndex: voteResult.winnerIndex } });
        activeVote = null;

        // Advance to the path based on the winning choice
        sequencer.advanceToChoice(forkId, voteResult.winnerIndex);
      }, 500); // 500ms buffer for pending votes
    }
  }, 1000);

  activeVote = { forkId, remaining, interval };
  broadcast({ type: "voteTick", payload: { forkId, remainingSeconds: remaining } });
  
  // Send initial OSC countdown message
  oscPublisher.forkCountdown(forkName, remaining);
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
  console.log(`🌐 QR Codes page: http://${localIP}:${serverPort}/QR`);
  console.log(`🎭 Audience page: http://${localIP}:${serverPort}/audience-page`);
  console.log(`🎪 Performer page: http://${localIP}:${serverPort}/performer-page (coming soon)`);
});
