import React, { useEffect, useState } from 'react';
import { useShowStore } from './store/useShowStore';
import Canvas from './components/Canvas';
import ProgressSidebar from './components/ProgressSidebar';
import ControlBar from './components/ControlBar';
import MenuBar from './components/MenuBar';
import MobileView from './components/MobileView';
import './App.css';

import { useConductorSocket } from "./hooks/useConductorSocket";
import { useInitialState } from "./hooks/useInitialState";

function App() {
  const { showData, setShow } = useShowStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Simulate loading show data on mount
    const loadShowData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://${location.hostname}:4000/audience/graph`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const graph = await res.json();
        setShow(graph);
      } catch (error) {
        console.warn('Graph not ready yet, will load later');
        setShow({ states: [], connections: [] });
      } finally {
        setIsLoading(false);
      }
    };
    loadShowData();
  }, [setShow]);

  // Establish WS connection & runtime engine
  useConductorSocket();
  useInitialState();

  if (isLoading) {
    return <div className="loading">Loading show data...</div>;
  }

  // Show mobile view on small screens
  if (isMobile) {
    return <MobileView />;
  }

  // Show desktop view on larger screens
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
