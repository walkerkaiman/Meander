// Copy of conductor-types for audience-page to avoid workspace complexity

export interface ActiveState {
  id: string;
  type: "scene" | "fork";
}

export interface VotePayload {
  showId: string;
  forkId: string;
  choiceIndex: 0 | 1;
  deviceId: string;
}

export interface VoteResult {
  forkId: string;
  counts: [number, number];
  winnerIndex: 0 | 1;
}

export type ServerMessage =
  | { type: "stateChanged"; payload: ActiveState }
  | { type: "showLoaded"; payload: { showId: string } }
  | { type: "validationError"; payload: unknown }
  | { type: "voteTick"; payload: { forkId: string; remainingSeconds: number } }
  | { type: "voteResult"; payload: VoteResult }
  | { type: "timerTick"; payload: { showSeconds: number; sceneSeconds: number } };

export interface SceneNode {
  id: string;
  type: "scene";
  title: string;
  description: string;
  outputIds: string[];
  audienceMedia?: Array<{
    type: 'image' | 'video';
    file: string;
    size: number;
  }>;
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
  nodes?: Record<string, SceneNode | ForkNode>; // New format
  states?: Array<SceneNode | ForkNode>; // Legacy format support
};
