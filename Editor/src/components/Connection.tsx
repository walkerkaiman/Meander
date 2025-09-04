import React from 'react';
import { Position } from '../types';

interface ConnectionProps {
  from: Position;
  to: Position;
  label?: string;
  highlighted?: boolean;
  onHover?: (hover: boolean) => void;
  onDelete?: () => void;
  hovered?: boolean;
}

/**
 * Render a cubic bezier connection between two points. The entire SVG scene may
 * later be transformed by the CanvasViewport, so we draw at raw coordinates.
 */
export const Connection: React.FC<ConnectionProps> = ({ from, to, label, highlighted, onHover, onDelete, hovered }) => {
  // Simple horizontal bezier: control points at 1/3 and 2/3 of distance
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const control1: Position = { x: from.x + dx * 0.33, y: from.y };
  const control2: Position = { x: from.x + dx * 0.66, y: to.y };

  const path = `M ${from.x} ${from.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${to.x} ${to.y}`;

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  return (
    <g
      className="connection-line"
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <path
        d={path}
        fill="none"
        stroke={hovered ? '#ef4444' : highlighted ? '#facc15' : '#64748b'}
        strokeWidth={hovered ? 3 : highlighted ? 3 : 2}
        markerEnd="url(#arrow)"
      />
      {label && (
        <g transform={`translate(${midX}, ${midY})`} pointerEvents="none">
          <rect x={-40} y={-10} width={80} height={20} rx={4} ry={4} fill="rgba(17,24,39,0.8)" />
          <text x={0} y={5} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={10}>{label}</text>
        </g>
      )}
      {hovered && onDelete && (
        <g transform={`translate(${midX}, ${midY})`} style={{ cursor: 'pointer' }} onClick={onDelete}>
          <circle cx={0} cy={0} r={12} fill="#ef4444" />
          <text x={0} y={2} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={14} fontWeight="bold">×</text>
        </g>
      )}
    </g>
  );
};

export default Connection;
