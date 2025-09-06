import React from 'react';
import { useShowStore } from '../store/useShowStore';
import './ProgressSidebar.css';
import MediaPreview from './MediaPreview';

const ProgressSidebar: React.FC = () => {
  const { showData, activeState } = useShowStore();
  
  if (!showData || !showData.states) {
    return <div className="progress-sidebar">No show data loaded</div>;
  }

  return (
    <div className="progress-sidebar">
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

      {/* Flexible container that pushes itself to the bottom */}
      {activeState && (
        <div className="state-extra">
          <h4>Description</h4>
          <p className="state-description">
            {showData.states.find(s => s.id === activeState.id)?.description || '—'}
          </p>

          <h4>Performer</h4>
          <p className="state-performer">
            {showData.states.find(s => s.id === activeState.id)?.performerText || '—'}
          </p>

          {/* Media Preview */}
          <h4>Media</h4>
          <MediaPreview media={showData.states.find(s => s.id === activeState.id)?.audienceMedia || []} />
        </div>
      )}
    </div>
  );
};

export default ProgressSidebar;
