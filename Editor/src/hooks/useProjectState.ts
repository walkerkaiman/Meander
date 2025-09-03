import { useState, useCallback } from 'react';
import { ProjectData, UseProjectStateReturn } from '../types';

export const useProjectState = (): UseProjectStateReturn => {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProject = useCallback((updater: (prev: ProjectData) => ProjectData) => {
    setProjectData(prev => {
      if (!prev) return null;
      try {
        return updater(prev);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update project');
        return prev;
      }
    });
  }, []);

  const updateProjectDirect = useCallback((newData: ProjectData) => {
    setProjectData(newData);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    projectData,
    isLoading,
    error,
    updateProject,
    updateProjectDirect,
    clearError
  };
};
