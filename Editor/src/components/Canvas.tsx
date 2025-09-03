import React, { useState, useCallback, useRef, useEffect } from 'react';
import { State, Scene, OpeningScene, EndingScene, Fork, Position, Connection, StateUpdate } from '../types';
import { Play, GitBranch, ZoomIn, ZoomOut, Move, Square } from 'lucide-react';

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
  const [canvasTransform, setCanvasTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [connectionDragStart, setConnectionDragStart] = useState<{
    nodeId: string;
    outputIndex: number;
    position: Position;
  } | null>(null);
  const [connectionDragEnd, setConnectionDragEnd] = useState<Position | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [lastConnectionCreated, setLastConnectionCreated] = useState<string | null>(null);
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
    const transformedNodeX = node.position.x * canvasTransform.scale + canvasTransform.x;
    const transformedNodeY = node.position.y * canvasTransform.scale + canvasTransform.y;
    
    const offsetX = mouseX - transformedNodeX;
    const offsetY = mouseY - transformedNodeY;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setDraggedNodeId(nodeId);
    onNodeSelect(nodeId);
  }, [states, onNodeSelect, canvasTransform]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingConnection) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasX = (e.clientX - rect.left - canvasTransform.x) / canvasTransform.scale;
        const canvasY = (e.clientY - rect.top - canvasTransform.y) / canvasTransform.scale;
        setConnectionDragEnd({ x: canvasX, y: canvasY });
      }
    } else if (isPanning) {
      // Handle panning
      const deltaX = e.clientX - lastPanPosition.x;
      const deltaY = e.clientY - lastPanPosition.y;

      setCanvasTransform(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setLastPanPosition({ x: e.clientX, y: e.clientY });
    } else if (draggedNodeId) {
      // Handle node dragging - account for canvas transform
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();

      // Get mouse position relative to canvas
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate new node position by subtracting the offset and converting back to canvas coordinates
      const newX = (mouseX - dragOffset.x - canvasTransform.x) / canvasTransform.scale;
      const newY = (mouseY - dragOffset.y - canvasTransform.y) / canvasTransform.scale;

      // Snap to grid (optional)
      const gridSize = 20;
      const snappedX = Math.round(newX / gridSize) * gridSize;
      const snappedY = Math.round(newY / gridSize) * gridSize;

      onUpdateNode(draggedNodeId, { position: { x: snappedX, y: snappedY } });
    }
  }, [isDraggingConnection, isPanning, lastPanPosition, draggedNodeId, dragOffset, onUpdateNode, canvasTransform]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Only reset hover if we're clicking on the actual canvas background
    const target = e.target as HTMLElement;
    const isClickingOnCanvasBackground = target.classList.contains('canvas') ||
                                        target.classList.contains('canvas-transform-container') ||
                                        (target.tagName === 'svg' && target.classList.contains('canvas-background')) ||
                                        target.tagName === 'rect';

    // Don't reset hover if clicking on connections or other elements
    if (isClickingOnCanvasBackground) {
      setHoveredConnectionId(null);
    }

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, canvasTransform.scale * zoomFactor));
    
    // Calculate new transform to zoom towards mouse position
    const scaleDiff = newScale / canvasTransform.scale;
    const newX = mouseX - (mouseX - canvasTransform.x) * scaleDiff;
    const newY = mouseY - (mouseY - canvasTransform.y) * scaleDiff;
    
    setCanvasTransform({
      scale: newScale,
      x: newX,
      y: newY
    });
  }, [canvasTransform]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle mouse or Alt+Left
      e.preventDefault();
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Reset zoom and pan
    setCanvasTransform({ scale: 1, x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setCanvasTransform(prev => ({
      ...prev,
      scale: Math.min(3, prev.scale * 1.2)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setCanvasTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale / 1.2)
    }));
  }, []);

  const resetView = useCallback(() => {
    setCanvasTransform({ scale: 1, x: 0, y: 0 });
  }, []);

  const handleOutputMouseDown = useCallback((e: React.MouseEvent, nodeId: string, outputIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const node = states.find(s => s.id === nodeId);
    if (!node) return;

    // Calculate the output position in canvas coordinates
    const outputX = node.position.x + 150; // Right edge of node
    const outputY = node.position.y + 25 + (outputIndex * 25); // Two outputs spaced 25px apart

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
      const newConnectionId = onCreateConnection(connectionDragStart.nodeId, connectionDragStart.outputIndex, nodeId);
      if (newConnectionId) {
        setLastConnectionCreated(newConnectionId);
      }

      // Reset drag state
      setIsDraggingConnection(false);
      setConnectionDragStart(null);
      setConnectionDragEnd(null);

      // Clear the last created connection after a short delay
      setTimeout(() => setLastConnectionCreated(null), 500);
    }
  }, [isDraggingConnection, connectionDragStart, onCreateConnection]);





  const renderScene = (scene: Scene) => (
    <div
      key={scene.id}
      className={`canvas-node scene-node ${selectedNodeId === scene.id ? 'selected' : ''}`}
      style={{
        left: scene.position.x,
        top: scene.position.y
      }}
      onMouseDown={(e) => handleNodeMouseDown(e, scene.id)}
    >
      {/* Input connection point */}
      <div
        className="connection-point input-point"
        style={{
          position: 'absolute',
          left: '-8px',
          top: '40px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          border: '2px solid #1a1a2e',
          cursor: 'pointer',
          zIndex: 10
        }}
        onMouseUp={(e) => handleInputMouseUp(e, scene.id)}
      />

      {/* Output connection point - only one for regular scenes */}
      <div
        className="connection-point output-point"
        style={{
          position: 'absolute',
          right: '-8px',
          top: '40px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          border: '2px solid #1a1a2e',
          cursor: 'pointer',
          zIndex: 10
        }}
        onMouseDown={(e) => handleOutputMouseDown(e, scene.id, 0)}
      />

      <div className="node-header">
        <Play size={16} />
        <span className="node-title">{scene.title || 'Untitled Scene'}</span>
      </div>
      <div className="node-content">
        <div className="node-description">
          {scene.description || 'No description'}
        </div>
        {scene.audienceMedia.length > 0 && (
          <div className="node-media">
            {scene.audienceMedia.length} media files
          </div>
        )}
      </div>
    </div>
  );

  const renderOpeningScene = (opening: OpeningScene) => (
    <div
      key={opening.id}
      className={`canvas-node opening-node ${selectedNodeId === opening.id ? 'selected' : ''}`}
      style={{
        left: opening.position.x,
        top: opening.position.y
      }}
      onMouseDown={(e) => handleNodeMouseDown(e, opening.id)}
    >
      {/* No input connection point for opening scenes */}

      {/* Output connection point */}
      <div
        className="connection-point output-point"
        style={{
          position: 'absolute',
          right: '-8px',
          top: '40px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          border: '2px solid #1a1a2e',
          cursor: 'pointer',
          zIndex: 10
        }}
        onMouseDown={(e) => handleOutputMouseDown(e, opening.id, 0)}
      />

      <div className="node-header">
        <Square size={16} />
        <span className="node-title">{opening.title || 'Opening Scene'}</span>
      </div>
      <div className="node-content">
        <div className="node-description">
          {opening.description || 'The story begins here'}
        </div>
        {opening.audienceMedia.length > 0 && (
          <div className="node-media">
            {opening.audienceMedia.length} media files
          </div>
        )}
      </div>
    </div>
  );

  const renderEndingScene = (ending: EndingScene) => (
    <div
      key={ending.id}
      className={`canvas-node ending-node ${selectedNodeId === ending.id ? 'selected' : ''}`}
      style={{
        left: ending.position.x,
        top: ending.position.y
      }}
      onMouseDown={(e) => handleNodeMouseDown(e, ending.id)}
    >
      {/* Input connection point */}
      <div
        className="connection-point input-point"
        style={{
          position: 'absolute',
          left: '-8px',
          top: '40px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          border: '2px solid #1a1a2e',
          cursor: 'pointer',
          zIndex: 10
        }}
        onMouseUp={(e) => handleInputMouseUp(e, ending.id)}
      />

      {/* No output connection point for ending scenes */}

      <div className="node-header">
        <Square size={16} />
        <span className="node-title">{ending.title || 'Ending Scene'}</span>
      </div>
      <div className="node-content">
        <div className="node-description">
          {ending.description || 'The story concludes here'}
        </div>
        {ending.audienceMedia.length > 0 && (
          <div className="node-media">
            {ending.audienceMedia.length} media files
          </div>
        )}
      </div>
    </div>
  );

  const renderFork = (fork: Fork) => (
    <div
      key={fork.id}
      className={`canvas-node fork-node ${selectedNodeId === fork.id ? 'selected' : ''}`}
      style={{
        left: fork.position.x,
        top: fork.position.y
      }}
      onMouseDown={(e) => handleNodeMouseDown(e, fork.id)}
    >
      {/* Input connection point */}
      <div
        className="connection-point input-point"
        style={{
          position: 'absolute',
          left: '-8px',
          top: '40px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          border: '2px solid #1a1a2e',
          cursor: 'pointer',
          zIndex: 10
        }}
        onMouseUp={(e) => handleInputMouseUp(e, fork.id)}
      />

      {/* Output connection points */}
      {[0, 1].map((outputIndex) => (
        <div
          key={outputIndex}
          className="connection-point output-point"
          style={{
            position: 'absolute',
            right: '-8px',
            top: `${25 + (outputIndex * 25)}px`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            border: '2px solid #1a1a2e',
            cursor: 'pointer',
            zIndex: 10
          }}
          onMouseDown={(e) => handleOutputMouseDown(e, fork.id, outputIndex)}
        />
      ))}

      <div className="node-header">
        <GitBranch size={16} />
        <span className="node-title">{fork.title || 'Untitled Choice'}</span>
      </div>
      <div className="node-content">
        <div className="node-choices">
          {fork.choices.map((choice, index) => (
            <div key={index} className="choice-item">
              {choice.label || `Choice ${index + 1}`}
            </div>
          ))}
        </div>
        <div className="node-timer">
          {fork.countdownSeconds}s timer
        </div>
      </div>
    </div>
  );

    const renderConnections = () => {
    const connectionElements: JSX.Element[] = [];

    // Render existing connections
    connections.forEach(connection => {
      const fromState = states.find(s => s.id === connection.fromNodeId);
      const toState = states.find(s => s.id === connection.toNodeId);

      if (fromState && toState) {
        // Calculate connection points based on output index
        const startX = fromState.position.x + 150; // Right edge of from node
        const startY = fromState.position.y + 25 + (connection.fromOutputIndex * 25);
        const endX = toState.position.x; // Left edge of to node
        const endY = toState.position.y + 40; // Input point on to node

        connectionElements.push(
          <svg
            key={connection.id}
            className="connection-line"
            data-connection-id={connection.id}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none' // Let individual elements handle their own events
            }}


          >
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="transparent"
              strokeWidth="6"
              style={{
                pointerEvents: 'stroke',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                const connectionId = connection.id;

                // Prevent deletion of newly created connections
                if (lastConnectionCreated === connectionId) {
                  return;
                }

                // Check if connection still exists before deleting
                const connectionExists = connections.some(c => c.id === connectionId);
                if (!connectionExists) {
                  console.warn('Connection no longer exists:', connectionId);
                  return;
                }

                onDeleteConnectionRef.current(connectionId);
              }}
              onMouseEnter={() => {
                // Small delay to prevent flickering
                setTimeout(() => setHoveredConnectionId(connection.id), 10);
              }}
              onMouseLeave={() => {
                // Small delay to prevent flickering when moving between elements
                setTimeout(() => setHoveredConnectionId(null), 50);
              }}
            />
            {/* Visible line on top */}
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={hoveredConnectionId === connection.id ? "#ef4444" : "#3b82f6"}
              strokeWidth={hoveredConnectionId === connection.id ? "3" : "2"}
              markerEnd="url(#arrowhead)"
              style={{ pointerEvents: 'none' }}
            />


            {/* Delete overlay when hovering */}
            {hoveredConnectionId === connection.id && (
              <circle
                cx={(startX + endX) / 2}
                cy={(startY + endY) / 2}
                r="10"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {hoveredConnectionId === connection.id && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 + 3}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                fontWeight="bold"
                style={{ pointerEvents: 'none' }}
              >
                ×
              </text>
            )}
          </svg>
        );
      }
    });

    // Render drag preview when creating new connection
    if (isDraggingConnection && connectionDragStart && connectionDragEnd) {
      connectionElements.push(
        <svg
          key="drag-preview"
          className="connection-line drag-preview"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          <line
            x1={connectionDragStart.position.x}
            y1={connectionDragStart.position.y}
            x2={connectionDragEnd.x}
            y2={connectionDragEnd.y}
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="5,5"
            markerEnd="url(#arrowhead)"
          />
        </svg>
      );
    }

    return connectionElements;
  };

  const renderMiniMap = () => {
    if (states.length === 0) return null;

    // Calculate bounds of all nodes
    const bounds = states.reduce((acc, state) => {
      const x = state.position.x;
      const y = state.position.y;
      return {
        minX: Math.min(acc.minX, x),
        maxX: Math.max(acc.maxX, x + 150),
        minY: Math.min(acc.minY, y),
        maxY: Math.max(acc.maxY, y + 80)
      };
    }, { minX: 0, maxX: 0, minY: 0, maxY: 0 });

    const mapWidth = 200;
    const mapHeight = 150;
    const padding = 20;
    const totalWidth = bounds.maxX - bounds.minX + padding * 2;
    const totalHeight = bounds.maxY - bounds.minY + padding * 2;
    const scaleX = mapWidth / totalWidth;
    const scaleY = mapHeight / totalHeight;
    const scale = Math.min(scaleX, scaleY);

    return (
      <div className="mini-map">
        <div className="mini-map-header">
          <span>Mini Map</span>
          <button onClick={resetView} className="mini-map-reset" title="Reset View">
            <Move size={12} />
          </button>
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
            
            {/* Nodes */}
            {states.map(state => {
              const x = (state.position.x - bounds.minX + padding) * scale;
              const y = (state.position.y - bounds.minY + padding) * scale;
              const width = 150 * scale;
              const height = 80 * scale;
              
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
              x={(-canvasTransform.x - bounds.minX + padding) * scale}
              y={(-canvasTransform.y - bounds.minY + padding) * scale}
              width={(window.innerWidth / canvasTransform.scale) * scale}
              height={(window.innerHeight / canvasTransform.scale) * scale}
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
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      {/* Transform Container */}
      <div 
        className="canvas-transform-container"
        style={{
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      >
        <svg className="canvas-background" style={{ position: 'absolute', width: '100%', height: '100%' }}>
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2d2d44" strokeWidth="1"/>
            </pattern>
            <marker id="arrowhead" markerWidth="10" markerHeight="7"
                    refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        
        {renderConnections()}
        
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
          {Math.round(canvasTransform.scale * 100)}%
        </div>
      </div>

      {/* Mini Map */}
      {renderMiniMap()}
    </div>
  );
};
