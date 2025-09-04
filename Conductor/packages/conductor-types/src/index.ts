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
