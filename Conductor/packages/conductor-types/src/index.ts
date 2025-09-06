// Runtime types shared between Conductor server & client

export interface ActiveState {
  id: string;
  type: "scene" | "fork";
}

export interface VotePayload {
  showId: string;
  forkId: string;
  choiceIndex: 0 | 1;
  deviceId: string; // session cookie identifying device
}

export interface VoteResult {
  forkId: string;
  counts: [number, number];
  winnerIndex: 0 | 1;
}

// ---------------- WebSocket messaging schema ----------------
// Client -> Server messages
export type ClientMessage =
  | { type: "startVote"; payload: { forkId: string } };

// Server -> Client messages
export type ServerMessage =
  | { type: "stateChanged"; payload: ActiveState }
  | { type: "validationError"; payload: unknown }
  | { type: "voteTick"; payload: { forkId: string; remainingSeconds: number } }
  | { type: "voteResult"; payload: VoteResult };

// Utility helper types
export type AnyMessage = ClientMessage | ServerMessage;

// Re-export core editor types so downstream code can import from one place.
// The Editor project isn't published as a package yet, so we re-declare minimal placeholders here.
export interface SceneNode {
  id: string;
  type: "scene";
  title: string;
  description: string;
  outputIds: string[];
}

export interface ForkNode {
  id: string;
  type: "fork";
  title: string;
  choices: Array<{ label: string; nextStateId: string }>;
}

export type ShowPackage = {
  metadata: {
    initialStateId: string;
  };
  nodes: Record<string, SceneNode | ForkNode>;
};
