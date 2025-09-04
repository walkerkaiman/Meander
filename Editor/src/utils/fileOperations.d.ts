import { ProjectData, ValidationError, AudienceMedia } from '../types';
export declare class FileOperations {
    static createNewShow(showName: string, author: string): ProjectData;
    static loadShow(): Promise<ProjectData | null>;
    static saveShow(projectData: ProjectData): Promise<void>;
    static createMediaFileReference(file: File): Omit<AudienceMedia, 'originalFile' | 'checksum'>;
    static validateFileIntegrity(file: File): Promise<boolean>;
    static exportShow(projectData: ProjectData): Promise<void>;
    static validateProject(projectData: ProjectData): ValidationError[];
    private static collectConnectedStates;
    static generateUniqueId(): string;
}
//# sourceMappingURL=fileOperations.d.ts.map