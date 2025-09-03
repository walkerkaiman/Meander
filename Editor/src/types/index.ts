// Core data types for MEANDER Editor

export interface Position {
  x: number;
  y: number;
}

export interface AudienceMedia {
  type: 'image' | 'video';
  file: string;
  originalFile?: File; // The actual file object for export
  size: number; // File size in bytes
  checksum?: string; // For integrity checking
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

// Legacy type for backward compatibility - prefer using StateUpdate<T> with type parameter
export type SceneUpdate = NodeUpdateMap['scene'];
export type OpeningSceneUpdate = NodeUpdateMap['opening'];
export type EndingSceneUpdate = NodeUpdateMap['ending'];
export type ForkUpdate = NodeUpdateMap['fork'];
export type LegacyStateUpdate = SceneUpdate | OpeningSceneUpdate | EndingSceneUpdate | ForkUpdate;

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

// Type guards for better type safety
export const isScene = (state: State): state is Scene => state.type === 'scene';
export const isOpeningScene = (state: State): state is OpeningScene => state.type === 'opening';
export const isEndingScene = (state: State): state is EndingScene => state.type === 'ending';
export const isFork = (state: State): state is Fork => state.type === 'fork';

// Type-safe update types using conditional types
export type NodeUpdateMap = {
  scene: Partial<Omit<Scene, 'id' | 'type'>>;
  opening: Partial<Omit<OpeningScene, 'id' | 'type'>>;
  ending: Partial<Omit<EndingScene, 'id' | 'type'>>;
  fork: Partial<Omit<Fork, 'id' | 'type'>>;
};

export type StateUpdate<T extends State['type'] = State['type']> =
  T extends 'scene' ? NodeUpdateMap['scene'] :
  T extends 'opening' ? NodeUpdateMap['opening'] :
  T extends 'ending' ? NodeUpdateMap['ending'] :
  T extends 'fork' ? NodeUpdateMap['fork'] :
  never;

// Media file handling types
export interface MediaFile {
  metadata: Omit<AudienceMedia, 'originalFile'>;
  file: File;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  checksum?: string;
}

export interface ValidationError {
  type: 'missing_asset' | 'invalid_connection' | 'missing_choice' | 'invalid_fork' | 'missing_required' | 'missing_connection' | 'orphaned_state' | 'file_corrupted';
  message: string;
  nodeId?: string;
  severity: 'error' | 'warning';
}

// Error types for better error handling
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ProjectValidationError extends ApplicationError {
  constructor(message: string, public nodeId?: string) {
    super(message, 'VALIDATION_ERROR', { nodeId });
    this.name = 'ProjectValidationError';
  }
}

export class FileOperationError extends ApplicationError {
  constructor(message: string, public operation: string) {
    super(message, 'FILE_OPERATION_ERROR', { operation });
    this.name = 'FileOperationError';
  }
}

// Hook types for better state management
export interface UseProjectStateReturn {
  projectData: ProjectData | null;
  isLoading: boolean;
  error: string | null;
  updateProject: (updater: (prev: ProjectData) => ProjectData) => void;
  updateProjectDirect: (newData: ProjectData) => void;
  clearError: () => void;
}

export interface UseProjectOperationsReturn {
  createNewShow: (showName: string, author: string) => Promise<void>;
  loadShow: () => Promise<void>;
  saveShow: () => Promise<void>;
  exportShow: () => Promise<void>;
  validateProject: () => ValidationError[];
}
