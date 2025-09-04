import React from 'react';
import { State, Scene, OpeningScene, EndingScene, Fork } from '../types';

interface NodeProps {
  state: State;
  selected: boolean;
  // Event handlers delegated from Canvas
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onOutputMouseDown: (e: React.MouseEvent, nodeId: string, outputIndex: number) => void;
  onInputMouseUp: (e: React.MouseEvent, nodeId: string) => void;
}

/**
 * Generic Node component that renders a single state node (scene, opening, ending, fork)
 * at its *raw* unscaled position. The parent canvas is responsible for applying
 * any global pan/zoom transforms. This component is therefore purely presentational
 * and does **not** apply scale corrections itself.
 */
export const Node: React.FC<NodeProps> = ({
  state,
  selected,
  onMouseDown,
  onOutputMouseDown,
  onInputMouseUp
}) => {
  const commonBase = {
    width: 150,
    rx: 8,
    ry: 8
  } as const;

  const calcHeightFromLines = (lines: number) => 60 + lines * 14;

  const wrapLinesGeneric = (text: string): string[] => {
    if (text.trim() === '') return [' '];
    const cps = 22;
    const words = text.split(' ');
    const out: string[] = [];
    let current = '';
    const push = () => { if (current) { out.push(current); current = ''; } };
    for (const w of words) {
      if ((current + (current ? ' ' : '') + w).length <= cps) {
        current += (current ? ' ' : '') + w;
      } else {
        push();
        if (w.length > cps) out.push(w.slice(0, cps -1) + '…');
        else current = w;
      }
    }
    push();
    return out;
  };

  // ----- Scene -----
  const buildLinesScene = (desc: string) => desc.split(/\r?\n/).flatMap(wrapLinesGeneric);

  const calcSceneHeight = (desc: string) => calcHeightFromLines(buildLinesScene(desc).length);
  const forkHeight = 80;

  // Base translation (no scaling here!)
  const { x, y } = state.position;

  const renderHeader = (title: string) => (
    <>
      {/* Header background */}
      <rect className="node-header-bg" x={8} y={8} width={134} height={24} rx={4} ry={4} fill="#1f2937" />
      {/* Header text with ellipsis if too long */}
      <text
        x={75}
        y={20}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={12}
        fontWeight="bold"
      >
        {title.length > 22 ? title.slice(0, 21) + '…' : title}
      </text>
    </>
  );

  const renderBodyText = (text: string) => (
    <text
      x={75}
      y={55}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#cbd5e1"
      fontSize={10}
      style={{ pointerEvents: 'none', whiteSpace: 'pre-wrap' }}
    >
      {text.length > 30 ? text.slice(0, 27) + '…' : text}
    </text>
  );

  // Render IO depending on node type rules
  const renderIO = (type: State['type'], hasMultipleOutputs = false) => {
    const showInput = type !== 'opening';
    const showOutput = type !== 'ending';

    return (
      <>
        {/* Input */}
        {showInput && (
          <circle
            cx={-8}
            cy="40"
            r="8"
            fill="#10b981"
            stroke="#1a1a2e"
            strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onMouseUp={(e) => onInputMouseUp(e, state.id)}
          />
        )}

        {/* Outputs */}
        {showOutput && (
          hasMultipleOutputs ? (
            (state as Fork).choices.map((_, idx) => (
              <circle
                key={idx}
                cx={158}
                cy={25 + idx * 25}
                r="8"
                fill="#3b82f6"
                stroke="#1a1a2e"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => onOutputMouseDown(e, state.id, idx)}
              />
            ))
          ) : (
            <circle
              cx={158}
              cy="40"
              r="8"
              fill="#3b82f6"
              stroke="#1a1a2e"
              strokeWidth={2}
              style={{ cursor: 'pointer' }}
              onMouseDown={(e) => onOutputMouseDown(e, state.id, 0)}
            />
          )
        )}
      </>
    );
  };

  const renderSceneNode = (scene: Scene) => {
    const descLines = buildLinesScene(scene.description);
    const height = calcHeightFromLines(descLines.length);

    return (
      <g>
        <rect {...commonBase} height={height} fill="#1a1a2e" stroke="#10b981" strokeWidth={selected ? 3 : 1} />
        {/* update IO positions */}
        <circle
          cx={-8}
          cy={height / 2}
          r="8"
          fill="#10b981"
          stroke="#1a1a2e"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onMouseUp={(e) => onInputMouseUp(e, scene.id)}
        />
        <circle
          cx={158}
          cy={height / 2}
          r="8"
          fill="#3b82f6"
          stroke="#1a1a2e"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onMouseDown={(e) => onOutputMouseDown(e, scene.id, 0)}
        />

        {renderHeader(scene.title)}
        {/* description multi-line */}
        <text
          x={12}
          y={40}
          textAnchor="start"
          dominantBaseline="hanging"
          fill="#cbd5e1"
          fontSize={10}
        >
          {descLines.map((l, idx) => (
            <tspan key={idx} x={12} dy={idx === 0 ? 0 : 14}>{l}</tspan>
          ))}
        </text>
      </g>
    );
  };

  // ----- Opening / Ending dynamic wrapping -----
  const buildLinesDesc = (text: string) => text.split(/\r?\n/).flatMap(wrapLinesGeneric);

  const renderOpeningNode = (opening: OpeningScene) => {
    const descLines = buildLinesDesc(opening.description);
    const height = calcHeightFromLines(descLines.length);

    return (
      <g>
        <rect {...commonBase} height={height} fill="#1a1a2e" stroke="#8b5cf6" strokeWidth={selected ? 3 : 1} />
        {/* output only */}
        <circle cx={158} cy={height/2} r="8" fill="#3b82f6" stroke="#1a1a2e" strokeWidth={2} style={{cursor:'pointer'}} onMouseDown={(e)=>onOutputMouseDown(e, opening.id,0)} />
        {renderHeader(opening.title)}
        <text x={12} y={40} textAnchor="start" dominantBaseline="hanging" fill="#cbd5e1" fontSize={10}>
          {descLines.map((l,idx)=>(<tspan key={idx} x={12} dy={idx===0?0:14}>{l}</tspan>))}
        </text>
      </g>
    );
  };

  const renderEndingNode = (ending: EndingScene) => {
    const descLines = buildLinesDesc(ending.description);
    const height = calcHeightFromLines(descLines.length);

    return (
      <g>
        <rect {...commonBase} height={height} fill="#1a1a2e" stroke="#8b5cf6" strokeWidth={selected ? 3 : 1} />
        {/* input only */}
        <circle cx={-8} cy={height/2} r="8" fill="#10b981" stroke="#1a1a2e" strokeWidth={2} style={{cursor:'pointer'}} onMouseUp={(e)=>onInputMouseUp(e, ending.id)} />
        {renderHeader(ending.title)}
        <text x={12} y={40} textAnchor="start" dominantBaseline="hanging" fill="#cbd5e1" fontSize={10}>
          {descLines.map((l,idx)=>(<tspan key={idx} x={12} dy={idx===0?0:14}>{l}</tspan>))}
        </text>
      </g>
    );
  };

  // ----- Fork ----- audienceText lines -----
  const renderForkNode = (fork: Fork) => {
    const descLines = buildLinesDesc(fork.audienceText);
    const choiceSpace = fork.choices.length * 25 + 25;
    const height = Math.max(calcHeightFromLines(descLines.length), choiceSpace + 20);

    return (
      <g>
        <rect {...commonBase} height={height} fill="#1a1a2e" stroke="#facc15" strokeWidth={selected ? 3 : 1} />
        {/* input */}
        <circle cx={-8} cy={height/2} r="8" fill="#10b981" stroke="#1a1a2e" strokeWidth={2} style={{cursor:'pointer'}} onMouseUp={(e)=>onInputMouseUp(e, fork.id)} />
        {/* outputs array */}
        {fork.choices.map((_,idx)=>(<circle key={idx} cx={158} cy={25+idx*25} r="8" fill="#3b82f6" stroke="#1a1a2e" strokeWidth={2} style={{cursor:'pointer'}} onMouseDown={(e)=>onOutputMouseDown(e, fork.id, idx)} />))}
        {renderHeader(fork.title)}
        <text x={12} y={40} textAnchor="start" dominantBaseline="hanging" fill="#cbd5e1" fontSize={10}>
          {descLines.map((l,idx)=>(<tspan key={idx} x={12} dy={idx===0?0:14}>{l}</tspan>))}
        </text>
      </g>
    );
  };

  const content = (() => {
    switch (state.type) {
      case 'scene': return renderSceneNode(state as Scene);
      case 'opening': return renderOpeningNode(state as OpeningScene);
      case 'ending': return renderEndingNode(state as EndingScene);
      case 'fork': return renderForkNode(state as Fork);
      default:
        return null;
    }
  })();

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={`canvas-node ${state.type}-node ${selected ? 'selected' : ''}`}
      onMouseDown={(e) => onMouseDown(e, state.id)}
      style={{ cursor: 'move' }}
    >
      {content}
    </g>
  );
};

export default Node;
