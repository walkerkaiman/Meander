import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import helmet from "helmet";
import cors from "cors";
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
