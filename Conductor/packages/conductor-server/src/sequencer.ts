import path from "path";
import { Level } from "level";
import { eventBus } from "./eventBus";
import { OscPublisher } from "./osc";
import { ActiveState, VotePayload } from "@meander/conductor-types";

export interface ShowPackage {
  metadata: { initialStateId: string };
  nodes: Record<string, { id: string; type: "scene" | "fork"; next?: string; choices?: Array<{ nextStateId: string }> }>;
}

export class Sequencer {
  private db: Level<string, string>;
  private current: ActiveState | null = null;
  private osc = new OscPublisher();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(private dataDir: string) {
    const dbPath = path.join(dataDir, "db", "current");
    this.db = new Level(dbPath, { valueEncoding: "json" });
    this.restore();

    // Heartbeat every 5 seconds
    this.heartbeatTimer = setInterval(() => this.osc.heartbeat(), 5000);

    // Listen for votes
    eventBus.on("voteReceived", ({ payload }) => this.onVote(payload));
  }

  private async restore() {
    try {
      const snapshot = await this.db.get("current");
      this.current = snapshot as ActiveState;
      if (this.current) {
        eventBus.emit("stateChanged", this.current);
      }
    } catch (_) {}
  }

  public loadShow(show: ShowPackage) {
    this.current = { id: show.metadata.initialStateId, type: show.nodes[show.metadata.initialStateId].type } as ActiveState;
    this.persist();
    eventBus.emit("showLoaded", { showId: "local" });
    eventBus.emit("stateChanged", this.current);
  }

  public manualAdvance() {
    if (!this.current) return;
    const nextId = this.computeNext(this.current.id);
    this.advance(nextId);
  }

  private advance(nextId: string) {
    if (!this.current) return;
    // For brevity, skipping validation
    this.current = { id: nextId, type: "scene" } as ActiveState;
    this.persist();
    // OSC broadcast
    const path = this.current.type === "scene" ? `/scene/${nextId}` : `/fork/${nextId}`;
    this.osc.stateChanged(path);
    eventBus.emit("stateChanged", this.current);
  }

  private computeNext(currentId: string): string {
    // TODO implement using nodes graph
    return currentId; // placeholder
  }

  private persist() {
    if (this.current) {
      this.db.put("current", this.current).catch(console.error);
    }
  }

  private onVote(_payload: VotePayload) {
    // TODO implement vote tally logic
  }
}
