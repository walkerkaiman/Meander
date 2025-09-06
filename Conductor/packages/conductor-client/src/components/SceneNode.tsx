import React, { useMemo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import './Node.css';

const cps = 22; // chars per line used in Editor for wrapping
const wrapLines = (text: string): string[] => {
  if (!text) return [' '];
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  const push = () => { if (cur) { out.push(cur); cur = ''; } };
  words.forEach(w => {
    if ((cur + (cur ? ' ' : '') + w).length <= cps) {
      cur += (cur ? ' ' : '') + w;
    } else {
      push();
      if (w.length > cps) out.push(w.slice(0, cps - 1) + '…');
      else cur = w;
    }
  });
  push();
  return out;
};

const calcHeight = (lines: number) => 60 + lines * 14;

const SceneNode = ({ data, isConnectable }: { data: any; isConnectable: boolean }) => {
  const { label, description = '', isCurrent, type, audienceMedia } = data;

  // Memoize line wrapping so we don't recalc every render
  const rawLines = useMemo(() => description.split(/\r?\n/), [description]);
  const wrapped = useMemo(() => rawLines.flatMap(wrapLines), [rawLines]);
  const height = calcHeight(wrapped.length);

  // Border colour by type
  const borderColor = type === 'scene' ? '#10b981'
    : type === 'fork' ? '#facc15'
    : (type === 'opening' || type === 'ending') ? '#8b5cf6'
    : '#64748b';

  return (
    <div
      className={`canvas-node ${type}-node ${isCurrent ? 'current' : ''}`}
      style={{
        width: 150,
        borderRadius: 10,
        background: '#1a1a2e',
        border: isCurrent ? '3px dashed #ffffff' : `2px solid ${borderColor}`,
        boxShadow: isCurrent ? '0 0 0 6px rgba(255,255,255,0.2)' : '0 2px 8px rgba(0,0,0,0.3)'
      }}
    >
      {/* Header */}
      <div style={{ background: '#1f2937', padding: '8px 10px', borderRadius: '4px 4px 0 0' }}>
        <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{label}</span>
      </div>

      {/* Description */}
      <div style={{ padding: '10px', color:'#cbd5e1', fontSize:10, lineHeight:'14px', whiteSpace:'pre-line' }}>
        {wrapped.join('\n')}
      </div>
      {audienceMedia && audienceMedia.length > 0 && (
        <span style={{ fontSize: '0.75rem', color: '#10b981', background: '#ecfdf5', padding: '4px 8px', borderRadius: 4, display: 'inline-block', marginTop: 8 }}>
          Media: {audienceMedia.length}
        </span>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#10b981', border: '2px solid #1a1a2e', width: 16, height: 16, left: -8, top: '50%', transform:'translateY(-50%)' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#3b82f6', border: '2px solid #1a1a2e', width: 16, height: 16, right: -8, top: '50%', transform:'translateY(-50%)' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default SceneNode;


