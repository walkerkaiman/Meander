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

  const calcSceneHeight = (desc: string) => {
    const charsPerLine = 30;
    const lineHeight = 14;
    const lines = Math.max(1, Math.ceil(desc.length / charsPerLine));
    return Math.max(120, 60 + lines * lineHeight);
  };
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
    const cps = 22;
    const wrapLines = (text: string): string[] => {
      if (text.trim() === '') return [' '];
      const words = text.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const w of words) {
        if ((current + w).length <= cps) {
          current += (current ? ' ' : '') + w;
        } else {
          if (current) lines.push(current);
          if (w.length > cps) {
            // very long word fallback
            lines.push(w.slice(0, cps - 1) + '…');
          } else {
            current = w;
          }
        }
      }
      if (current) lines.push(current);
      return lines;
    };

    const descLines: string[] = scene.description
      .split(/\r?\n/)
      .flatMap(wrapLines);

    const height = calcSceneHeight(scene.description);

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
          y={height / 2 - (descLines.length - 1) * 7}
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

  const renderOpeningNode = (opening: OpeningScene) => (
    <g>
      <rect {...commonBase} height={forkHeight} fill="#1a1a2e" stroke="#fca5a5" strokeWidth={selected ? 3 : 1} />
      {renderIO('opening', false)}
      {renderHeader(opening.title)}
      {renderBodyText(opening.description)}
    </g>
  );

  const renderEndingNode = (ending: EndingScene) => (
    <g>
      <rect {...commonBase} height={forkHeight} fill="#1a1a2e" stroke="#facc15" strokeWidth={selected ? 3 : 1} />
      {renderIO('ending', false)}
      {renderHeader(ending.title)}
      {renderBodyText(ending.description)}
    </g>
  );

  const renderForkNode = (fork: Fork) => (
    <g>
      <rect {...commonBase} height={forkHeight} fill="#1a1a2e" stroke="#facc15" strokeWidth={selected ? 3 : 1} />
      {renderIO('fork', true)}
      {renderHeader(fork.title)}
      {renderBodyText(fork.audienceText)}
    </g>
  );

  const content = (() => {
    switch (state.type) {
      case 'scene':
        return renderSceneNode(state as Scene);
      case 'opening':
        return renderOpeningNode(state as OpeningScene);
      case 'ending':
        return renderEndingNode(state as EndingScene);
      case 'fork':
        return renderForkNode(state as Fork);
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
