import React from 'react';
import { Box, Text, ScrollArea, Divider } from '@mantine/core';
import { useShowStore } from '../store/useShowStore';

interface ProgressSidebarProps {
  width?: number;
}

const ProgressSidebar: React.FC<ProgressSidebarProps> = ({ width = 250 }) => {
  const { graph, activeState } = useShowStore();

  if (!graph || !activeState) {
    return (
      <Box style={{ width, padding: '1rem', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Text size="md" weight={500}>Progress</Text>
        <Text size="sm" color="dimmed">No show loaded</Text>
      </Box>
    );
  }

  // Extract nodes and determine history and upcoming based on active state
  const nodeIds = Object.keys(graph.nodes);
  const activeIndex = nodeIds.indexOf(activeState.id);
  const historyNodes = activeIndex >= 0 ? nodeIds.slice(0, activeIndex + 1) : [];
  const upcomingNode = activeIndex >= 0 && activeIndex < nodeIds.length - 1 ? nodeIds[activeIndex + 1] : null;

  return (
    <Box style={{ width, padding: '1rem', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6', height: '100vh', overflowY: 'auto' }}>
      <Text size="md" weight={500} style={{ marginBottom: '0.5rem' }}>Progress</Text>
      <Divider my="sm" />
      <ScrollArea style={{ height: 'calc(100vh - 60px)' }}>
        <Text size="sm" weight={500} color="dimmed">History</Text>
        {historyNodes.length > 0 ? (
          historyNodes.map((nodeId) => (
            <Box key={nodeId} style={{ padding: '0.5rem 0', borderLeft: nodeId === activeState.id ? '3px solid #228be6' : '3px solid transparent' }}>
              <Text size="sm" weight={nodeId === activeState.id ? 600 : 400}>
                {nodeId} {graph.nodes[nodeId]?.type === 'fork' ? '(Fork)' : '(Scene)'}
              </Text>
            </Box>
          ))
        ) : (
          <Text size="sm" color="dimmed">No history yet</Text>
        )}

        <Divider my="sm" />
        <Text size="sm" weight={500} color="dimmed">Upcoming</Text>
        {upcomingNode ? (
          <Box style={{ padding: '0.5rem 0' }}>
            <Text size="sm">{upcomingNode} {graph.nodes[upcomingNode]?.type === 'fork' ? '(Fork)' : '(Scene)'}</Text>
          </Box>
        ) : (
          <Text size="sm" color="dimmed">No upcoming node</Text>
        )}
      </ScrollArea>
    </Box>
  );
};

export default ProgressSidebar;

