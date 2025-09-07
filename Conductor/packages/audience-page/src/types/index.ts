import { ActiveState, ServerMessage, VotePayload, ShowPackage, SceneNode, ForkNode } from './conductor-types';

export interface AudienceConfig {
  serverHost: string;
  serverPort: number;
  websocketPort: number;
}

export interface AudienceState {
  isConnected: boolean;
  activeState: ActiveState | null;
  showGraph: ShowPackage | null;
  currentNode: SceneNode | ForkNode | null;
  countdown: number | null;
  isVoting: boolean;
  selectedChoiceIndex: number | null;
  voteSent: boolean;
  deviceId: string;
  error: string | null;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  alt?: string;
}

export interface Choice {
  index: number;
  label: string;
  nextStateId: string;
}

// Event types for the application
export type AudienceEvent = 
  | { type: 'connection_established' }
  | { type: 'connection_lost' }
  | { type: 'state_updated'; payload: ActiveState }
  | { type: 'graph_loaded'; payload: ShowPackage }
  | { type: 'countdown_updated'; payload: number }
  | { type: 'choice_selected'; payload: number }
  | { type: 'vote_submitted'; payload: VotePayload }
  | { type: 'error_occurred'; payload: string }
  | { type: 'media_loaded' }
  | { type: 'media_error'; payload: string };

// Animation types
export interface TransitionConfig {
  duration: number;
  easing: string;
}

export { ActiveState, ServerMessage, VotePayload, ShowPackage, SceneNode, ForkNode };
