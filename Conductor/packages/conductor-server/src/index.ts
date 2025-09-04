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

// TODO: attach routes (audience service etc.)

// WebSocket basic echo for now
wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    console.log("WS recv", data.toString());
  });
});

// WS broadcast helper
function broadcast(data: any) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

// Wire internal events to WS
serverEventBus.on("stateChanged", (payload) => broadcast({ type: "stateChanged", payload }));
serverEventBus.on("validationError", (payload) => broadcast({ type: "validationError", payload }));

// Start server
server.listen(Number(env.SERVER_PORT), "0.0.0.0", () => {
  console.log(`Conductor server listening on :${env.SERVER_PORT}`);
});
