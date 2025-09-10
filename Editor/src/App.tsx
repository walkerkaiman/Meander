import { useState, useCallback } from 'react';
import { ProjectData } from './types';
import { FileOperations } from './utils/fileOperations';
import { loadShowFromFile, cleanupTempFiles } from './utils/fileLoaders';
import { EditorLayout } from './components/EditorLayout';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ValidationPanel } from './components/ValidationPanel';
import './App.css';

function App() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [fadeOutSaveSuccess, setFadeOutSaveSuccess] = useState(false);

  const handleCreateNewShow = async (showName: string, author: string) => {
    setIsLoading(true);
    try {
      // Clean up any existing temporary files when creating new project
      cleanupTempFiles();

      const newProject = FileOperations.createNewShow(showName, author);
      setProjectData(newProject);
      setHasUnsavedChanges(false); // New project starts as saved
    } catch (error) {
      console.error('Error creating new show:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadShow = async () => {
    console.log('=== handleLoadShow called at', new Date().toISOString(), '===');
    console.log('loadShowFromFile function available:', typeof loadShowFromFile);

    setIsLoading(true);
        try {
          console.log('About to call loadShowFromFile');

          if (typeof loadShowFromFile !== 'function') {
            console.error('loadShowFromFile is not a function!');
            return;
          }

          // Clean up any existing temporary files before loading new project
          cleanupTempFiles();

          // Open file picker to allow user to select a file to load
          const fileProject = await loadShowFromFile();
          console.log('loadShowFromFile returned:', fileProject);
          if (fileProject) {
            setProjectData(fileProject);
            setHasUnsavedChanges(false); // Loaded project starts as saved
          }
        } catch (error) {
          console.error('Error loading show:', error);
        } finally {
          setIsLoading(false);
        }
  };


  const handleNewShow = async () => {
    setIsLoading(true);
    try {
      // Clean up any existing temporary files when creating new project
      cleanupTempFiles();

      const newProject = FileOperations.createNewShow('Untitled Show', 'Unknown Author');
      setProjectData(newProject);
      setHasUnsavedChanges(false); // New project starts as saved
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
      // Update the project data with new timestamp from FileOperations
      const updatedProjectData = { ...projectData };
      updatedProjectData.show.lastEdited = new Date().toISOString();
      setProjectData(updatedProjectData);
      setHasUnsavedChanges(false); // Mark as saved

      // Show styled success notification (same as validation success)
      setFadeOutSaveSuccess(false);
      setShowSaveSuccess(true);

      // Start fade out after 2 seconds
      setTimeout(() => {
        setFadeOutSaveSuccess(true);
      }, 2000);

      // Hide completely after fade animation (2.3 seconds total)
      setTimeout(() => {
        setShowSaveSuccess(false);
        setFadeOutSaveSuccess(false);
      }, 2300);

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

  const handleUpdateProject = useCallback((updatedProject: ProjectData) => {
    // Only update if the data actually changed to prevent infinite loops
    if (JSON.stringify(projectData) !== JSON.stringify(updatedProject)) {
      setProjectData(updatedProject);
      setHasUnsavedChanges(true); // Mark as having unsaved changes
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
      <ErrorBoundary>
        <WelcomeScreen
          onCreateNewShow={handleCreateNewShow}
          onLoadShow={handleLoadShow}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <EditorLayout
          projectData={projectData}
          hasUnsavedChanges={hasUnsavedChanges}
          onUpdateProject={handleUpdateProject}
          onNewShow={handleNewShow}
          onLoadShow={handleLoadShow}
          onSaveShow={handleSaveShow}
          onExportShow={handleExportShow}
        />

        {showSaveSuccess && (
          <div className={`save-success-notification ${fadeOutSaveSuccess ? 'fade-out' : ''}`}>
            <ValidationPanel
              errors={[]}
              successTitle="Show Saved Successfully"
              successMessage="Your show has been saved!"
              onClose={() => {}}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
