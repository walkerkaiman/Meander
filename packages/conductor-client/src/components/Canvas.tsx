import React, { useRef, useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import { useShowStore } from '../store/useShowStore';

// Since graph-components re-exports from Editor, we can import directly from there
// Assuming the Editor's Canvas component supports pan/zoom and node highlighting
// If not, we'd need to extend or wrap it

const Canvas: React.FC = () => {
  const { graph, activeState } = useShowStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graph || !activeState || !canvasRef.current) return;

    // This is a placeholder for actual rendering logic
    // In a real implementation, you'd use React Flow or a similar library
    // to render nodes and connections with pan/zoom functionality
    // and highlight the active node based on activeState.id
    
    // For now, we'll just log to confirm data is available
    console.log('Rendering canvas with graph and active state:', {
      nodes: Object.keys(graph.nodes),
      activeNode: activeState.id,
    });

    // Example of how you'd interact with a DOM-based canvas or library
    // canvasRef.current.innerHTML = '<div>Mock Canvas with nodes</div>';
  }, [graph, activeState]);

  if (!graph || !activeState) {
    return <Box style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Text>No show data loaded</Text>
    </Box>;
  }

  return (
    <Box ref={canvasRef} style={{ height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Placeholder for the actual canvas rendering */}
      <Text style={{ position: 'absolute', top: 10, left: 10 }}>
        Node Flow Canvas (Placeholder)
      </Text>
      <Text style={{ position: 'absolute', top: 30, left: 10, color: '#228be6' }}>
        Active Node: {activeState.id}
      </Text>
    </Box>
  );
};

export default Canvas;




