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
export interface Scene {
    id: string;
    type: 'scene';
    title: string;
    description: string;
    performerText: string;
    audienceMedia: AudienceMedia[];
    outputIds: string[];
    position: Position;
    connections: string[];
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
    connections: string[];
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
    connections: string[];
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
    connections: string[];
    audienceMedia: AudienceMedia[];
    outputIds: string[];
}
export type State = Scene | OpeningScene | EndingScene | Fork;
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
export declare const isScene: (state: State) => state is Scene;
export declare const isOpeningScene: (state: State) => state is OpeningScene;
export declare const isEndingScene: (state: State) => state is EndingScene;
export declare const isFork: (state: State) => state is Fork;
export type NodeUpdateMap = {
    scene: Partial<Omit<Scene, 'id' | 'type'>>;
    opening: Partial<Omit<OpeningScene, 'id' | 'type'>>;
    ending: Partial<Omit<EndingScene, 'id' | 'type'>>;
    fork: Partial<Omit<Fork, 'id' | 'type'>>;
};
export type StateUpdate<T extends State['type'] = State['type']> = T extends 'scene' ? NodeUpdateMap['scene'] : T extends 'opening' ? NodeUpdateMap['opening'] : T extends 'ending' ? NodeUpdateMap['ending'] : T extends 'fork' ? NodeUpdateMap['fork'] : never;
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
export declare class ApplicationError extends Error {
    code: string;
    context?: Record<string, any> | undefined;
    constructor(message: string, code: string, context?: Record<string, any> | undefined);
}
export declare class ProjectValidationError extends ApplicationError {
    nodeId?: string | undefined;
    constructor(message: string, nodeId?: string | undefined);
}
export declare class FileOperationError extends ApplicationError {
    operation: string;
    constructor(message: string, operation: string);
}
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
//# sourceMappingURL=index.d.ts.map