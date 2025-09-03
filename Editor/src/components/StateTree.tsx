import React from 'react';
import { State, Scene, Fork } from '../types';
import { Play, GitBranch, Trash2 } from 'lucide-react';

interface StateTreeProps {
  states: State[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const StateTree: React.FC<StateTreeProps> = ({
  states,
  selectedNodeId,
  onNodeSelect,
  onDeleteNode
}) => {
  const handleNodeClick = (nodeId: string) => {
    onNodeSelect(selectedNodeId === nodeId ? null : nodeId);
  };

  const handleDeleteClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this node?')) {
      onDeleteNode(nodeId);
    }
  };

  const renderScene = (scene: Scene) => (
    <div
      key={scene.id}
      className={`tree-node scene-node ${selectedNodeId === scene.id ? 'selected' : ''}`}
      onClick={() => handleNodeClick(scene.id)}
    >
      <div className="node-icon">
        <Play size={16} />
      </div>
      <div className="node-content">
        <div className="node-title">{scene.title || 'Untitled Scene'}</div>
        <div className="node-subtitle">
          {scene.connections.length} connections
          {scene.audienceMedia.length > 0 && ` • ${scene.audienceMedia.length} media`}
        </div>
      </div>
      <button
        className="delete-btn"
        onClick={(e) => handleDeleteClick(e, scene.id)}
        title="Delete Scene"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const renderFork = (fork: Fork) => (
    <div
      key={fork.id}
      className={`tree-node fork-node ${selectedNodeId === fork.id ? 'selected' : ''}`}
      onClick={() => handleNodeClick(fork.id)}
    >
      <div className="node-icon">
        <GitBranch size={16} />
      </div>
      <div className="node-content">
        <div className="node-title">{fork.title || 'Untitled Choice'}</div>
        <div className="node-subtitle">
          {fork.choices.length} choices • {fork.countdownSeconds}s timer
        </div>
      </div>
      <button
        className="delete-btn"
        onClick={(e) => handleDeleteClick(e, fork.id)}
        title="Delete Choice"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const scenes = states.filter((state): state is Scene => state.type === 'scene');
  const forks = states.filter((state): state is Fork => state.type === 'fork');

  return (
    <div className="state-tree">
      <div className="tree-header">
        <h3>Story States</h3>
        <div className="tree-stats">
          {scenes.length} Scenes • {forks.length} Choices
        </div>
      </div>
      
      <div className="tree-section">
        <h4>Scenes</h4>
        <div className="tree-nodes">
          {scenes.map(renderScene)}
        </div>
      </div>
      
      <div className="tree-section">
        <h4>Choices</h4>
        <div className="tree-nodes">
          {forks.map(renderFork)}
        </div>
      </div>
      
      {states.length === 0 && (
        <div className="empty-state">
          <p>No states yet. Add a scene to get started!</p>
        </div>
      )}
    </div>
  );
};
