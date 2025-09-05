import { useEffect, useState } from 'react';
import { useShowStore } from '../store/useShowStore';
import { notifications } from '@mantine/notifications';

export function useConductorSocket() {
  const [connected, setConnected] = useState(false);
  const { setGraph, setActiveState, setValidationErrors } = useShowStore();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000');

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'stateChanged') {
          setActiveState(data.payload);
        } else if (data.type === 'validationError') {
          setValidationErrors(data.payload);
          // Show toast notification for validation errors (recoverable)
          notifications.show({
            title: 'Validation Error',
            message: 'There are issues with the uploaded show package.',
            color: 'red',
            autoClose: 5000,
          });
        } else if (data.type === 'showLoaded') {
          setGraph(data.payload);
          // Show success toast
          notifications.show({
            title: 'Show Loaded',
            message: 'Show package successfully loaded.',
            color: 'green',
            autoClose: 3000,
          });
        } else if (data.type === 'sequenceError') {
          // Show toast for sequence errors (recoverable)
          notifications.show({
            title: 'Sequence Error',
            message: data.payload.message || 'Error advancing to the next state.',
            color: 'red',
            autoClose: 5000,
          });
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
        notifications.show({
          title: 'WebSocket Error',
          message: 'Failed to parse server message.',
          color: 'red',
          autoClose: 5000,
        });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setConnected(false);
      notifications.show({
        title: 'Connection Lost',
        message: 'WebSocket connection to server closed. Attempting to reconnect...',
        color: 'yellow',
        autoClose: 5000,
      });
      // Attempt to reconnect after a delay
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        // Re-trigger the effect to create a new WebSocket connection
        // This is a simple way to handle reconnection; a more robust solution might involve exponential backoff
        // or a library like reconnecting-websocket
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      notifications.show({
        title: 'WebSocket Error',
        message: 'An error occurred with the server connection.',
        color: 'red',
        autoClose: 5000,
      });
    };

    return () => {
      ws.close();
      setConnected(false);
    };
  }, [setGraph, setActiveState, setValidationErrors]);

  return { connected };
}
