// Re-export Editor validation logic to share between Editor and Conductor
import { FileOperations } from "../../../../Editor/src/utils/fileOperations";
import type { ValidationError } from "../../../../Editor/src/types";

export function validateShow(projectData: any): ValidationError[] {
  return FileOperations.validateProject(projectData);
}

export type { ValidationError };
