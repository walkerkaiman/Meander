// Core data types for MEANDER Editor

export interface Position {
  x: number;
  y: number;
}

export interface AudienceMedia {
  type: 'image' | 'video';
  file: string;
  originalFile?: File; // The actual file object for export
  size?: number; // File size in bytes
}

export interface Choice {
  label: string;
  nextStateId: string;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromOutputIndex: number; // 0 or 1 for the two output points
  toNodeId: string;
  label?: string; // Optional label for the connection
}

export interface Scene {
  id: string;
  type: 'scene';
  title: string;
  description: string;
  performerText: string;
  audienceMedia: AudienceMedia[];
  outputIds: string[];
  position: Position;
  connections: string[]; // IDs of outgoing connections
}

export interface OpeningScene {
  id: string;
  type: 'opening';
  title: string;
  description: string;
  performerText: string;
  audienceMedia: AudienceMedia[];
  outputIds: string[];
  position: Position;
  connections: string[]; // IDs of outgoing connections
}

export interface EndingScene {
  id: string;
  type: 'ending';
  title: string;
  description: string;
  performerText: string;
  audienceMedia: AudienceMedia[];
  outputIds: string[];
  position: Position;
  connections: string[]; // IDs of outgoing connections
}

export interface Fork {
  id: string;
  type: 'fork';
  title: string;
  audienceText: string;
  performerText: string;
  countdownSeconds: number;
  choices: Choice[];
  position: Position;
  connections: string[]; // IDs of outgoing connections
  audienceMedia: AudienceMedia[]; // For future use - forks might show media too
  outputIds: string[]; // For future use
}

export type State = Scene | OpeningScene | EndingScene | Fork;

// Update types for partial updates
export type SceneUpdate = Partial<Omit<Scene, 'id' | 'type'>>;
export type OpeningSceneUpdate = Partial<Omit<OpeningScene, 'id' | 'type'>>;
export type EndingSceneUpdate = Partial<Omit<EndingScene, 'id' | 'type'>>;
export type ForkUpdate = Partial<Omit<Fork, 'id' | 'type'>>;
export type StateUpdate = SceneUpdate | OpeningSceneUpdate | EndingSceneUpdate | ForkUpdate;

export interface Output {
  id: string;
  sceneId: string;
  type: 'OSC' | 'DMX' | 'MQTT';
  messages: Array<{
    path: string;
    value: number | string | boolean;
  }>;
}

export interface ShowMetadata {
  author: string;
  lastEditor: string;
  version: string;
  notes: string;
}

export interface Show {
  showName: string;
  version: string;
  created: string;
  lastEdited: string;
  initialStateId: string;
  statesFile: string;
  outputsFile: string;
  metadataFile: string;
}

export interface ProjectData {
  show: Show;
  states: State[];
  outputs: Output[];
  connections: Connection[];
  metadata: ShowMetadata;
}

export interface ValidationError {
  type: 'missing_asset' | 'invalid_connection' | 'missing_choice' | 'invalid_fork' | 'missing_required' | 'missing_connection' | 'orphaned_state';
  message: string;
  nodeId?: string;
}
