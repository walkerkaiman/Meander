import React, { useRef, useState, useCallback } from 'react';
import CanvasViewport from './CanvasViewport';
import Node from './Node';
import Connection from './Connection';
import MiniMap from './MiniMap';
import { State, Connection as ConnectionType, Position, StateUpdate } from '../types';
import { Maximize2 } from 'lucide-react';

interface CanvasProps {
  states: State[];
  connections: ConnectionType[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onUpdateNode: (nodeId: string, updates: StateUpdate) => void;
  onCreateConnection: (fromNodeId: string, fromOutputIndex: number, toNodeId: string) => string;
  onDeleteConnection: (connectionId: string) => void;
}

export const SlimCanvas: React.FC<CanvasProps> = ({
  states,
  connections,
  selectedNodeId,
  onNodeSelect,
  onUpdateNode,
  onCreateConnection,
  onDeleteConnection
}) => {
  // Track current viewport transform for coordinate conversions
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverConnId, setHoverConnId] = useState<string | null>(null);
  const viewportRef = useRef<any>(null);

  // helper for dynamic node height (same as Node component)
  const cps = 22;
  const countLines = (text: string) => {
    const words = text.split(' ');
    let lines = 1, cur = 0;
    words.forEach(w=>{
      if (cur + w.length + (cur?1:0) <= cps) cur += w.length + (cur?1:0);
      else { lines++; cur = w.length; }
    });
    return lines;
  };

  const computeHeight = (state: State): number => {
    const base = 60, lh = 14;
    let lines = 1;
    if (state.type==='scene' || state.type==='opening' || state.type==='ending') lines = state.description.split(/\r?\n/).reduce((s,l)=>s+countLines(l),0);
    else if (state.type==='fork') lines = state.audienceText.split(/\r?\n/).reduce((s,l)=>s+countLines(l),0);
    return base + lines*lh;
  };

  // --- Node dragging ---
  const dragState = useRef<{ id: string; offset: Position } | null>(null);

  // --- Connection dragging state ---
  const [isDraggingConn, setIsDraggingConn] = useState(false);
  const [connStart, setConnStart] = useState<{ nodeId: string; outputIndex: number; pos: Position } | null>(null);
  const [connEnd, setConnEnd] = useState<Position | null>(null);

