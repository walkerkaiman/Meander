import React from 'react';
import { useShowStore } from '../store/useShowStore';
import './ProgressSidebar.css';

const ProgressSidebar: React.FC = () => {
  const { showData, activeState } = useShowStore();
  
  if (!showData || !showData.states) {
    return <div className="progress-sidebar">No show data loaded</div>;
  }

  // Calculate progress based on visited states if available
  const totalStates = showData.states.length;
  const visitedStates = showData.states.filter(s => s.id === activeState?.id || s.visited).length;
  const progressPercent = totalStates > 0 ? (visitedStates / totalStates) * 100 : 0;

  return (
    <div className="progress-sidebar">
      <div className="progress-header">
        <h3>Show Progress</h3>
        <div className="progress-stats">
          <span>{visitedStates} / {totalStates} States</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
      <div className="current-state">
        <h4>Current State</h4>
        {activeState ? (
          <div className="current-state-info">
            {showData.states.find(s => s.id === activeState.id)?.title || 'Unknown State'}
          </div>
        ) : (
          <p>No active state</p>
        )}
      </div>
    </div>
  );
};

export default ProgressSidebar;
