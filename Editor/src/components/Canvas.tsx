import React, { useState, useCallback, useRef, useEffect } from 'react';
import { State, Scene, OpeningScene, EndingScene, Fork, Position, Connection, StateUpdate } from '../types';
import { ZoomIn, ZoomOut, Move, Maximize2 } from 'lucide-react';

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
      // Handle panning - optimized for performance
      const deltaX = e.clientX - lastPanPosition.x;
      const deltaY = e.clientY - lastPanPosition.y;

      // Direct update for immediate response
      setCanvasTransform(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setLastPanPosition({ x: e.clientX, y: e.clientY });
    } else if (draggedNodeId) {
      // Handle node dragging - optimized for performance
      const rect = e.currentTarget.getBoundingClientRect();
      
      // Direct calculation without complex math
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newX = (mouseX - dragOffset.x - canvasTransform.x) / canvasTransform.scale;
      const newY = (mouseY - dragOffset.y - canvasTransform.y) / canvasTransform.scale;

      // Snap to grid (20px)
      const snappedX = Math.round(newX / 20) * 20;
      const snappedY = Math.round(newY / 20) * 20;

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

  const handleWheel = useCallback((e: WheelEvent) => {
    // Prevent default scrolling behavior for zoom functionality
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.7, Math.min(1.5, canvasTransform.scale * zoomFactor));
    
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
    setCanvasTransform({ scale: 1, x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setCanvasTransform(prev => ({
      ...prev,
      scale: Math.min(1.5, prev.scale * 1.2)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setCanvasTransform(prev => ({
      ...prev,
      scale: Math.max(0.7, prev.scale / 1.2)
    }));
  }, []);

  const resetView = useCallback(() => {
    setCanvasTransform({ scale: 1, x: 0, y: 0 });
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

    // Get canvas dimensions
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

    // Calculate scale to fit content in canvas
    const scaleX = canvasWidth / contentWidth;
    const scaleY = canvasHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    // Calculate center position
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate transform to center content
    const x = (canvasWidth / 2) - (centerX * scale);
    const y = (canvasHeight / 2) - (centerY * scale);

    setCanvasTransform({ scale, x, y });
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





  const renderScene = (scene: Scene) => {
    // Apply canvas transform manually to maintain crisp vector rendering
    const nodeX = (scene.position.x * canvasTransform.scale) + canvasTransform.x + 5000;
    const nodeY = (scene.position.y * canvasTransform.scale) + canvasTransform.y + 5000;

    return (
      <g
        key={scene.id}
        className={`canvas-node scene-node ${selectedNodeId === scene.id ? 'selected' : ''}`}
        transform={`translate(${nodeX}, ${nodeY})`}
        onMouseDown={(e) => handleNodeMouseDown(e, scene.id)}
        style={{ cursor: 'move' }}
      >
        {/* Node background rectangle */}
                 <rect
           x="0"
           y="0"
           width="150"
           height="80"
           rx="8"
           ry="8"
           fill="#1a1a2e"
           stroke="#10b981"
           strokeWidth={selectedNodeId === scene.id ? "3" : "1"}
         />

        {/* Input connection point - center at (-8, 40) */}
        <circle
          cx="-8"
          cy="40"
          r="8"
          fill="#10b981"
          stroke="#1a1a2e"
          strokeWidth="2"
          style={{ cursor: 'pointer' }}
          onMouseUp={(e) => handleInputMouseUp(e, scene.id)}
        />

        {/* Output connection point - center at (158, 40) */}
        <circle
          cx="158"
          cy="40"
          r="8"
          fill="#3b82f6"
          stroke="#1a1a2e"
          strokeWidth="2"
          style={{ cursor: 'pointer' }}
          onMouseDown={(e) => handleOutputMouseDown(e, scene.id, 0)}
        />

        {/* Node header background */}
        <rect
          x="8"
          y="8"
          width="134"
          height="24"
          rx="4"
          ry="4"
          fill="#2d2d44"
        />

        {/* Node title text */}
        <text
          x="75"
          y="24"
          textAnchor="middle"
          fontSize="12"
          fill="#e0e0e0"
          fontWeight="500"
        >
          {scene.title || 'Untitled Scene'}
        </text>

        

        {/* Description text */}
        <text
          x="75"
          y="50"
          textAnchor="middle"
          fontSize="10"
          fill="#a0a0a0"
        >
          {scene.description ? (scene.description.length > 20 ? scene.description.substring(0, 20) + '...' : scene.description) : 'No description'}
        </text>

        {/* Media indicator */}
        {scene.audienceMedia.length > 0 && (
          <text
            x="75"
            y="65"
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {scene.audienceMedia.length} media
          </text>
        )}
      </g>
    );
  };

  const renderOpeningScene = (opening: OpeningScene) => {
    // Apply canvas transform manually to maintain crisp vector rendering
    const nodeX = (opening.position.x * canvasTransform.scale) + canvasTransform.x + 5000;
    const nodeY = (opening.position.y * canvasTransform.scale) + canvasTransform.y + 5000;

    return (
      <g
        key={opening.id}
        className={`canvas-node opening-node ${selectedNodeId === opening.id ? 'selected' : ''}`}
        transform={`translate(${nodeX}, ${nodeY})`}
        onMouseDown={(e) => handleNodeMouseDown(e, opening.id)}
        style={{ cursor: 'move' }}
      >
        {/* Node background rectangle */}
                 <rect
           x="0"
           y="0"
           width="150"
           height="80"
           rx="8"
           ry="8"
           fill="#1a1a2e"
           stroke="#a855f7"
           strokeWidth={selectedNodeId === opening.id ? "3" : "1"}
         />

        {/* Output connection point - center at (158, 40) */}
        <circle
          cx="158"
          cy="40"
          r="8"
          fill="#3b82f6"
          stroke="#1a1a2e"
          strokeWidth="2"
          style={{ cursor: 'pointer' }}
          onMouseDown={(e) => handleOutputMouseDown(e, opening.id, 0)}
        />

        {/* Node header background */}
        <rect
          x="8"
          y="8"
          width="134"
          height="24"
          rx="4"
          ry="4"
          fill="#2d2d44"
        />

        {/* Node title text */}
        <text
          x="75"
          y="24"
          textAnchor="middle"
          fontSize="12"
          fill="#e0e0e0"
          fontWeight="500"
        >
          {opening.title || 'Opening Scene'}
        </text>

        {/* Description text */}
        <text
          x="75"
          y="50"
          textAnchor="middle"
          fontSize="10"
          fill="#a0a0a0"
        >
          {opening.description ? (opening.description.length > 20 ? opening.description.substring(0, 20) + '...' : opening.description) : 'The story begins here'}
        </text>

        {/* Media indicator */}
        {opening.audienceMedia.length > 0 && (
          <text
            x="75"
            y="65"
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {opening.audienceMedia.length} media
          </text>
        )}
      </g>
    );
  };

  const renderEndingScene = (ending: EndingScene) => {
    // Apply canvas transform manually to maintain crisp vector rendering
    const nodeX = (ending.position.x * canvasTransform.scale) + canvasTransform.x + 5000;
    const nodeY = (ending.position.y * canvasTransform.scale) + canvasTransform.y + 5000;

    return (
      <g
        key={ending.id}
        className={`canvas-node ending-node ${selectedNodeId === ending.id ? 'selected' : ''}`}
        transform={`translate(${nodeX}, ${nodeY})`}
        onMouseDown={(e) => handleNodeMouseDown(e, ending.id)}
        style={{ cursor: 'move' }}
      >
        {/* Node background rectangle */}
                 <rect
           x="0"
           y="0"
           width="150"
           height="80"
           rx="8"
           ry="8"
           fill="#1a1a2e"
           stroke="#a855f7"
           strokeWidth={selectedNodeId === ending.id ? "3" : "1"}
         />

        {/* Input connection point - center at (-8, 40) */}
        <circle
          cx="-8"
          cy="40"
          r="8"
          fill="#10b981"
          stroke="#1a1a2e"
          strokeWidth="2"
          style={{ cursor: 'pointer' }}
          onMouseUp={(e) => handleInputMouseUp(e, ending.id)}
        />

        {/* Node header background */}
        <rect
          x="8"
          y="8"
          width="134"
          height="24"
          rx="4"
          ry="4"
          fill="#2d2d44"
        />

        {/* Node title text */}
        <text
          x="75"
          y="24"
          textAnchor="middle"
          fontSize="12"
          fill="#e0e0e0"
          fontWeight="500"
        >
          {ending.title || 'Ending Scene'}
        </text>

        {/* Description text */}
        <text
          x="75"
          y="50"
          textAnchor="middle"
          fontSize="10"
          fill="#a0a0a0"
        >
          {ending.description ? (ending.description.length > 20 ? ending.description.substring(0, 20) + '...' : ending.description) : 'The story concludes here'}
        </text>

        {/* Media indicator */}
        {ending.audienceMedia.length > 0 && (
          <text
            x="75"
            y="65"
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {ending.audienceMedia.length} media
          </text>
        )}
      </g>
    );
  };

  const renderFork = (fork: Fork) => {
    // Apply canvas transform manually to maintain crisp vector rendering
    const nodeX = (fork.position.x * canvasTransform.scale) + canvasTransform.x + 5000;
    const nodeY = (fork.position.y * canvasTransform.scale) + canvasTransform.y + 5000;

    return (
      <g
        key={fork.id}
        className={`canvas-node fork-node ${selectedNodeId === fork.id ? 'selected' : ''}`}
        transform={`translate(${nodeX}, ${nodeY})`}
        onMouseDown={(e) => handleNodeMouseDown(e, fork.id)}
        style={{ cursor: 'move' }}
      >
        {/* Node background rectangle */}
                 <rect
           x="0"
           y="0"
           width="150"
           height="80"
           rx="8"
           ry="8"
           fill="#1a1a2e"
           stroke="#f59e0b"
           strokeWidth={selectedNodeId === fork.id ? "3" : "1"}
         />

        {/* Input connection point - center at (-8, 40) */}
        <circle
          cx="-8"
          cy="40"
          r="8"
          fill="#10b981"
          stroke="#1a1a2e"
          strokeWidth="2"
          style={{ cursor: 'pointer' }}
          onMouseUp={(e) => handleInputMouseUp(e, fork.id)}
        />

        {/* Output connection points - dynamically generated based on choices */}
        {fork.choices.map((_, outputIndex) => (
          <circle
            key={outputIndex}
            cx="158"
            cy={25 + (outputIndex * 25)}
            r="8"
            fill="#3b82f6"
            stroke="#1a1a2e"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
            onMouseDown={(e) => handleOutputMouseDown(e, fork.id, outputIndex)}
          />
        ))}

        {/* Node header background */}
        <rect
          x="8"
          y="8"
          width="134"
          height="24"
          rx="4"
          ry="4"
          fill="#2d2d44"
        />

        {/* Node title text */}
        <text
          x="75"
          y="24"
          textAnchor="middle"
          fontSize="12"
          fill="#e0e0e0"
          fontWeight="500"
        >
          {fork.title || 'Untitled Choice'}
        </text>



        {/* Choices list */}
        {fork.choices.slice(0, 2).map((choice, index) => (
          <text
            key={index}
            x="75"
            y={45 + (index * 12)}
            textAnchor="middle"
            fontSize="9"
            fill="#a0a0a0"
          >
            {choice.label ? (choice.label.length > 15 ? choice.label.substring(0, 15) + '...' : choice.label) : `Choice ${index + 1}`}
          </text>
        ))}

        {/* Timer indicator */}
        <text
          x="75"
          y="70"
          textAnchor="middle"
          fontSize="10"
          fill="#6b7280"
        >
          {fork.countdownSeconds}s timer
        </text>
      </g>
    );
  };

    const renderConnections = () => {
      const connectionElements: JSX.Element[] = [];

      // Render existing connections
      connections.forEach(connection => {
        const fromState = states.find(s => s.id === connection.fromNodeId);
        const toState = states.find(s => s.id === connection.toNodeId);

        if (fromState && toState) {
          // Calculate connection points to the CENTER of the connection circles
          // Since nodes are now SVG elements positioned at (nodeX, nodeY), we calculate relative to that

          let startX, startY, endX, endY;

          // Output point center (right side of source node)
          if (fromState.type === 'fork') {
            // Fork output connections are at different Y positions
            startX = (fromState.position.x * canvasTransform.scale) + canvasTransform.x + 5000 + 158; // Node position + SVG offset + connection point offset (150 + 8)
            startY = (fromState.position.y * canvasTransform.scale) + canvasTransform.y + 5000 + 25 + (connection.fromOutputIndex * 25); // Node position + SVG offset + connection Y
          } else {
            // Regular scene/opening output connection at standard position
            startX = (fromState.position.x * canvasTransform.scale) + canvasTransform.x + 5000 + 158; // Node position + SVG offset + connection point offset (150 + 8)
            startY = (fromState.position.y * canvasTransform.scale) + canvasTransform.y + 5000 + 40; // Node position + SVG offset + connection Y
          }

          // Input point center (left side of target node) - always at (-8, 40) relative to node
          endX = (toState.position.x * canvasTransform.scale) + canvasTransform.x + 5000 - 8; // Node position + SVG offset + connection point offset (-8 for left side)
          endY = (toState.position.y * canvasTransform.scale) + canvasTransform.y + 5000 + 40; // Node position + SVG offset + connection Y

          connectionElements.push(
            <g
              key={connection.id}
              className="connection-line"
              data-connection-id={connection.id}
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

            {/* Connection label for fork nodes */}
            {fromState.type === 'fork' && fromState.choices[connection.fromOutputIndex] && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 8}
                textAnchor="middle"
                fontSize="12"
                fill="#ffffff"
                fontWeight="500"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {fromState.choices[connection.fromOutputIndex].label || `Choice ${connection.fromOutputIndex + 1}`}
              </text>
            )}

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
          </g>
        );
      }
    });

    // Render drag preview when creating new connection
    if (isDraggingConnection && connectionDragStart && connectionDragEnd) {
      connectionElements.push(
        <g
          key="drag-preview"
          className="connection-line drag-preview"
        >
          <line
            x1={connectionDragStart.position.x + 5000 + 158}
            y1={connectionDragStart.position.y + 5000 + 40}
            x2={connectionDragEnd.x + 5000}
            y2={connectionDragEnd.y + 5000}
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="5,5"
            markerEnd="url(#arrowhead)"
          />
        </g>
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
              x={(-canvasTransform.x - bounds.minX + padding) * finalScale}
              y={(-canvasTransform.y - bounds.minY + padding) * finalScale}
              width={(window.innerWidth / canvasTransform.scale) * finalScale}
              height={(window.innerHeight / canvasTransform.scale) * finalScale}
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
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          transformOrigin: '0 0',
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
          {Math.round(canvasTransform.scale * 100)}%
        </div>
      </div>

      {/* Mini Map */}
      {renderMiniMap()}
    </div>
  );
};
