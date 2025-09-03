import React, { useState } from 'react';
import { ProjectData } from './types';
import { FileOperations } from './utils/fileOperations';
import { EditorLayout } from './components/EditorLayout';
import { WelcomeScreen } from './components/WelcomeScreen';
import './App.css';

function App() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateNewShow = async (showName: string, author: string) => {
    setIsLoading(true);
    try {
      const newProject = FileOperations.createNewShow(showName, author);
      setProjectData(newProject);
    } catch (error) {
      console.error('Error creating new show:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadShow = async () => {
    // Check if there are unsaved changes
    if (projectData && projectData.show.lastEdited !== projectData.show.created) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to load a different show? This will discard all current changes.'
      );
      if (!confirmed) return;
    }
    
    setIsLoading(true);
    try {
      const loadedProject = await FileOperations.loadShow();
      if (loadedProject) {
        setProjectData(loadedProject);
      }
    } catch (error) {
      console.error('Error loading show:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewShow = async () => {
    // Check if there are unsaved changes
    if (projectData && projectData.show.lastEdited !== projectData.show.created) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to create a new show? This will discard all current changes.'
      );
      if (!confirmed) return;
    }
    
    setIsLoading(true);
    try {
      const newProject = FileOperations.createNewShow('Untitled Show', 'Unknown Author');
      setProjectData(newProject);
    } catch (error) {
      console.error('Error creating new show:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveShow = async () => {
    if (!projectData) return;

    setIsLoading(true);
    try {
      await FileOperations.saveShow(projectData);
      // Update the project data with new timestamp
      setProjectData({ ...projectData });
      alert('Show saved successfully!');
    } catch (error) {
      console.error('Error saving show:', error);
      alert(`Failed to save show: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportShow = async () => {
    if (!projectData) return;

    // First validate the project
    const validationErrors = FileOperations.validateProject(projectData);
    if (validationErrors.length > 0) {
      alert(`Cannot export show due to validation errors:\n\n${validationErrors.map(err => `• ${err.message}`).join('\n')}\n\nPlease fix these issues and try again.`);
      return;
    }

    setIsLoading(true);
    try {
      await FileOperations.exportShow(projectData);
      alert('Show exported successfully! Check your downloads folder for the JSON file.');
    } catch (error) {
      console.error('Error exporting show:', error);
      alert(`Failed to export show: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProject = React.useCallback((updatedProject: ProjectData) => {
    // Only update if the data actually changed to prevent infinite loops
    if (JSON.stringify(projectData) !== JSON.stringify(updatedProject)) {
      setProjectData(updatedProject);
    }
  }, [projectData]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!projectData) {
    return (
      <WelcomeScreen 
        onCreateNewShow={handleCreateNewShow}
        onLoadShow={handleLoadShow}
      />
    );
  }

      return (
      <EditorLayout
        projectData={projectData}
        onUpdateProject={handleUpdateProject}
        onNewShow={handleNewShow}
        onLoadShow={handleLoadShow}
        onSaveShow={handleSaveShow}
        onExportShow={handleExportShow}
      />
    );
}

export default App;
