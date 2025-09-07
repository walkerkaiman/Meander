import { ServerMessage, VotePayload } from '../types/conductor-types';
import { EventEmitter } from './EventEmitter';
import { AudienceConfig } from '../types';

/**
 * Manages WebSocket connection and message handling
 */
export class WebSocketManager extends EventEmitter<{
  connected: void;
  disconnected: void;
  message: ServerMessage;
  error: Error;
}> {
  private ws: WebSocket | null = null;
  private config: AudienceConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isIntentionallyDisconnected = false;

  constructor(config: AudienceConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyDisconnected = false;
    const wsUrl = `ws://${this.config.serverHost}:${this.config.websocketPort}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.emit('error', error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyDisconnected = true;
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connection is open
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send message to server (if needed in the future)
   */
  send<T>(message: T): void {
    if (!this.isConnected()) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.emit('error', error as Error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.emit('disconnected');
      
      if (!this.isIntentionallyDisconnected) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      const error = new Error('WebSocket connection error');
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        console.log('Received WebSocket message:', message);
        this.emit('message', message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.emit('error', error as Error);
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyDisconnected || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isIntentionallyDisconnected) {
        this.connect();
      }
    }, delay);
  }
}

/**
 * Manages HTTP requests to the server
 */
export class ApiManager {
  private config: AudienceConfig;

  constructor(config: AudienceConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    return `http://${this.config.serverHost}:${this.config.serverPort}`;
  }

  /**
   * Get current show state
   */
  async getShowState(): Promise<any> {
    const response = await fetch(`${this.getBaseUrl()}/audience/show`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to get show state: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get show graph
   */
  async getShowGraph(): Promise<any> {
    const response = await fetch(`${this.getBaseUrl()}/audience/graph`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to get show graph: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Submit vote
   */
  async submitVote(vote: VotePayload): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/audience/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vote),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit vote: ${response.status} ${response.statusText}`);
    }
  }
}
