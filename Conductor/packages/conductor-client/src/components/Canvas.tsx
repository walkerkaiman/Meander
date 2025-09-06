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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  if (!showData) {
    return <div className="canvas">No show data loaded</div>;
  }

  // Ensure states array exists
  const states = showData.states || [];

  // Convert states to nodes for React Flow
  const nodes = states.map(state => {
    // Ensure position is defined and reasonable
    const position = state.position && state.position.x !== undefined && state.position.y !== undefined 
      ? state.position 
      : { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 };

    return {
      id: state.id,
      type: state.type === 'fork' ? 'forkNode' : 'sceneNode',
      data: {
        label: state.title || 'Untitled Node',
        isCurrent: state.id === activeState?.id,
        type: state.type,
        description: state.description || '',
        choices: state.type === 'fork' ? state.choices : [],
        audienceMedia: state.audienceMedia || []
      },
      position: position,
      draggable: false,
      selectable: false
    };
  });

  // Ensure connections array exists
  const connections = showData.connections || [];

  // Convert connections to edges for React Flow
  const edges = connections
    .filter(conn => {
      const sourceExists = nodes.some(n => n.id === conn.fromNodeId);
      const targetExists = nodes.some(n => n.id === conn.toNodeId);
      return sourceExists && targetExists;
    })
    .map(conn => {
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
        type: 'smoothstep',
        animated: false,
        markerEnd: 'url(#arrowhead)',
        label,
        style: {
          stroke: activeState && conn.fromNodeId === activeState.id ? '#facc15' : '#64748b',
          strokeWidth: activeState && conn.fromNodeId === activeState.id ? 3 : 2
        }
      };
    });

  const onLoad = useCallback((rfi) => {
    if (!reactFlowInstance) {
      setReactFlowInstance(rfi);
      // Force fit view after React Flow loads
      setTimeout(() => {
        rfi.fitView({ padding: 0.1 });
      }, 100);
    }
  }, [reactFlowInstance]);

  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      // Fit view to show all nodes
        setTimeout(() => {
          reactFlowInstance.fitView({ nodes: nodes, duration: 500 });
          }, 100);
    }
  }, [reactFlowInstance, activeState, nodes]);

  // ======== DEBUGGING HOOKS ========
  // debug logging removed

  // === Track DOM nodes every time "nodes" prop changes ===
  // removed DOM count log

  // Inspect viewport after each fitView attempt
  // removed logViewport function and its use

  // === Always fit view once nodes & instance are ready ===
  useEffect(() => {
    if (reactFlowInstance && nodes.length) {
      // using requestAnimationFrame to ensure DOM is ready
      const id = requestAnimationFrame(() => {
        try {
          reactFlowInstance.fitView({ padding: 0.2 });
          // console.log('[Canvas Debug] fitView called (nodes & instance ready)');
          // logViewport();
        } catch (e) {
          console.warn('fitView failed', e);
        }
      });
      return () => cancelAnimationFrame(id);
    }
  }, [reactFlowInstance, nodes.length]);

  // Removed debug outline injection (Conductor is view-only)

  return (
    <div className="canvas" ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onLoad}
        fitView
        attributionPosition="bottom-left"
        panOnScroll={false}
        panOnDrag={[1]}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodeTypes={nodeTypes}
        style={{ width: '100%', height: '100%' }}
        minZoom={0.1}
        maxZoom={2}
      >
        {/* arrowhead marker defs */}
        <svg style={{height:0,width:0}}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>
        </svg>
        <Background color="#2d2d44" gap={20} />
        <MiniMap
          pannable
          zoomable
          nodeStrokeColor={(n) => {
            const t = (n.data as any)?.type || 'scene';
            return t === 'fork' ? '#facc15' : t === 'scene' ? '#10b981' : '#8b5cf6';
          }}
          nodeColor={(n) => {
            const t = (n.data as any)?.type || 'scene';
            return t === 'fork' ? '#facc15' : t === 'scene' ? '#10b981' : '#8b5cf6';
          }}
          nodeBorderRadius={2}
        />
        <Controls showInteractive={false} showZoom={false} />
      </ReactFlow>
    </div>
  );
};

export default Canvas;