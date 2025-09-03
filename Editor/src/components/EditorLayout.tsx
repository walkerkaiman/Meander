import React, { useState, useCallback, useEffect } from 'react';
import { ProjectData, StateUpdate } from '../types';
import { StateTree } from './StateTree';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';

import { FileOperations } from '../utils/fileOperations';

interface EditorLayoutProps {
  projectData: ProjectData;
  onUpdateProject: (project: ProjectData) => void;
  onNewShow: () => void;
  onLoadShow: () => void;
  onSaveShow: () => void;
  onExportShow: () => void;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  projectData,
  onUpdateProject,
  onNewShow,
  onLoadShow,
  onSaveShow,
  onExportShow
}) => {
  const handleCreateConnection = useCallback((fromNodeId: string, fromOutputIndex: number, toNodeId: string) => {
    const connectionId = FileOperations.generateUniqueId();
    const newConnection = {
      id: connectionId,
      fromNodeId,
      fromOutputIndex,
      toNodeId,
      label: fromOutputIndex === 0 ? 'Primary' : 'Secondary'
    };

    const updatedProject = {
      ...projectData,
      connections: [...projectData.connections, newConnection]
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

    const updatedProject = {
      ...projectData,
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
      connections: []
    };

    const updatedProject = {
      ...projectData,
      states: [...projectData.states, newFork]
    };

    onUpdateProject(updatedProject);
    setSelectedNodeId(newFork.id);
  };

  const handleUpdateNode = (nodeId: string, updates: StateUpdate) => {
    const updatedStates = projectData.states.map(state => 
      state.id === nodeId ? { ...state, ...updates } : state
    );

    const updatedProject = {
      ...projectData,
      states: updatedStates
    };

    onUpdateProject(updatedProject);
  };

  const handleDeleteNode = (nodeId: string) => {
    const updatedStates = projectData.states.filter(state => state.id !== nodeId);
    
    // Remove connections to this node
    const cleanedStates = updatedStates.map(state => {
      if (state.type === 'fork') {
        return {
          ...state,
          connections: state.connections.filter(conn => conn !== nodeId),
          choices: state.choices.map(choice => ({
            ...choice,
            nextStateId: choice.nextStateId === nodeId ? '' : choice.nextStateId
          }))
        };
      } else {
        return {
          ...state,
          connections: state.connections.filter(conn => conn !== nodeId)
        };
      }
    });

    const updatedProject = {
      ...projectData,
      states: cleanedStates
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
        hasUnsavedChanges={projectData.show.lastEdited !== projectData.show.created}
        onNewShow={onNewShow}
        onLoadShow={onLoadShow}
        onSave={onSaveShow}
        onExport={onExportShow}
        onAddScene={handleAddScene}
        onAddFork={handleAddFork}
      />
      
      <div className="editor-main">
        <div className="editor-left-panel">
          <StateTree
            states={projectData.states}
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
