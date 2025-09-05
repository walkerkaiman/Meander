// Re-export components from Editor for use in Conductor
export * from '../../../Editor/src/components/Canvas';
export * from '../../../Editor/src/components/Node';
export * from '../../../Editor/src/components/Connection';

// Re-export specific types from Editor (avoiding conflicts)
export type {
  ProjectData,
  ValidationError,
  State,
  Scene,
  OpeningScene,
  EndingScene,
  Fork,
  Connection,
  Position,
  AudienceMedia
} from '../../../Editor/src/types/index';

// Export shared utilities
export { ExportLoader } from './exportLoader';