  const toCanvasCoords = (clientX: number, clientY: number): Position => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (clientX - rect.left - viewport.x) / viewport.scale;
    const y = (clientY - rect.top - viewport.y) / viewport.scale;
    return { x, y };
  };

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      const node = states.find(s => s.id === nodeId);
      if (!node) return;
      const mousePos = toCanvasCoords(e.clientX, e.clientY);
      dragState.current = {
        id: nodeId,
        offset: { x: mousePos.x - node.position.x, y: mousePos.y - node.position.y }
      };
      onNodeSelect(nodeId);
    },
    [states, onNodeSelect, viewport]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDraggingConn && connStart) {
        const pos = toCanvasCoords(e.clientX, e.clientY);
        setConnEnd(pos);
        return;
      }
      if (!dragState.current) return;
      const { id, offset } = dragState.current;
      const pos = toCanvasCoords(e.clientX, e.clientY);
      // Snap to 20px grid
      const snapped = {
        x: Math.round((pos.x - offset.x) / 20) * 20,
        y: Math.round((pos.y - offset.y) / 20) * 20
      };
      onUpdateNode(id, { position: snapped });
    },
    [onUpdateNode, viewport, isDraggingConn, connStart]
  );

  const handleMouseUp = useCallback(() => {
    dragState.current = null;
    if (isDraggingConn) {
      setIsDraggingConn(false);
      setConnStart(null);
      setConnEnd(null);
    }
  }, []);

  // Start dragging connection from output
  const handleOutputMouseDown = (e: React.MouseEvent, nodeId: string, outputIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const node = states.find(s => s.id === nodeId);
    if (!node) return;
    const startPos: Position = node.type === 'fork'
      ? { x: node.position.x + 150 + 8, y: node.position.y + 25 + outputIdx * 25 }
      : { x: node.position.x + 150 + 8, y: node.position.y + computeHeight(node)/2 };
    setIsDraggingConn(true);
    setConnStart({ nodeId, outputIndex: outputIdx, pos: startPos });
    setConnEnd(startPos);
  };

  // Finish drag on input
  const handleInputMouseUp = (e: React.MouseEvent, nodeId: string) => {
    if (isDraggingConn && connStart) {
      e.preventDefault();
      e.stopPropagation();
      onCreateConnection(connStart.nodeId, connStart.outputIndex, nodeId);
      setIsDraggingConn(false);
      setConnStart(null);
      setConnEnd(null);
    }
  };

  // Fit view handler
  const fitView = () => {
    if (states.length === 0) return;
    const padding = 100;
    const nodeWidth = 150;
    const nodeHeightScene = 120;
    const nodeHeightOther = 80;
    const bounds = states.reduce(
      (acc, s) => {
        const h = s.type === 'scene' ? nodeHeightScene : nodeHeightOther;
        return {
          minX: Math.min(acc.minX, s.position.x),
          minY: Math.min(acc.minY, s.position.y),
          maxX: Math.max(acc.maxX, s.position.x + nodeWidth),
          maxY: Math.max(acc.maxY, s.position.y + h)
        };
      },
      {
        minX: states[0].position.x,
        minY: states[0].position.y,
        maxX: states[0].position.x + nodeWidth,
        maxY: states[0].position.y + nodeHeightScene
      }
    );

    const contentW = bounds.maxX - bounds.minX + padding * 2;
    const contentH = bounds.maxY - bounds.minY + padding * 2;

    const leftW = (document.querySelector('.editor-left-panel') as HTMLElement)?.clientWidth || 300;
    const rightW = (document.querySelector('.editor-right-panel') as HTMLElement)?.clientWidth || 350;
    const containerW = window.innerWidth - leftW - rightW;
    const containerH = window.innerHeight;

    const scale = Math.min(containerW / contentW, containerH / contentH, 1);

    const marginX = (containerW - contentW * scale) / 2;
    const marginY = (containerH - contentH * scale) / 2;

    const x = marginX - (bounds.minX - padding + ORIGIN) * scale;
    const y = marginY - (bounds.minY - padding + ORIGIN) * scale;

    viewportRef.current?.setTransform({ scale, x, y });
  };

  // --- Render connections as raw coordinates ---
  const ORIGIN = 5000; // shift to avoid negative coords being clipped

  const renderConnections = () => {
    const wrapCount = (text: string): number => {
      const cps = 22;
      const words = text.split(' ');
      let lines = 1;
      let curLen = 0;
      words.forEach(w=>{
        if (curLen + w.length + (curLen?1:0) <= cps) {
          curLen += w.length + (curLen?1:0);
        } else {
          lines++;
          curLen = w.length;
        }
      });
      return lines;
    };

    const computeHeight = (state: State): number => {
      const base = 60;
      const lineH = 14;
      let lines = 1;
      if (state.type === 'scene') lines = state.description.split(/\r?\n/).reduce((sum,l)=>sum+wrapCount(l),0);
      else if (state.type === 'opening' || state.type==='ending') lines = state.description.split(/\r?\n/).reduce((s,l)=>s+wrapCount(l),0);
      else if (state.type==='fork') {
        lines = Math.max(state.choices.length + 1, state.audienceText.split(/\r?\n/).reduce((s,l)=>s+wrapCount(l),0));
      }
      return base + lines*lineH;
    };

    const nodeCenterY = (s: State) => {
      return s.position.y + computeHeight(s)/2;
    };

    return connections.map(conn => {
      const fromState = states.find(s => s.id === conn.fromNodeId);
      const toState = states.find(s => s.id === conn.toNodeId);
      if (!fromState || !toState) return null;

      let start: Position;
      if (fromState.type === 'fork') {
        start = {
          x: fromState.position.x + 150 + 8,
          y: fromState.position.y + 25 + conn.fromOutputIndex * 25
        };
      } else {
        start = { x: fromState.position.x + 150 + 8, y: nodeCenterY(fromState) };
      }

      const end: Position = { x: toState.position.x - 8, y: nodeCenterY(toState) };

      // Determine label
      let label: string | undefined;
      if (fromState.type === 'fork') {
        label = fromState.choices[conn.fromOutputIndex]?.label || '';
      }

      return (
        <Connection
          key={conn.id}
          from={start}
          to={end}
          label={label}
          hovered={hoverConnId === conn.id}
          onHover={(h) => setHoverConnId(h ? conn.id : null)}
          onDelete={() => onDeleteConnection(conn.id)}
        />
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className="canvas slim-canvas"
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <MiniMap
        states={states}
        viewport={viewport}
        containerWidth={containerRef.current?.clientWidth || 0}
        containerHeight={containerRef.current?.clientHeight || 0}
      />

      {/* Fit view button */}
      <button
        onClick={fitView}
        style={{ position: 'absolute', right: 16, bottom: 150, background: '#1e293b', border: 'none', padding: 6, borderRadius: 4, cursor: 'pointer', color: '#cbd5e1' }}
        title="Fit view"
      >
        <Maximize2 size={16} />
      </button>
      <CanvasViewport
        ref={viewportRef}
        className="viewport"
        onTransformChange={setViewport}
      >
        {/* SVG world */}
        <svg
          width={10000}
          height={10000}
          style={{ position: 'absolute', left: -ORIGIN, top: -ORIGIN }}
        >
          <g transform={`translate(${ORIGIN}, ${ORIGIN})`}>
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>
          {states.map(s => {
            return (
              <Node
                key={s.id}
                state={s}
                selected={s.id === selectedNodeId}
                onMouseDown={handleNodeMouseDown}
                onOutputMouseDown={handleOutputMouseDown}
                onInputMouseUp={handleInputMouseUp}
              />
            );
          })}

          {renderConnections()}

          {/* temp connection */}
          {isDraggingConn && connStart && connEnd && (
            <Connection from={connStart.pos} to={connEnd} highlighted interactive={false} />
          )}
          </g>
        </svg>
      </CanvasViewport>
    </div>
  );
};

export default SlimCanvas;
