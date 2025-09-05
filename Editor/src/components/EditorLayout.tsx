import React, { useState, useCallback, useRef } from 'react';
import { ProjectData, StateUpdate } from '../types';
import { StateTree } from './StateTree';
import SlimCanvas from './SlimCanvas';
const Canvas = SlimCanvas;
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';

import { FileOperations } from '../utils/fileOperations';

interface EditorLayoutProps {
  projectData: ProjectData;
  hasUnsavedChanges: boolean;
  onUpdateProject: (project: ProjectData) => void;
  onNewShow: () => void;
  onLoadShow: () => void;
  onSaveShow: () => void;
  onExportShow: () => void;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  projectData,
  hasUnsavedChanges,
  onUpdateProject,
  onNewShow,
  onLoadShow,
  onSaveShow,
  onExportShow
}) => {
  // Use ref to track last update to prevent expensive comparisons
  const lastUpdateRef = useRef<string>('');
  const handleCreateConnection = useCallback((fromNodeId: string, fromOutputIndex: number, toNodeId: string) => {
    // Remove any existing connection originating from same output
    let updatedConnections = projectData.connections.filter(conn => !(conn.fromNodeId === fromNodeId && conn.fromOutputIndex === fromOutputIndex));

    // Remove reference from states connections arrays
    let updatedStates = projectData.states.map(s => {
      if (s.connections && s.connections.length) {
        return { ...s, connections: s.connections.filter(cid => {
          const conn = projectData.connections.find(c=>c.id===cid);
          return !(conn && conn.fromNodeId===fromNodeId && conn.fromOutputIndex===fromOutputIndex);
        }) } as any;
      }
      return s;
    });

    const connectionId = FileOperations.generateUniqueId();
    const newConnection = {
      id: connectionId,
      fromNodeId,
      fromOutputIndex,
      toNodeId
    };

    const fromNode = projectData.states.find(state => state.id === fromNodeId);

    if (fromNode && fromNode.type === 'fork' && fromOutputIndex < fromNode.choices.length) {
      // Update the fork's choice at the specified output index
      const updatedChoices = [...fromNode.choices];
      updatedChoices[fromOutputIndex] = {
        ...updatedChoices[fromOutputIndex],
        nextStateId: toNodeId
      };

      updatedStates = updatedStates.map(state =>
        state.id === fromNodeId
          ? { ...state, choices: updatedChoices, connections: [...state.connections, connectionId] }
          : state
      );
    } else if (fromNode) {
      // Update the fromNode's connections array for non-fork nodes
      updatedStates = updatedStates.map(state =>
        state.id === fromNodeId
          ? { ...state, connections: [...state.connections, connectionId] }
          : state
      );
    }

    const updatedProject = {
      ...projectData,
      states: updatedStates,
      connections: [...updatedConnections, newConnection]
    };

    onUpdateProject(updatedProject);
    return connectionId;
  }, [projectData, onUpdateProject]);

  const handleDeleteConnection = useCallback((connectionId: string) => {
    const connectionToDelete = projectData.connections.find(conn => conn.id === connectionId);

    if (!connectionToDelete) {
      console.warn('Connection not found:', connectionId);
      return;
    }

    // Check if the fromNode is a fork and clear its choice accordingly
    const fromNode = projectData.states.find(state => state.id === connectionToDelete.fromNodeId);
    let updatedStates = [...projectData.states];

    if (fromNode && fromNode.type === 'fork' && connectionToDelete.fromOutputIndex < fromNode.choices.length) {
      // Clear the fork's choice at the specified output index
      const updatedChoices = [...fromNode.choices];
      updatedChoices[connectionToDelete.fromOutputIndex] = {
        ...updatedChoices[connectionToDelete.fromOutputIndex],
        nextStateId: ''
      };

      updatedStates = updatedStates.map(state =>
        state.id === fromNode.id
          ? { ...state, choices: updatedChoices, connections: state.connections.filter(id => id !== connectionId) }
          : state
      );
    } else if (fromNode) {
      // Remove the connection ID from the fromNode's connections array for non-fork nodes
      updatedStates = updatedStates.map(state =>
        state.id === fromNode.id
          ? { ...state, connections: state.connections.filter(id => id !== connectionId) }
          : state
      );
    }

    const updatedProject = {
      ...projectData,
      states: updatedStates,
      connections: projectData.connections.filter(conn => conn.id !== connectionId)
    };

    onUpdateProject(updatedProject);
  }, [projectData, onUpdateProject]);


  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  const handleAddScene = () => {
    const newScene = {
      id: FileOperations.generateUniqueId(),
      type: 'scene' as const,
      title: 'New Scene',
      description: '',
      performerText: '',
      audienceMedia: [],
      outputIds: [],
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      connections: []
    };

    const updatedProject = {
      ...projectData,
      states: [...projectData.states, newScene]
    };

    onUpdateProject(updatedProject);
    setSelectedNodeId(newScene.id);
  };

  const handleAddFork = () => {
    const newFork = {
      id: FileOperations.generateUniqueId(),
      type: 'fork' as const,
      title: 'New Choice',
      audienceText: 'What will you choose?',
      performerText: '',
      countdownSeconds: 30,
      choices: [
        { label: 'Choice A', nextStateId: '' },
        { label: 'Choice B', nextStateId: '' }
      ],
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      connections: [],
      audienceMedia: [],
      outputIds: []
    };

    const updatedProject = {
      ...projectData,
      states: [...projectData.states, newFork]
    };

    onUpdateProject(updatedProject);
    setSelectedNodeId(newFork.id);
  };

  const handleAddOpening = () => {
    const newOpening = {
      id: FileOperations.generateUniqueId(),
      type: 'opening' as const,
      title: 'Opening Scene',
      description: 'The story begins here.',
      performerText: 'Enter and begin the performance.',
      audienceMedia: [],
      outputIds: [],
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      connections: []
    };

    const updatedProject = {
      ...projectData,
      states: [...projectData.states, newOpening]
    };

    onUpdateProject(updatedProject);
    setSelectedNodeId(newOpening.id);
  };

  const handleAddEnding = () => {
    const newEnding = {
      id: FileOperations.generateUniqueId(),
      type: 'ending' as const,
      title: 'Ending Scene',
      description: 'The story concludes here.',
      performerText: 'Conclude the performance.',
      audienceMedia: [],
      outputIds: [],
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      connections: []
    };

    const updatedProject = {
      ...projectData,
      states: [...projectData.states, newEnding]
    };

    onUpdateProject(updatedProject);
    setSelectedNodeId(newEnding.id);
  };

  const handleUpdateNode = useCallback((nodeId: string, updates: StateUpdate) => {
    // Create a simple hash of the update for comparison
    const updateHash = `${nodeId}-${JSON.stringify(updates)}`;

    // Skip if this is the same update we just processed
    if (lastUpdateRef.current === updateHash) {
      return;
    }
    lastUpdateRef.current = updateHash;

    const updatedStates = projectData.states.map(state =>
      state.id === nodeId ? { ...state, ...updates } : state
    );

    const updatedProject = {
      ...projectData,
      states: updatedStates
    };

    onUpdateProject(updatedProject);
  }, [projectData, onUpdateProject]);

    const handleDeleteNode = (nodeId: string) => {
    // Get all connections that involve the deleted node
    const connectionsToRemove = projectData.connections.filter(
      conn => conn.fromNodeId === nodeId || conn.toNodeId === nodeId
    );

    // Get the IDs of connections to remove
    const connectionIdsToRemove = connectionsToRemove.map(conn => conn.id);

    // Remove connections from the connections array
    const updatedConnections = projectData.connections.filter(
      conn => !connectionIdsToRemove.includes(conn.id)
    );

    // Update remaining states
    const updatedStates = projectData.states
      .filter(state => state.id !== nodeId) // Remove the deleted node
      .map(state => {
        if (state.type === 'fork') {
          // For fork nodes, update choices and connections
          const updatedChoices = state.choices.map(choice => ({
            ...choice,
            nextStateId: choice.nextStateId === nodeId ? '' : choice.nextStateId
          }));

          const updatedConnections = state.connections.filter(
            connId => !connectionIdsToRemove.includes(connId)
          );

          return {
            ...state,
            choices: updatedChoices,
            connections: updatedConnections
          };
        } else {
          // For other node types, just update connections
          const updatedConnections = state.connections.filter(
            connId => !connectionIdsToRemove.includes(connId)
          );

          return {
            ...state,
            connections: updatedConnections
          };
        }
      });

    const updatedProject = {
      ...projectData,
      states: updatedStates,
      connections: updatedConnections
    };

    onUpdateProject(updatedProject);

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };





  const selectedNode = selectedNodeId
    ? projectData.states.find(state => state.id === selectedNodeId) || null
    : null;

  return (
    <div className="editor-layout">
      <Toolbar
        projectName={projectData.show.showName}
        hasUnsavedChanges={hasUnsavedChanges}
        onNewShow={onNewShow}
        onLoadShow={onLoadShow}
        onSave={onSaveShow}
        onExport={onExportShow}
        onAddScene={handleAddScene}
        onAddFork={handleAddFork}
        onAddOpening={handleAddOpening}
        onAddEnding={handleAddEnding}
      />
      
      <div className="editor-main">
        <div className="editor-left-panel">
          <StateTree
            states={projectData.states}
            connections={projectData.connections}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
            onDeleteNode={handleDeleteNode}
          />
        </div>
        
        <div className="editor-center">
          <Canvas
            states={projectData.states}
            connections={projectData.connections}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
            onUpdateNode={handleUpdateNode}
            onCreateConnection={handleCreateConnection}
            onDeleteConnection={handleDeleteConnection}
          />
        </div>
        
        <div className="editor-right-panel">
          <PropertiesPanel
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
          />
        </div>
      </div>

    </div>
  );
};
