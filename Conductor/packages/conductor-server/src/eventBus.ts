import { EventEmitter } from "eventemitter3";

// Define all event payloads here
export interface Events {
  showLoaded: { showId: string };
  stateChanged: { id: string; type: "scene" | "fork" };
  voteReceived: { payload: import("@meander/conductor-types").VotePayload };
  voteTallied: { result: import("@meander/conductor-types").VoteResult };
  validationError: { errors: unknown[] };
}

class TypedEventBus extends EventEmitter<Events> {}

export const eventBus = new TypedEventBus();
