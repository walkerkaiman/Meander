import OSC from 'osc-js';
import { EventEmitter } from 'eventemitter3';
import { ActiveState } from 'conductor-types';

let oscInstance: OSC | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

const HEARTBEAT_INTERVAL_MS = 5000; // 5 seconds

export function initOscPublisher(port: number, eventBus: EventEmitter): OSC {
  if (oscInstance) {
    return oscInstance;
  }

  oscInstance = new OSC({
    plugin: new OSC.DatagramPlugin({ send: { port, host: '0.0.0.0' } }),
  });

  oscInstance.open();
  console.log(`OSC publisher initialized on UDP port ${port}`);

  // Setup heartbeat
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  heartbeatInterval = setInterval(() => {
    if (oscInstance) {
      oscInstance.send(new OSC.Message('/meander/heartbeat'));
      console.log('OSC Heartbeat sent');
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Listen for state changes and broadcast OSC messages
  eventBus.on('stateChanged', (state: ActiveState) => {
    if (oscInstance) {
      const address = state.type === 'fork' ? `/fork/${state.id}` : `/scene/${state.id}`;
      oscInstance.send(new OSC.Message(address));
      console.log(`OSC message sent: ${address}`);

      // If it's a scene, also send any associated outputIds if they exist
      // Assuming the state object or a related data structure would have this information
      // This is a placeholder for actual implementation based on your data structure
      // if (state.type === 'scene' && state.outputIds) {
      //   state.outputIds.forEach((outputId: string) => {
      //     oscInstance.send(new OSC.Message(`/output/${outputId}`));
      //   });
      // }
    }
  });

  return oscInstance;
}

// Function to stop OSC publisher if needed
export function stopOscPublisher(): void {
  if (oscInstance) {
    oscInstance.close();
    oscInstance = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

