import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { eventBus } from "../eventBus";
import { VotePayload } from "@meander/conductor-types";

export interface Snapshot {
  activeState: { id: string; type: "scene" | "fork" } | null;
  graph?: any;
}

// Simple in-memory snapshot for now
const snapshot: Snapshot = { activeState: null, graph: null };

const voteSchema = z.object({
  showId: z.string(),
  forkId: z.string(),
  choiceIndex: z.union([z.literal(0), z.literal(1)]),
  deviceId: z.string(),
});

const router = Router();

// Rate limit 6 requests per 10 seconds per IP
router.use(
  "/vote",
  rateLimit({ windowMs: 10_000, max: 6, standardHeaders: true, legacyHeaders: false })
);

router.get("/show", (_req, res) => {
  if (!snapshot.activeState) {
    return res.status(503).json({ code: "ERR_SHOW_NOT_FOUND", message: "No show loaded" });
  }
  res.json(snapshot.activeState);
});

router.get("/graph", (_req, res) => {
  if (!snapshot.graph) {
    return res.status(503).json({ code: "ERR_NO_GRAPH", message: "No graph loaded" });
  }
  res.json(snapshot.graph);
});

router.post("/vote", (req, res) => {
  const parse = voteSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ code: "ERR_VALIDATION", message: "Invalid vote payload" });
  }
  const payload = parse.data as VotePayload;
  eventBus.emit("voteReceived", { payload });
  res.status(202).end();
});

export { router as audienceRouter };
export { snapshot };
