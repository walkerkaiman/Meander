import React, { useMemo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import './Node.css';

const cps = 22;
const wrap = (t: string) => {
  if (!t) return [' '];
  const out: string[] = [];
  t.split(/\r?\n/).forEach(line => {
    let cur = '';
    line.split(' ').forEach(word => {
      if ((cur + (cur ? ' ' : '') + word).length <= cps) {
        cur += (cur ? ' ' : '') + word;
      } else {
        if (cur) out.push(cur);
        cur = word.length > cps ? word.slice(0, cps - 1) + '…' : word;
      }
    });
    if (cur) out.push(cur);
  });
  return out;
};

const calcHeight = (lines: number, choices: number) => {
  const textH = 60 + lines * 14;
  const choiceSpace = choices * 25 + 25; // one circle per choice + margin
  return Math.max(textH, choiceSpace + 20);
};

const ForkNode = ({ data, isConnectable }: { data: any; isConnectable: boolean }) => {
  const { label, audienceText = '', choices = [], isCurrent } = data;

  const rawLines = useMemo(()=>audienceText.split(/\r?\n/),[audienceText]);
  const wrapped = useMemo(()=>rawLines.flatMap(wrap),[rawLines]);
  const height = calcHeight(wrapped.length, choices.length);

  return (
    <div
      className={`canvas-node fork-node ${isCurrent ? 'current' : ''}`}
      style={{
        width: 150,
        borderRadius: 10,
        background: '#1a1a2e',
        border: isCurrent ? '3px dashed #ffffff' : '2px solid #facc15',
        boxShadow: isCurrent ? '0 0 0 6px rgba(255,255,255,0.2)' : '0 2px 8px rgba(0,0,0,0.3)'
      }}
    >
      {/* header */}
      <div style={{ background: '#1f2937', padding: '8px 10px', borderRadius: '4px 4px 0 0' }}>
        <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{label}</span>
      </div>

      {/* audience text */}
      <div style={{ padding: '10px', color:'#cbd5e1', fontSize:10, lineHeight:'14px', whiteSpace:'pre-line' }}>
        {wrapped.join('\n')}

        {/* Choices list */}
        {choices.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p style={{ margin:'0 0 4px 0', color:'#facc15', fontWeight:'bold', fontSize:10 }}>Choices:</p>
            {choices.map((ch: any, idx: number) => (
              <div key={idx} style={{ fontSize:10, color:'#e0e0e0', padding:'4px 8px', background:'#2d2d44', borderRadius:4, marginBottom:4, borderLeft:'3px solid #f59e0b' }}>
                {ch.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#10b981', border: '2px solid #1a1a2e', width: 16, height: 16, left: -8, top: '50%', transform:'translateY(-50%)' }}
        isConnectable={isConnectable}
      />

      {/* outputs per choice */}
      {choices.map((c: any, idx: number) => (
        <Handle
          key={idx}
          type="source"
          position={Position.Right}
          id={`output-${idx}`}
          style={{
            background: '#3b82f6',
            border: '2px solid #1a1a2e',
            width: 16,
            height: 16,
            right: -8,
            top: 25 + idx * 25 - 8
          }}
          isConnectable={isConnectable}
        />
      ))}
    </div>
  );
};

export default ForkNode;


