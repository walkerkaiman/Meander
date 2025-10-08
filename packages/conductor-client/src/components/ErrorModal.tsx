import React from 'react';
import { Modal, Text, Button, Box } from '@mantine/core';

interface ErrorModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string[];
}

const ErrorModal: React.FC<ErrorModalProps> = ({ opened, onClose, title, message, details }) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="lg" weight={600}>{title}</Text>}
      centered
      size="md"
      overlayProps={{ opacity: 0.55, blur: 3 }}
    >
      <Box style={{ padding: '1rem' }}>
        <Text size="md" style={{ marginBottom: '1rem' }}>{message}</Text>
        {details && details.length > 0 && (
          <Box style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
            <Text size="sm" weight={500}>Details:</Text>
            {details.map((detail, index) => (
              <Text key={index} size="sm" color="dimmed">- {detail}</Text>
            ))}
          </Box>
        )}
        <Button onClick={onClose} style={{ marginTop: '1.5rem', float: 'right' }}>
          OK
        </Button>
      </Box>
    </Modal>
  );
};

export default ErrorModal;












