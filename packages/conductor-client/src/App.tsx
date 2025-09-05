import React, { useState, useRef, useEffect } from 'react';
import { MantineProvider, Button, FileInput, Text, Container, Notification, Box, createTheme } from '@mantine/core';
import { useConductorSocket } from './hooks/useConductorSocket';
import { useInitialState } from './hooks/useInitialState';
import { useShowStore } from './store/useShowStore';
import Canvas from './components/Canvas';
import ProgressSidebar from './components/ProgressSidebar';
import ControlBar from './components/controls/ControlBar';
import MenuBar from './components/MenuBar';
import ErrorModal from './components/ErrorModal';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { connected } = useConductorSocket();
  const { initialState, loading, error } = useInitialState();
  const { graph, setGraph } = useShowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string; details?: string[] }>({
    open: false,
    title: '',
    message: '',
    details: [],
  });

  useEffect(() => {
    // Check for user preferences on high contrast and reduced motion
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setHighContrast(prefersHighContrast);
    setReducedMotion(prefersReducedMotion);
  }, []);

  useEffect(() => {
    if (error) {
      setErrorModal({
        open: true,
        title: 'Initialization Error',
        message: 'Failed to load initial state from server.',
        details: [error],
      });
    }
  }, [error]);

  useEffect(() => {
    if (!connected && !loading && !error) {
      setErrorModal({
        open: true,
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please ensure the server is running.',
      });
    }
  }, [connected, loading, error]);

  // Create a theme with accessibility considerations
  // Using color-blind safe colors and respecting high contrast
  const theme = createTheme({
    colors: {
      // Using color-blind safe palette (blue and orange instead of red/green)
      blue: ['#e7f5ff', '#cce4ff', '#a0c8ff', '#75aaff', '#4d8cff', '#2670ff', '#1a56db', '#1041b2', '#08318a', '#042363'],
      orange: ['#fff4e6', '#ffe8cc', '#ffd8a8', '#ffc078', '#ffa94d', '#ff922b', '#f76707', '#cc5500', '#a84400', '#883300'],
    },
    primaryColor: highContrast ? 'blue' : 'blue',
    components: {
      Button: {
        styles: {
          root: {
            transition: reducedMotion ? 'none' : 'all 0.2s ease',
          },
        },
      },
    },
  });

  const handleFileChange = (file: File | null) => {
    setFile(file);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('No file selected');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('show', file);

      const response = await fetch('http://localhost:4000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setUploadError(errorData.error || 'Upload failed');
        setUploading(false);
        return;
      }

      const result = await response.json();
      if (result.success) {
        // Assuming the server will broadcast the showLoaded event via WebSocket
        // which will update the store via the useConductorSocket hook
        setUploading(false);
      } else {
        setUploadError(result.errors?.join(', ') || 'Validation failed');
        setUploading(false);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Network error');
      setUploading(false);
    }
  };

  const handleAdvance = () => {
    // Placeholder for advancing to the next node
    // In a real implementation, this would send a request to the server
    console.log('Advance clicked');
  };

  const handlePrevious = () => {
    // Placeholder for going back to the previous node
    console.log('Previous clicked');
  };

  const handleLoadShow = () => {
    // Trigger file input click to open file dialog
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCloseErrorModal = () => {
    setErrorModal({ ...errorModal, open: false });
  };

  if (loading) {
    return <Container>Loading initial state...</Container>;
  }

  if (error) {
    return (
      <Container>
        <ErrorModal
          opened={errorModal.open}
          onClose={handleCloseErrorModal}
          title={errorModal.title}
          message={errorModal.message}
          details={errorModal.details}
        />
        <Text size="xl" weight={700} style={{ margin: '1rem', display: 'block' }}>
          MEANDER Conductor
        </Text>
        <Text>Error loading initial state: {error}</Text>
      </Container>
    );
  }

  if (!connected) {
    return (
      <Container>
        <ErrorModal
          opened={errorModal.open}
          onClose={handleCloseErrorModal}
          title={errorModal.title}
          message={errorModal.message}
          details={errorModal.details}
        />
        <Text size="xl" weight={700} style={{ margin: '1rem', display: 'block' }}>
          MEANDER Conductor
        </Text>
        <Text>Connecting to server...</Text>
      </Container>
    );
  }

  return (
    <MantineProvider theme={theme} withGlobalStyles withNormalizeCSS>
      <Container fluid style={{ padding: 0, height: '100vh' }}>
        <MenuBar onLoadShow={handleLoadShow} />
        <Text size="xl" weight={700} style={{ margin: '0.5rem 1rem', display: 'block' }}>
          MEANDER Conductor
        </Text>
        {graph ? (
          <Box style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3.5rem)' }}>
            <Box style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
              <ProgressSidebar />
              <Box style={{ flexGrow: 1, padding: '1rem' }}>
                <Canvas />
              </Box>
            </Box>
            <ControlBar onAdvance={handleAdvance} onPrevious={handlePrevious} />
          </Box>
        ) : (
          <Box style={{ padding: '1rem' }}>
            <FileInput
              ref={fileInputRef}
              label="Upload Show Package"
              description="Select a ZIP file containing the show package"
              placeholder="Choose file"
              accept=".zip"
              value={file}
              onChange={handleFileChange}
              style={{ marginBottom: '1rem' }}
            />
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              loading={uploading}
              style={{ marginTop: '1rem' }}
            >
              Load Show
            </Button>
            {uploadError && (
              <Notification title="Upload Error" color="red" style={{ marginTop: '1rem' }}>
                {uploadError}
              </Notification>
            )}
          </Box>
        )}
        <ErrorModal
          opened={errorModal.open}
          onClose={handleCloseErrorModal}
          title={errorModal.title}
          message={errorModal.message}
          details={errorModal.details}
        />
      </Container>
    </MantineProvider>
  );
}

export default App;
