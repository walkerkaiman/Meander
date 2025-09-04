// Core data types for MEANDER Editor
// Type guards for better type safety
export const isScene = (state) => state.type === 'scene';
export const isOpeningScene = (state) => state.type === 'opening';
export const isEndingScene = (state) => state.type === 'ending';
export const isFork = (state) => state.type === 'fork';
// Error types for better error handling
export class ApplicationError extends Error {
    code;
    context;
    constructor(message, code, context) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'ApplicationError';
    }
}
export class ProjectValidationError extends ApplicationError {
    nodeId;
    constructor(message, nodeId) {
        super(message, 'VALIDATION_ERROR', { nodeId });
        this.nodeId = nodeId;
        this.name = 'ProjectValidationError';
    }
}
export class FileOperationError extends ApplicationError {
    operation;
    constructor(message, operation) {
        super(message, 'FILE_OPERATION_ERROR', { operation });
        this.operation = operation;
        this.name = 'FileOperationError';
    }
}
//# sourceMappingURL=index.js.map