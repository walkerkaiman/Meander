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
  private show: ShowPackage | null = null;

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
    this.show = show;
    this.current = { id: show.metadata.initialStateId, type: show.nodes[show.metadata.initialStateId].type } as ActiveState;
    // Build simple graph format for conductor-client
    const states = Object.values(show.nodes).map((n, idx) => ({
      id: n.id,
      type: n.type,
      title: (n as any).title ?? n.id,
      description: (n as any).description ?? "",
      choices: (n as any).choices ?? [],
      position: { x: (idx % 5) * 200 + 100, y: Math.floor(idx / 5) * 150 + 100 },
    }));
    const connections: Array<any> = [];
    Object.values(show.nodes).forEach((n: any) => {
      if (n.type === "scene" && n.next) {
        connections.push({ id: `${n.id}->${n.next}`, fromNodeId: n.id, toNodeId: n.next, fromOutputIndex: 0, label: "" });
      }
      if (n.type === "fork" && n.choices) {
        n.choices.forEach((c: any, idx: number) => {
          connections.push({ id: `${n.id}-${idx}->${c.nextStateId}`, fromNodeId: n.id, toNodeId: c.nextStateId, fromOutputIndex: idx, label: c.label });
        });
      }
    });
    require("./routes/audience").snapshot.graph = { states, connections };
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
    if (!this.show) return currentId;
    const node = this.show.nodes[currentId];
    if (!node) return currentId;
    if (node.type === "scene") {
      return node.next ?? currentId;
    }
    // If fork - for manual advance we default to first choice
    if (node.type === "fork" && node.choices && node.choices.length > 0) {
      return node.choices[0].nextStateId;
    }
    return currentId;
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
