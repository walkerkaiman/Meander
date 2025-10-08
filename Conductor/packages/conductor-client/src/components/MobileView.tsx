import React from 'react';
import { useShowStore } from '../store/useShowStore';
import { useConductorEngine } from '../runtime/useConductorEngine';
import './MobileView.css';

export default function MobileView() {
  const { showData, activeState } = useShowStore();
  const { advance, showSeconds, sceneSeconds } = useConductorEngine();
  
  // Format timer: seconds to HH:MM:SS
  const formatTimer = (secs: number) => {
    return new Date(secs * 1000).toISOString().substr(11, 8);
  };

  // Find the current node details from show data
  const currentNode = showData?.states?.find((state: any) => state.id === activeState?.id);
  
  const handleReset = async () => {
    try {
      const response = await fetch(`http://${location.hostname}:4000/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.error('Reset failed:', response.status);
      }
    } catch (error) {
      console.error('Reset error:', error);
    }
  };

  const handleAdvance = () => {
    advance();
  };

  if (!activeState || !currentNode) {
    return (
      <div className="mobile-view">
        <div className="mobile-container">
          <div className="mobile-status">
            <h1>🎭 MEANDER Conductor</h1>
            <p className="status-message">No show loaded. Please load a show from the desktop interface.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-view">
      <div className="mobile-container">
        <header className="mobile-header">
          <div className="mobile-header-top">
            <h1>🎭 MEANDER</h1>
            <div className="show-timer">{formatTimer(showSeconds)}</div>
          </div>
        </header>

        <div className="mobile-content">
          <section className="current-state-section">
            <div className="current-state-header">
              <h2 className="section-label">Current State</h2>
              <div className="scene-timer">{formatTimer(sceneSeconds)}</div>
            </div>
            <h3 className="state-title">{currentNode.title || currentNode.id}</h3>
          </section>

          {currentNode.description && (
            <section className="info-section">
              <h2 className="section-label">Description</h2>
              <p className="info-text">{currentNode.description}</p>
            </section>
          )}

          {currentNode.performerText && (
            <section className="info-section performer-notes">
              <h2 className="section-label">Performer Notes</h2>
              <p className="info-text">{currentNode.performerText}</p>
            </section>
          )}

          {currentNode.type === 'fork' && currentNode.choices && (
            <section className="info-section choices-section">
              <h2 className="section-label">Audience Choices</h2>
              <div className="choices-list">
                {currentNode.choices.map((choice: any, idx: number) => (
                  <div key={idx} className="choice-item">
                    <span className="choice-label">{choice.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="mobile-controls">
          <button 
            className="mobile-btn mobile-btn-reset"
            onClick={handleReset}
          >
            🔄 Reset
          </button>
          <button 
            className="mobile-btn mobile-btn-advance"
            onClick={handleAdvance}
          >
            ➡️ Advance
          </button>
        </div>
      </div>
    </div>
  );
}

