import React, { useState, useCallback, useRef, useEffect } from 'react';
import { State, Scene, OpeningScene, EndingScene, Fork, Position, StateUpdate, Connection } from '../types';
import { ZoomIn, ZoomOut, Move, Maximize2 } from 'lucide-react';
import Node from './Node';
import { Connection as ConnectionComponent } from './Connection';

interface CanvasProps {
  states: State[];
  connections: Connection[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onUpdateNode: (nodeId: string, updates: StateUpdate) => void;

  onCreateConnection: (fromNodeId: string, fromOutputIndex: number, toNodeId: string) => string;
  onDeleteConnection: (connectionId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  states,
  connections,
  selectedNodeId,
  onNodeSelect,
  onUpdateNode,
  onCreateConnection,
  onDeleteConnection
}) => {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [connectionDragStart, setConnectionDragStart] = useState<{
    nodeId: string;
    outputIndex: number;
    position: Position;
  } | null>(null);
  const [connectionDragEnd, setConnectionDragEnd] = useState<Position | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Use ref to avoid stale closure issues
  const onDeleteConnectionRef = React.useRef(onDeleteConnection);
  React.useEffect(() => {
    onDeleteConnectionRef.current = onDeleteConnection;
  }, [onDeleteConnection]);

  // Debug: Log when connections change
  useEffect(() => {
    if (connections.length > 0) {
      console.log('Canvas - Connections updated:', connections.length, 'total');
    }
  }, [connections]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const node = states.find(s => s.id === nodeId);
    if (!node) return;

    // Store the initial mouse position relative to the canvas
    const canvas = e.currentTarget.closest('.canvas') as HTMLElement;
    if (!canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    // Calculate offset from mouse to node position in transformed coordinates
    const transformedNodeX = node.position.x * 1 + 0; // Assuming canvasTransform.x is 0 for now
    const transformedNodeY = node.position.y * 1 + 0; // Assuming canvasTransform.y is 0 for now
    
    const offsetX = mouseX - transformedNodeX;
    const offsetY = mouseY - transformedNodeY;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setDraggedNodeId(nodeId);
    onNodeSelect(nodeId);
  }, [states, onNodeSelect]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingConnection) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasX = (e.clientX - rect.left - 0) / 1; // Assuming canvasTransform.x is 0
        const canvasY = (e.clientY - rect.top - 0) / 1; // Assuming canvasTransform.y is 0
        setConnectionDragEnd({ x: canvasX, y: canvasY });
      }
    } else if (isPanning) {
      // Handle panning - optimized for performance
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    } else if (draggedNodeId) {
      // Handle node dragging - optimized for performance
      const rect = e.currentTarget.getBoundingClientRect();
      
      // Direct calculation without complex math
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newX = (mouseX - dragOffset.x - 0) / 1; // Assuming canvasTransform.x is 0
      const newY = (mouseY - dragOffset.y - 0) / 1; // Assuming canvasTransform.y is 0

      // Snap to grid (20px)
      const snappedX = Math.round(newX / 20) * 20;
      const snappedY = Math.round(newY / 20) * 20;

      onUpdateNode(draggedNodeId, { position: { x: snappedX, y: snappedY } });
    }
  }, [isDraggingConnection, isPanning, lastPanPosition, draggedNodeId, dragOffset, onUpdateNode]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    // Only reset hover if we're clicking on the actual canvas background
    // Connection hover state is no longer tracked

    setDraggedNodeId(null);
    setDragOffset({ x: 0, y: 0 });
    setIsPanning(false);

    // Reset connection dragging state
    if (isDraggingConnection) {
      setIsDraggingConnection(false);
      setConnectionDragStart(null);
      setConnectionDragEnd(null);
    }
  }, [isDraggingConnection]);

  const handleWheel = useCallback((e: WheelEvent) => {
    // Prevent default scrolling behavior for zoom functionality
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    Math.max(0.7, Math.min(1.5, 1 * zoomFactor)); // Currently disabled
    
    // setCanvasTransform({
    //   scale: newScale,
    //   x: newX,
    //   y: newY
    // });
  }, []);

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => handleWheel(e);
    
    // Add event listener with passive: false to allow preventDefault
    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle mouse or Alt+Left
      e.preventDefault();
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Reset zoom and pan
    // setCanvasTransform({ scale: 1, x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    // setCanvasTransform(prev => ({
    //   ...prev,
    //   scale: Math.min(1.5, prev.scale * 1.2)
    // }));
  }, []);

  const zoomOut = useCallback(() => {
    // setCanvasTransform(prev => ({
    //   ...prev,
    //   scale: Math.max(0.7, prev.scale / 1.2)
    // }));
  }, []);

  const resetView = useCallback(() => {
    // Reset to center of available canvas space (accounting for sidebars)
    // Currently disabled - canvas transform is not implemented
  }, []);

  const fitAllNodesInView = useCallback(() => {
    if (states.length === 0) return;

    // Calculate bounds of all nodes
    // Account for full node dimensions (150x80) plus any additional spacing
    const bounds = states.reduce((acc, state) => {
      const x = state.position.x;
      const y = state.position.y;
      const nodeWidth = 150;  // Node width
      const nodeHeight = 80;  // Node height
      
      return {
        minX: Math.min(acc.minX, x),
        maxX: Math.max(acc.maxX, x + nodeWidth),
        minY: Math.min(acc.minY, y),
        maxY: Math.max(acc.maxY, y + nodeHeight)
      };
    }, { 
      minX: states[0]?.position.x ?? 0, 
      maxX: (states[0]?.position.x ?? 0) + 150, 
      minY: states[0]?.position.y ?? 0, 
      maxY: (states[0]?.position.y ?? 0) + 80 
    });

    // Add padding around the bounds
    const padding = 100;
    const contentWidth = bounds.maxX - bounds.minX + padding * 2;
    const contentHeight = bounds.maxY - bounds.minY + padding * 2;

    // Get canvas dimensions - account for sidebars
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Estimate sidebar widths (left sidebar ~300px, right sidebar ~350px)
    // These are approximate values based on typical sidebar widths
    const leftSidebarWidth = 300;
    const rightSidebarWidth = 350;
    const availableCanvasWidth = canvasRect.width - leftSidebarWidth - rightSidebarWidth;
    const availableCanvasHeight = canvasRect.height;

    // Calculate scale to fit content in available canvas space
    const scaleX = availableCanvasWidth / contentWidth;
    const scaleY = availableCanvasHeight / contentHeight;
    Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100% - currently disabled

    // Calculate transform to center content in available space
    // Currently disabled - canvas transform is not implemented
  }, [states]);

  // Auto-fit all nodes in view when states change (new nodes added/removed)
  useEffect(() => {
    if (states.length > 0) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        fitAllNodesInView();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [states.length, fitAllNodesInView]);

  const handleOutputMouseDown = useCallback((e: React.MouseEvent, nodeId: string, outputIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const node = states.find(s => s.id === nodeId);
    if (!node) return;

    // Calculate the output position in canvas coordinates
    const outputX = node.position.x + 150 + 8; // Right edge of node + connection point offset

    // Handle different node types for output positioning
    let outputY = node.position.y + 40; // Default position (same as input)
    if (node.type === 'fork') {
      outputY = node.position.y + 25 + (outputIndex * 25); // Fork outputs are spaced differently
    }

    setConnectionDragStart({
      nodeId,
      outputIndex,
      position: { x: outputX, y: outputY }
    });
    setIsDraggingConnection(true);
    setConnectionDragEnd({ x: outputX, y: outputY });
  }, [states]);

  const handleInputMouseUp = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (isDraggingConnection && connectionDragStart) {
      e.preventDefault();
      e.stopPropagation();

      // Create the connection
      onCreateConnection(connectionDragStart.nodeId, connectionDragStart.outputIndex, nodeId);

      // Reset drag state
      setIsDraggingConnection(false);
      setConnectionDragStart(null);
      setConnectionDragEnd(null);
    }
  }, [isDraggingConnection, connectionDragStart, onCreateConnection]);





  const renderScene = (scene: Scene) => (
    <Node
      state={scene}
      selected={selectedNodeId === scene.id}
      onMouseDown={handleNodeMouseDown}
      onOutputMouseDown={handleOutputMouseDown}
      onInputMouseUp={handleInputMouseUp}
    />
  );

  const renderOpeningScene = (opening: OpeningScene) => (
    <Node
      state={opening}
      selected={selectedNodeId === opening.id}
      onMouseDown={handleNodeMouseDown}
      onOutputMouseDown={handleOutputMouseDown}
      onInputMouseUp={handleInputMouseUp}
    />
  );

  const renderEndingScene = (ending: EndingScene) => (
    <Node
      state={ending}
      selected={selectedNodeId === ending.id}
      onMouseDown={handleNodeMouseDown}
      onOutputMouseDown={handleOutputMouseDown}
      onInputMouseUp={handleInputMouseUp}
    />
  );

  const renderFork = (fork: Fork) => (
    <Node
      state={fork}
      selected={selectedNodeId === fork.id}
      onMouseDown={handleNodeMouseDown}
      onOutputMouseDown={handleOutputMouseDown}
      onInputMouseUp={handleInputMouseUp}
    />
  );

    const renderConnections = () => {
      const connectionElements: JSX.Element[] = [];

      // Render existing connections
      connections.forEach(connection => {
        const fromState = states.find(s => s.id === connection.fromNodeId);
        const toState = states.find(s => s.id === connection.toNodeId);

        if (fromState && toState) {
          // Calculate connection points to the CENTER of the connection circles
          let startX, startY, endX, endY;

          // Output point center (right side of source node)
          if (fromState.type === 'fork') {
            // Fork output connections are at different Y positions
            startX = (fromState.position.x * 1) + 0 + 5000 + 158; // Node position + SVG offset + connection point offset (150 + 8)
            startY = (fromState.position.y * 1) + 0 + 5000 + 25 + (connection.fromOutputIndex * 25); // Node position + SVG offset + connection Y
          } else {
            // Regular scene/opening output connection at standard position
            startX = (fromState.position.x * 1) + 0 + 5000 + 158; // Node position + SVG offset + connection point offset (150 + 8)
            startY = (fromState.position.y * 1) + 0 + 5000 + 40; // Node position + SVG offset + connection Y
          }

          // Input point center (left side of target node) - always at (-8, 40) relative to node
          endX = (toState.position.x * 1) + 0 + 5000 - 8; // Node position + SVG offset + connection point offset (-8 for left side)
          endY = (toState.position.y * 1) + 0 + 5000 + 40; // Node position + SVG offset + connection Y

          connectionElements.push(
            <ConnectionComponent
              key={connection.id}
              from={{ x: startX, y: startY }}
              to={{ x: endX, y: endY }}
              label={fromState.type === 'fork' ? fromState.choices[connection.fromOutputIndex]?.label : undefined}
              onDelete={() => onDeleteConnection(connection.id)}
            />
          );
        }
      });

    // Render drag preview when creating new connection
    if (isDraggingConnection && connectionDragStart && connectionDragEnd) {
      connectionElements.push(
        <ConnectionComponent
          key="drag-preview"
          from={{ x: connectionDragStart.position.x, y: connectionDragStart.position.y }}
          to={connectionDragEnd}
          highlighted={true}
          interactive={false}
        />
      );
    }

    return connectionElements;
  };

  const renderMiniMap = () => {
    if (states.length === 0) return null;

    // Calculate bounds of all nodes with proper initialization
    // Account for full node dimensions (150x80) plus any additional spacing
    const bounds = states.reduce((acc, state) => {
      const x = state.position.x;
      const y = state.position.y;
      const nodeWidth = 150;  // Node width
      const nodeHeight = 80;  // Node height
      
      return {
        minX: Math.min(acc.minX, x),
        maxX: Math.max(acc.maxX, x + nodeWidth),
        minY: Math.min(acc.minY, y),
        maxY: Math.max(acc.maxY, y + nodeHeight)
      };
    }, { 
      minX: states[0]?.position.x ?? 0, 
      maxX: (states[0]?.position.x ?? 0) + 150, 
      minY: states[0]?.position.y ?? 0, 
      maxY: (states[0]?.position.y ?? 0) + 80 
    });





    const mapWidth = 200;
    const mapHeight = 150;
    const padding = 30; // Increased padding for better visibility
    
    // Calculate the actual content dimensions
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    
    // Add padding to the content bounds
    const totalWidth = contentWidth + padding * 2;
    const totalHeight = contentHeight + padding * 2;
    
    // Calculate scale to fit all content in the mini map
    const scaleX = mapWidth / totalWidth;
    const scaleY = mapHeight / totalHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Ensure we don't zoom in too much (keep nodes visible)
    // But also ensure we don't zoom out too much (keep nodes visible)
    const finalScale = Math.max(0.1, Math.min(scale, 1));





    return (
      <div className="mini-map">
        <div className="mini-map-header">
          <span>Mini Map</span>
          <div className="mini-map-actions">
            <button onClick={fitAllNodesInView} className="mini-map-btn" title="Fit All Nodes">
              <Maximize2 size={12} />
            </button>
            <button onClick={resetView} className="mini-map-btn" title="Reset View">
              <Move size={12} />
            </button>
          </div>
        </div>
        <div className="mini-map-content">
          <svg width={mapWidth} height={mapHeight} className="mini-map-svg">
            {/* Background */}
            <rect width={mapWidth} height={mapHeight} fill="#1a1a2e" stroke="#2d2d44" strokeWidth="1" />
            
            {/* Grid */}
            <defs>
              <pattern id="miniGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#2d2d44" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#miniGrid)" />
            
            {/* Debug: Show bounds rectangle */}
            <rect
              x={padding * finalScale}
              y={padding * finalScale}
              width={contentWidth * finalScale}
              height={contentHeight * finalScale}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.5"
            />
            
            {/* Nodes */}
            {states.map(state => {
              // Position nodes relative to the bounds without adding padding to individual positions
              const x = (state.position.x - bounds.minX) * finalScale + padding;
              const y = (state.position.y - bounds.minY) * finalScale + padding;
              const width = 150 * finalScale;
              const height = 80 * finalScale;
              
              return (
                <rect
                  key={state.id}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={state.type === 'scene' ? '#10b981' : '#f59e0b'}
                  stroke={selectedNodeId === state.id ? '#3b82f6' : '#2d2d44'}
                  strokeWidth={selectedNodeId === state.id ? '2' : '1'}
                  rx="2"
                />
              );
            })}
            
            {/* Viewport indicator */}
            <rect
              x={(-0 - bounds.minX + padding) * finalScale}
              y={(-0 - bounds.minY + padding) * finalScale}
              width={((window.innerWidth - 300 - 350) / 1) * finalScale}
              height={(window.innerHeight / 1) * finalScale}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`canvas ${isPanning ? 'panning' : ''}`}
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Transform Container */}
      <div 
        className="canvas-transform-container"
        style={{
          // transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          // transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      >
        {/* Background grid SVG - this can be scaled by CSS transform */}
        <svg className="canvas-background" style={{ position: 'absolute', width: '10000px', height: '10000px', left: '-5000px', top: '-5000px' }}>
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2d2d44" strokeWidth="1"/>
            </pattern>
            <marker id="arrowhead" markerWidth="10" markerHeight="7"
                    refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
            </marker>
          </defs>
          <rect width="10000" height="10000" fill="url(#grid)" />
        </svg>

        {/* Main SVG for nodes and connections - positioned absolutely, NOT scaled by CSS transform */}
        <svg className="canvas-main" style={{ 
          position: 'absolute', 
          width: '10000px', 
          height: '10000px', 
          left: '-5000px', 
          top: '-5000px'
        }}>
          {/* Render all nodes as SVG elements - they use native SVG transforms */}
          {states.map(state => {
            switch (state.type) {
              case 'scene':
                return renderScene(state);
              case 'opening':
                return renderOpeningScene(state);
              case 'ending':
                return renderEndingScene(state);
              case 'fork':
                return renderFork(state);
              default:
                return null;
            }
          })}

          {/* Render connections inside SVG so they scale with canvas transform */}
          {renderConnections()}
        </svg>
        
        {states.length === 0 && (
          <div className="canvas-empty">
            <p>No states yet. Add a scene to get started!</p>
          </div>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button onClick={zoomIn} className="zoom-btn" title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button onClick={zoomOut} className="zoom-btn" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={resetView} className="zoom-btn" title="Reset View">
          <Move size={16} />
        </button>
        <div className="zoom-info">
          {Math.round(1 * 100)}%
        </div>
      </div>

      {/* Mini Map */}
      {renderMiniMap()}
    </div>
  );
};
