import React, { useMemo } from 'react';
import { State } from '../types';

interface ViewportTransform {
  scale: number;
  x: number;
  y: number;
}

interface MiniMapProps {
  states: State[];
  viewport: ViewportTransform;
  containerWidth: number;
  containerHeight: number;
  width?: number;
  height?: number;
}

/**
 * MiniMap renders a scaled overview of the canvas and highlights the current viewport.
 */
export const MiniMap: React.FC<MiniMapProps> = ({
  states,
  viewport,
  containerWidth,
  containerHeight,
  width = 200,
  height = 120
}) => {
  const nodeWidth = 150;
  const nodeHeight = 80;

  // Calculate bounds of all nodes
  const bounds = useMemo(() => {
    if (states.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const initial = {
      minX: states[0].position.x,
      minY: states[0].position.y,
      maxX: states[0].position.x + nodeWidth,
      maxY: states[0].position.y + nodeHeight
    };
    return states.reduce((acc, s) => {
      return {
        minX: Math.min(acc.minX, s.position.x),
        minY: Math.min(acc.minY, s.position.y),
        maxX: Math.max(acc.maxX, s.position.x + nodeWidth),
        maxY: Math.max(acc.maxY, s.position.y + nodeHeight)
      };
    }, initial);
  }, [states]);

  // Padding around bounds
  const padding = 100;
  const contentW = bounds.maxX - bounds.minX + padding * 2;
  const contentH = bounds.maxY - bounds.minY + padding * 2;

  // Scale to fit mini-map dimensions
  const scale = Math.min(width / contentW, height / contentH);

  // Helper to map canvas coords to mini coords
  const mapX = (x: number) => (x - bounds.minX + padding) * scale;
  const mapY = (y: number) => (y - bounds.minY + padding) * scale;
  const mapSize = (s: number) => s * scale;

  // Current viewport rectangle in canvas coords
  const viewX = -viewport.x / viewport.scale;
  const viewY = -viewport.y / viewport.scale;
  const viewW = containerWidth / viewport.scale;
  const viewH = containerHeight / viewport.scale;

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', right: 16, bottom: 16, background: '#1e1e2e', border: '1px solid #2d2d44' }}
    >
      {/* Grid background */}
      <rect width="100%" height="100%" fill="#0f172a" />
      {states.map(s => (
        <rect
          key={s.id}
          x={mapX(s.position.x)}
          y={mapY(s.position.y)}
          width={mapSize(nodeWidth)}
          height={mapSize(nodeHeight)}
          fill={s.type === 'scene' ? '#10b981' : '#f59e0b'}
          opacity={0.8}
        />
      ))}

      {/* Viewport indicator */}
      <rect
        x={mapX(viewX)}
        y={mapY(viewY)}
        width={mapSize(viewW)}
        height={mapSize(viewH)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
      />
    </svg>
  );
};

export default MiniMap;
