import React, { useEffect, useState } from 'react';
import { useShowStore } from './store/useShowStore';
import Canvas from './components/Canvas';
import ProgressSidebar from './components/ProgressSidebar';
import ControlBar from './components/ControlBar';
import MenuBar from './components/MenuBar';
import './App.css';

function App() {
  const { showData, setShow } = useShowStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading show data on mount
    const loadShowData = async () => {
      setIsLoading(true);
      try {
        // This is a placeholder until we implement actual show loading
        // For now, we'll use dummy data or an empty show
        const dummyShowData = {
          states: [],
          connections: []
        };
        setShow(dummyShowData);
      } catch (error) {
        console.error('Error loading show data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadShowData();
  }, [setShow]);

  if (isLoading) {
    return <div className="loading">Loading show data...</div>;
  }

  return (
    <div className="app-container">
      <MenuBar />
      <div className="main-content">
        <ProgressSidebar />
        <Canvas />
      </div>
      <ControlBar />
      {!showData || showData.states.length === 0 ? (
        <div className="no-data-message">No show data loaded. Please upload a show.</div>
      ) : null}
    </div>
  );
}

export default App;
