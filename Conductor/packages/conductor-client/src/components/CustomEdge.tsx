import React from 'react';
import { EdgeProps, getBezierPath } from 'react-flow-renderer';

const CustomEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, label, style, markerEnd }) => {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  return (
    <g className="custom-edge" pointerEvents="none">
      <path id={id} d={edgePath} fill="none" stroke={style?.stroke || '#64748b'} strokeWidth={style?.strokeWidth || 2} markerEnd={markerEnd} />
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect x={-40} y={-10} width={80} height={20} rx={4} ry={4} fill="rgba(17,24,39,0.8)" />
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={10}>{label}</text>
        </g>
      )}
    </g>
  );
};

export default CustomEdge;
