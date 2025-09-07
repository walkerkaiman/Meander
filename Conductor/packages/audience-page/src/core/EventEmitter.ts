/**
 * Generic event emitter for TypeScript with type safety
 */
export class EventEmitter<TEvents extends Record<string, any>> {
  private listeners: Map<keyof TEvents, Array<(payload: any) => void>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof TEvents>(event: K, callback: (payload: TEvents[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Emit an event with optional payload
   */
  emit<K extends keyof TEvents>(event: K, payload?: TEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event listener for '${String(event)}':`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if no event specified
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Remove a specific listener for an event
   */
  off<K extends keyof TEvents>(event: K, callback: (payload: TEvents[K]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.length : 0;
  }

  /**
   * Get all events that have listeners
   */
  eventNames(): Array<keyof TEvents> {
    return Array.from(this.listeners.keys());
  }
}
