import { useCallback } from 'react';
import { FileOperations } from '../utils/fileOperations';
import { UseProjectOperationsReturn, ProjectValidationError, FileOperationError } from '../types';

interface UseProjectOperationsProps {
  projectData: any;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectOperations = ({
  projectData,
  setIsLoading,
  setError
}: UseProjectOperationsProps): UseProjectOperationsReturn => {

  const createNewShow = useCallback(async (showName: string, author: string) => {
    if (!showName.trim() || !author.trim()) {
      throw new ProjectValidationError('Show name and author are required');
    }

    setIsLoading(true);
    setError(null);

    try {
      FileOperations.createNewShow(showName, author);
      return Promise.resolve(); // Project will be set by parent component
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create new show';
      setError(message);
      throw new ProjectValidationError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError]);

  const loadShow = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedProject = await FileOperations.loadShow();
      if (!loadedProject) {
        throw new FileOperationError('No saved project found', 'load');
      }
      return Promise.resolve(); // Project will be set by parent component
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load show';
      setError(message);
      throw new FileOperationError(message, 'load');
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError]);

  const saveShow = useCallback(async () => {
    if (!projectData) {
      throw new ProjectValidationError('No project to save');
    }

    setIsLoading(true);
    setError(null);

    try {
      await FileOperations.saveShow(projectData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save show';
      setError(message);
      throw new FileOperationError(message, 'save');
    } finally {
      setIsLoading(false);
    }
  }, [projectData, setIsLoading, setError]);

  const exportShow = useCallback(async () => {
    if (!projectData) {
      throw new ProjectValidationError('No project to export');
    }

    setIsLoading(true);
    setError(null);

    try {
      await FileOperations.exportShow(projectData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export show';
      setError(message);
      throw new FileOperationError(message, 'export');
    } finally {
      setIsLoading(false);
    }
  }, [projectData, setIsLoading, setError]);

  const validateProject = useCallback(() => {
    if (!projectData) {
      return [{
        type: 'missing_required' as const,
        message: 'No project to validate',
        severity: 'error' as const
      }];
    }

    try {
      return FileOperations.validateProject(projectData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      setError(message);
      return [{
        type: 'missing_required' as const,
        message,
        severity: 'error' as const
      }];
    }
  }, [projectData, setError]);

  return {
    createNewShow,
    loadShow,
    saveShow,
    exportShow,
    validateProject
  };
};
