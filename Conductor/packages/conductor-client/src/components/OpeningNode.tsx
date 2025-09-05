import React, { useMemo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import './Node.css';

const cps = 22;
const wrap = (text: string) => {
  if (!text) return [' '];
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  const push = () => { if (cur) { out.push(cur); cur = ''; } };
  words.forEach(w => {
    if ((cur + (cur ? ' ' : '') + w).length <= cps) cur += (cur ? ' ' : '') + w;
    else { push(); cur = w.length > cps ? w.slice(0, cps - 1) + '…' : w; }
  });
  push();
  return out;
};

const calcHeight = (lines: number) => 60 + lines * 14;

const OpeningNode = ({ data, isConnectable }: { data: any; isConnectable: boolean }) => {
  const { label, description = '', isCurrent } = data;
  const descLines = useMemo(() => wrap(description), [description]);
  const height = calcHeight(descLines.length);

  return (
    <div
      className={`canvas-node opening-node ${isCurrent ? 'current' : ''}`}
      style={{
        width: 150,
        height,
        borderRadius: 10,
        background: '#1a1a2e',
        border: isCurrent ? '3px dashed #ffffff' : '2px solid #8b5cf6',
        boxShadow: isCurrent ? '0 0 0 6px rgba(255,255,255,0.2)' : '0 2px 8px rgba(0,0,0,0.3)'
      }}
    >
      <div style={{ background: '#1f2937', padding: '8px 10px', borderRadius: '4px 4px 0 0' }}>
        <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{label}</span>
      </div>

      <div style={{ padding: '10px' }}>
        {descLines.map((l, idx) => (
          <p key={idx} style={{ color: '#cbd5e1', fontSize: 10, lineHeight: '14px', margin: 0 }}>{l}</p>
        ))}
      </div>

      {/* single output */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#3b82f6', border: '2px solid #1a1a2e', width: 16, height: 16, right: -8, top: '50%', transform:'translateY(-50%)' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default OpeningNode;
