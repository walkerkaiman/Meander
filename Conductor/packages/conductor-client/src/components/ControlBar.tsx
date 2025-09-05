import React from 'react';
import { useShowStore } from '../store/useShowStore';
import './ControlBar.css';

const ControlBar: React.FC = () => {
  const { activeState, advanceState, previousState, canAdvance, canGoBack } = useShowStore();
  
  const handleAdvance = () => {
    if (canAdvance) {
      advanceState();
    }
  };

  const handlePrevious = () => {
    if (canGoBack) {
      previousState();
    }
  };

  return (
    <div className="control-bar">
      <button 
        className="control-btn control-btn-back" 
        onClick={handlePrevious}
        disabled={!canGoBack}
      >
        Back
      </button>
      <div className="control-info">
        {activeState ? 'Active State: ' + activeState.id : 'No Active State'}
      </div>
      <button 
        className="control-btn control-btn-advance" 
        onClick={handleAdvance}
        disabled={!canAdvance}
      >
        Advance
      </button>
    </div>
  );
};

export default ControlBar;
