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

// Middlewares
app.use(helmet());
app.use(cors({ origin: true }));
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
app.use(
  "/media",
  express.static(projectAssetsDir, {
    etag: false,
    maxAge: 0,
    cacheControl: false,
    setHeaders(res) {
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    },
  })
);

// ------------------ Upload Show Package ------------------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.post("/upload", upload.single("show"), async (req, res) => {
  try {
    if (!req.file) {
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
    sequencer.loadShow(showJson);

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
  sequencer.manualAdvance();
  res.status(202).end();
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
  let remaining = VOTE_DURATION;
  const interval = setInterval(() => {
    remaining -= 1;
    broadcast({ type: "voteTick", payload: { forkId, remainingSeconds: remaining } });
    if (remaining <= 0) {
      clearInterval(interval);
      const winnerIndex: 0 | 1 = Math.random() > 0.5 ? 0 : 1; // placeholder random winner
      broadcast({ type: "voteResult", payload: { forkId, counts: [0, 0], winnerIndex } });
      activeVote = null;
      sequencer.manualAdvance(); // move to winner path TODO compute path based on winner
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
  snapshot.activeState = payload; // keep REST snapshot in sync
});
serverEventBus.on("validationError", (payload) => broadcast({ type: "validationError", payload }));

// Start server
server.listen(Number(env.SERVER_PORT), "0.0.0.0", () => {
  console.log(`Conductor server listening on :${env.SERVER_PORT}`);
});
