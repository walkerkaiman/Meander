import React from 'react';
import { State, Scene, OpeningScene, EndingScene, Fork, Connection } from '../types';
import { Play, GitBranch, Trash2, Square } from 'lucide-react';

interface StateTreeProps {
  states: State[];
  connections: Connection[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const StateTree: React.FC<StateTreeProps> = ({
  states,
  connections,
  selectedNodeId,
  onNodeSelect,
  onDeleteNode
}) => {
  const handleNodeClick = (nodeId: string) => {
    onNodeSelect(selectedNodeId === nodeId ? null : nodeId);
  };

  const handleDeleteClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove a scene?')) {
      onDeleteNode(nodeId);
    }
  };

  const renderScene = (scene: Scene) => {
    // Count inputs (incoming connections) and outputs (outgoing connections)
    const inputConnections = connections.filter(conn => conn.toNodeId === scene.id).length;
    const outputConnections = connections.filter(conn => conn.fromNodeId === scene.id).length;

    return (
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
            {inputConnections} Inputs • {outputConnections} Outputs
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
  };

  const renderOpeningScene = (opening: OpeningScene) => {
    // Count inputs (incoming connections) and outputs (outgoing connections)
    const inputConnections = connections.filter(conn => conn.toNodeId === opening.id).length;
    const outputConnections = connections.filter(conn => conn.fromNodeId === opening.id).length;

    return (
      <div
        key={opening.id}
        className={`tree-node opening-node ${selectedNodeId === opening.id ? 'selected' : ''}`}
        onClick={() => handleNodeClick(opening.id)}
      >
        <div className="node-icon">
          <Square size={16} />
        </div>
        <div className="node-content">
          <div className="node-title">{opening.title || 'Opening Scene'}</div>
          <div className="node-subtitle">
            {inputConnections} Inputs • {outputConnections} Outputs
            {opening.audienceMedia.length > 0 && ` • ${opening.audienceMedia.length} media`}
          </div>
        </div>
        <button
          className="delete-btn"
          onClick={(e) => handleDeleteClick(e, opening.id)}
          title="Delete Opening Scene"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  const renderEndingScene = (ending: EndingScene) => {
    // Count inputs (incoming connections) and outputs (outgoing connections)
    const inputConnections = connections.filter(conn => conn.toNodeId === ending.id).length;
    const outputConnections = connections.filter(conn => conn.fromNodeId === ending.id).length;

    return (
      <div
        key={ending.id}
        className={`tree-node ending-node ${selectedNodeId === ending.id ? 'selected' : ''}`}
        onClick={() => handleNodeClick(ending.id)}
      >
        <div className="node-icon">
          <Square size={16} />
        </div>
        <div className="node-content">
          <div className="node-title">{ending.title || 'Ending Scene'}</div>
          <div className="node-subtitle">
            {inputConnections} Inputs • {outputConnections} Outputs
            {ending.audienceMedia.length > 0 && ` • ${ending.audienceMedia.length} media`}
          </div>
        </div>
        <button
          className="delete-btn"
          onClick={(e) => handleDeleteClick(e, ending.id)}
          title="Delete Ending Scene"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

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
          {fork.countdownSeconds}s timer
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
  const openingScenes = states.filter((state): state is OpeningScene => state.type === 'opening');
  const endingScenes = states.filter((state): state is EndingScene => state.type === 'ending');
  const forks = states.filter((state): state is Fork => state.type === 'fork');

  const totalScenes = scenes.length + openingScenes.length + endingScenes.length;

  return (
    <div className="state-tree">
      <div className="tree-header">
        <h3>Story States</h3>
        <div className="tree-stats">
          {totalScenes} Scenes • {forks.length} Choices
        </div>
      </div>

      <div className="tree-section">
        <h4>Scenes</h4>
        <div className="tree-nodes">
          {openingScenes.map(renderOpeningScene)}
          {scenes.map(renderScene)}
          {endingScenes.map(renderEndingScene)}
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
