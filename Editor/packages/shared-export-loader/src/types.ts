// Shared types for export/import functionality
export interface Position {
  x: number;
  y: number;
}

export interface AudienceMedia {
  type: 'image' | 'video';
  file: string;
  originalFile?: File;
  size: number;
  checksum?: string;
}

export interface Choice {
  label: string;
  nextStateId: string;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromOutputIndex: number;
  toNodeId: string;
  label?: string;
}

export interface State {
  id: string;
  type: 'scene' | 'opening' | 'ending' | 'fork';
  title: string;
  description: string;
  performerText: string;
  audienceMedia: AudienceMedia[];
  outputIds: string[];
  position: Position;
  connections: string[];
}

export interface Scene extends State {
  type: 'scene';
}

export interface OpeningScene extends State {
  type: 'opening';
}

export interface EndingScene extends State {
  type: 'ending';
}

export interface Fork extends State {
  type: 'fork';
  audienceText: string;
  countdownSeconds: number;
  choices: Choice[];
}

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
  type: 'missing_asset' | 'invalid_connection' | 'missing_choice' | 'invalid_fork' | 'missing_required' | 'missing_connection' | 'orphaned_state' | 'file_corrupted';
  message: string;
  nodeId?: string;
  severity: 'error' | 'warning';
}

export interface ExportedProjectData {
  show: Show;
  states: State[];
  connections: Connection[];
  outputs: Output[];
  metadata: ShowMetadata;
  exportedAt: string;
  version: string;
  packageFormat: string;
  assets: {
    folder: string;
    totalFiles: number;
    missingFiles: string[];
  };
}
