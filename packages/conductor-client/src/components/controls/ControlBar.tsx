import React, { useState } from 'react';
import { Box, Button, Group } from '@mantine/core';
import { useShowStore } from '../../store/useShowStore';

interface ControlBarProps {
  onAdvance: () => void;
  onPrevious: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({ onAdvance, onPrevious }) => {
  const { activeState } = useShowStore();
  const [isVoteCountdown, setIsVoteCountdown] = useState(false); // Placeholder for vote countdown logic

  // In a real implementation, you'd determine if a vote countdown is active
  // based on the activeState.type === 'fork' and a timer or server event
  // For now, we'll assume it's false

  return (
    <Box style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'center' }}>
      <Group spacing="lg">
        <Button variant="outline" onClick={onPrevious} size="md">
          ◀ Previous
        </Button>
        <Button
          onClick={onAdvance}
          disabled={isVoteCountdown}
          size="lg"
          style={{ minWidth: '200px', fontWeight: 600 }}
        >
          Advance ▶
        </Button>
      </Group>
    </Box>
  );
};

export default ControlBar;









