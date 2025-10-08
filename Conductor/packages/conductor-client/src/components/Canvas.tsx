import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { Controls, Background, NodeTypes, MiniMap } from 'react-flow-renderer';
import { useShowStore } from '../store/useShowStore';
import './Canvas.css';

// Custom Node Components
import SceneNode from './SceneNode';
import ForkNode from './ForkNode';

// Define custom node types
const nodeTypes: NodeTypes = {
  sceneNode: SceneNode,
  forkNode: ForkNode,
};

const Canvas: React.FC = () => {
  const { showData, activeState } = useShowStore();

  // Debug logging for Canvas state changes
  React.useEffect(() => {
    console.log('🎨 Canvas received activeState update:', activeState);
    console.log('🎨 Canvas showData states:', showData?.states?.length || 0);
  }, [activeState, showData]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  if (!showData) {
    return <div className="canvas">No show data loaded</div>;
  }

  // Ensure states array exists
  const states = showData.states || [];

  // Convert states to nodes for React Flow
  console.log('🔄 Building nodes for activeState:', activeState?.id, 'total states:', states.length);
  const nodes = states.map(state => {
    // Ensure position is defined and reasonable
    const position = state.position && state.position.x !== undefined && state.position.y !== undefined
      ? state.position
      : { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 };

    const isCurrent = state.id === activeState?.id;
    console.log(`🔍 Node ${state.id} isCurrent: ${isCurrent} (activeState: ${activeState?.id})`);

    const nodeData = {
      id: state.id,
      type: state.type === 'fork' ? 'forkNode' : 'sceneNode',
      data: {
        label: state.title || 'Untitled Node',
        isCurrent: isCurrent,
        type: state.type,
        description: state.description || '',
        choices: state.type === 'fork' ? state.choices : [],
        audienceMedia: state.audienceMedia || []
      },
      position: position,
      draggable: false,
      selectable: false
    };

    console.log(`🎨 Node ${state.id} data.isCurrent:`, nodeData.data.isCurrent);
    return nodeData;
  });

  // Ensure connections array exists
  const connections = showData.connections || [];
  console.log('🔗 Building edges from connections:', connections.length, 'connections');

  // Convert connections to edges for React Flow
  const edges = connections
    .filter(conn => {
      const sourceExists = nodes.some(n => n.id === conn.fromNodeId);
      const targetExists = nodes.some(n => n.id === conn.toNodeId);
      const exists = sourceExists && targetExists;
      if (!exists) {
        console.log('⚠️ Filtering out connection:', conn.fromNodeId, '->', conn.toNodeId, '(source exists:', sourceExists, ', target exists:', targetExists, ')');
      }
      return exists;
    })
    .map(conn => {
        console.log('🔗 Creating edge:', conn.fromNodeId, '->', conn.toNodeId, 'with React Flow marker');
      // derive label for fork choices if missing
      let label = conn.label || '';
      if (!label) {
        const fromNode = states.find(s => s.id === conn.fromNodeId);
        if (fromNode && fromNode.type === 'fork' && fromNode.choices) {
          label = fromNode.choices[conn.fromOutputIndex]?.label || '';
        }
      }

      return {
        id: conn.id,
        source: conn.fromNodeId,
        target: conn.toNodeId,
        sourceHandle: (() => {
          const fromNode = states.find(s => s.id === conn.fromNodeId);
          if (fromNode && fromNode.type === 'fork') {
            return `output-${conn.fromOutputIndex}`;
          }
          return 'output';
        })(),
        type: 'bezier',
        animated: false,
        markerEnd: {
          type: 'arrowclosed',
          color: '#64748b',
          width: 20,
          height: 20,
        },
        label,
        style: {
          stroke: activeState && conn.fromNodeId === activeState.id ? '#facc15' : '#64748b',
          strokeWidth: activeState && conn.fromNodeId === activeState.id ? 3 : 2,
          filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.1))'
        }
      };
    });

  console.log('🔗 Final edges created:', edges.length, 'edges');

  const onLoad = useCallback((rfi) => {
    if (!reactFlowInstance) {
      setReactFlowInstance(rfi);
      // No automatic fitView - let user control zoom/pan manually
    }
  }, [reactFlowInstance]);

  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      console.log('🎯 useEffect triggered - updating React Flow nodes');
      console.log('🎯 Current activeState:', activeState?.id, 'nodes length:', nodes.length);

      // Force update the nodes in React Flow
      reactFlowInstance.setNodes(nodes);

      // Also force update the edges to ensure visual state is consistent
      reactFlowInstance.setEdges(edges);

      // No automatic fitView - preserve user's zoom/pan settings
    }
  }, [reactFlowInstance, activeState, nodes, edges]);

  // ======== DEBUGGING HOOKS ========
  // debug logging removed

  // === Track DOM nodes every time "nodes" prop changes ===
  // removed DOM count log

  // Inspect viewport after each fitView attempt
  // removed logViewport function and its use

  // Node and edge updates handled above - no automatic fitView

  // Removed debug outline injection (Conductor is view-only)

  return (
    <div className="canvas" ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onLoad}
        attributionPosition="bottom-left"
        panOnScroll={false}
        panOnDrag={[1]}
        zoomOnScroll={true}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodeTypes={nodeTypes}
        style={{ width: '100%', height: '100%' }}
        minZoom={0.1}
        maxZoom={2}
        nodesFocusable={false}
        edgesFocusable={false}
        autoPanOnNodeDrag={false}
        autoPanOnConnect={false}
        selectionOnDrag={false}
        preventScrolling={true}
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        snapToGrid={false}
        snapGrid={[1, 1]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitViewOnInit={false}
      >
        <Background color="#2d2d44" gap={20} />
        <Controls showInteractive={false} showZoom={false} />
      </ReactFlow>
    </div>
  );
};

export default Canvas;