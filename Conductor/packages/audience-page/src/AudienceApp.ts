import { ServerMessage, ActiveState, ShowPackage } from './types/conductor-types';
import { AudienceConfig, AudienceState } from './types';
import { StateManager } from './core/StateManager';
import { WebSocketManager, ApiManager } from './core/WebSocketManager';
import { VoteManager } from './core/VoteManager';
import { DeviceManager } from './core/DeviceManager';
import { Scene } from './components/Scene';
import { Fork } from './components/Fork';
import { Loading } from './components/Loading';
import { ErrorDisplay } from './components/Error';

/**
 * Main application class that orchestrates all components
 */
export class AudienceApp {
  private container: HTMLElement;
  private config: AudienceConfig;
  private stateManager: StateManager;
  private wsManager: WebSocketManager;
  private apiManager: ApiManager;
  private voteManager: VoteManager;
  private deviceManager: DeviceManager;
  
  // Component instances
  private scene: Scene | null = null;
  private fork: Fork | null = null;
  private loading: Loading;
  private errorDisplay: ErrorDisplay;
  
  // State
  private currentComponent: 'loading' | 'error' | 'scene' | 'fork' = 'loading';
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastStateId: string | null = null;

  constructor(container: HTMLElement, config?: Partial<AudienceConfig>) {
    this.container = container;
    this.config = {
      serverHost: window.location.hostname,
      serverPort: 4000,
      websocketPort: 4000,
      ...config
    };

    // Initialize core services
    this.stateManager = new StateManager();
    this.wsManager = new WebSocketManager(this.config);
    this.apiManager = new ApiManager(this.config);
    this.voteManager = new VoteManager(this.apiManager, this.stateManager);
    this.deviceManager = DeviceManager.getInstance();
    
    // Initialize UI components
    this.loading = new Loading(this.container);
    this.errorDisplay = new ErrorDisplay(this.container);
    
    this.setupEventListeners();
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    
    // Show loading state
    this.showLoading('Connecting to show...');
    
    try {
      // Connect WebSocket
      this.wsManager.connect();
      
      // Try to get initial state
      await this.loadInitialState();
      
      // Start polling as fallback after 5 seconds if WebSocket hasn't connected
      setTimeout(() => {
        const state = this.stateManager.getState();
        if (!state.isConnected) {
          this.startPolling();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Failed to start app:', error);
      this.showError('Connection Failed', 'Unable to connect to the show. Please refresh the page to try again.');
    }
  }

  /**
   * Stop the application
   */
  stop(): void {
    
    this.wsManager.disconnect();
    this.stopPolling();
    this.cleanup();
  }

  /**
   * Start polling for state updates as fallback when WebSocket fails
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      return; // Already polling
    }
    
    this.pollingInterval = setInterval(async () => {
      try {
        const currentState = await this.apiManager.getShowState();
        if (currentState && currentState.id !== this.lastStateId) {
          this.lastStateId = currentState.id;
          this.stateManager.setActiveState(currentState);
        }
      } catch (error) {
        console.warn('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * Stop polling for state updates
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async loadInitialState(): Promise<void> {
    try {
      // Try to load show graph first
      try {
        const graph = await this.apiManager.getShowGraph();
        this.stateManager.setShowGraph(graph);
      } catch (graphError: any) {
        if (graphError.message?.includes('404') || graphError.message?.includes('No show loaded')) {
          // No show loaded yet, will wait for showLoaded event
        } else {
          console.warn('📖 Failed to load graph:', graphError);
        }
      }

      // Try to load current state
      try {
        const activeState = await this.apiManager.getShowState();
        this.stateManager.setActiveState(activeState);
        this.lastStateId = activeState.id; // Track the initial state
      } catch (stateError: any) {
        if (stateError.message?.includes('503') || stateError.message?.includes('No show loaded')) {
          // No show loaded yet, will wait for stateChanged events
        } else {
          console.warn('🎬 Failed to load active state:', stateError);
        }
      }

    } catch (error) {
      console.warn('Failed to load initial state, waiting for WebSocket updates:', error);
      // This is okay, we'll get updates via WebSocket
    }
  }

  private async fetchGraphOnShowLoad(): Promise<void> {
    try {
      const graph = await this.apiManager.getShowGraph();
      this.stateManager.setShowGraph(graph);

      // If we have an active state but no current node, try to update it now that we have the graph
      const state = this.stateManager.getState();
      if (state.activeState && !state.currentNode) {
        this.renderCurrentState();
      }
    } catch (error) {
      console.error('❌ Failed to fetch graph after show load:', error);
    }
  }

  private setupEventListeners(): void {
    // WebSocket events
    this.wsManager.on('connected', () => {
      this.stateManager.setConnectionStatus(true);
      // Stop polling when WebSocket is working
      this.stopPolling();
    });

    this.wsManager.on('disconnected', () => {
      this.stateManager.setConnectionStatus(false);
      // Start polling as fallback when WebSocket fails
      this.startPolling();
    });

    this.wsManager.on('message', (message: ServerMessage) => {
      this.handleServerMessage(message);
    });

    this.wsManager.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.stateManager.setError(error.message);
    });

    // State manager events
    this.stateManager.on('state_changed', (state: AudienceState) => {
      this.handleStateChange(state);
    });

    // Listen for graph loaded events to potentially update the display
    this.stateManager.on('event', (event) => {
      if (event.type === 'graph_loaded') {
        const currentState = this.stateManager.getState();
        if (currentState.activeState && !currentState.currentNode) {
          this.renderCurrentState();
        }
      }
    });

    this.stateManager.on('event', (event) => {

      switch (event.type) {
        case 'connection_established':
          // Connection restored, hide error if showing
          if (this.currentComponent === 'error') {
            this.renderCurrentState();
          }
          break;

        case 'error_occurred':
          this.showError('Error', event.payload);
          break;
      }
    });

    // Vote manager events
    this.voteManager.on('vote_submitted', (payload) => {
      // Vote submitted
    });

    this.voteManager.on('vote_failed', (error) => {
      console.error('Vote submission failed:', error);
      this.stateManager.setError('Failed to submit vote. Please try again.');
    });
  }

  private handleServerMessage(message: ServerMessage): void {

    switch (message.type) {
      case 'stateChanged':
        this.stateManager.setActiveState(message.payload);
        break;

      case 'showLoaded':
        this.fetchGraphOnShowLoad();
        break;

      case 'voteTick':
        this.stateManager.setCountdown(message.payload.remainingSeconds);
        break;

      case 'voteResult':
        // Reset voting state when results come in
        break;

      case 'timerTick':
        // Handle general timer tick if needed
        break;

      case 'validationError':
        console.error('Server validation error:', message.payload);
        this.stateManager.setError('Server validation error');
        break;

      default:
        console.warn('Unknown server message type:', message);
    }
  }

  private handleStateChange(state: AudienceState): void {
    
    if (!state.isConnected && this.currentComponent !== 'error') {
      this.showError('Connection Lost', 'Lost connection to the show. Attempting to reconnect...');
      return;
    }

    if (state.error && this.currentComponent !== 'error') {
      this.showError('Error', state.error);
      return;
    }

    this.renderCurrentState();
  }

  private renderCurrentState(): void {
    const state = this.stateManager.getState();

    // Render current state

    if (!state.activeState) {
      this.showLoading('Waiting for show to start...');
      return;
    }

    if (!state.showGraph) {
      this.showLoading('Loading show data...');
      return;
    }

    const currentNode = state.currentNode;
    if (!currentNode) {
      // Check if the active state ID exists in the graph
      if (state.showGraph.nodes && !state.showGraph.nodes[state.activeState.id]) {
        console.error(`Node "${state.activeState.id}" not found in graph. Available nodes:`, Object.keys(state.showGraph.nodes));
        this.showError('Content Error', `Scene "${state.activeState.id}" not found in show. Please refresh the page.`);
        return;
      }

      this.showLoading('Loading show content...');
      return;
    }

    if (currentNode.type === 'scene') {
      this.showScene(currentNode);
    } else if (currentNode.type === 'fork') {
      this.showFork(currentNode, state.countdown, state.selectedChoiceIndex);
    } else {
      console.warn('Unknown node type:', currentNode.type);
      this.showError('Error', 'Unknown content type');
    }
  }

  private showLoading(message: string): void {
    this.cleanup();
    this.currentComponent = 'loading';
    this.loading.show(message);
  }

  private showError(title: string, message: string): void {
    this.cleanup();
    this.currentComponent = 'error';
    this.errorDisplay.show(title, message);
  }

  private showScene(node: any): void {
    if (this.currentComponent === 'scene' && this.scene) {
      // Update existing scene with transition
      this.scene.updateWithTransition(node);
      return;
    }

    this.cleanup();
    this.currentComponent = 'scene';

    this.scene = new Scene(this.container, this.config);
    this.scene.on('media_error', (error) => {
      console.error('❌ Scene media error:', error);
      // Don't show error for media issues, just continue with fallback
    });

    this.scene.render(node);
  }

  private showFork(node: any, countdown: number | null, selectedChoice: number | null): void {
    this.cleanup();
    this.currentComponent = 'fork';

    // Get voting state from state manager
    const state = this.stateManager.getState();
    const isVoting = state.isVoting;

    this.fork = new Fork(this.container);
    this.fork.on('choice_selected', (choiceIndex) => {
      this.stateManager.selectChoice(choiceIndex);
    });

    this.fork.render(node, countdown, isVoting);

    // Update selection and countdown if available
    if (selectedChoice !== null) {
      this.fork.updateSelection(selectedChoice);
    }
    if (countdown !== null) {
      this.fork.updateCountdown(countdown);
    }

    // Listen for voting state changes and update the fork component
    this.stateManager.on('state_changed', (newState) => {
      if (this.currentComponent === 'fork' && this.fork) {
        this.fork.updateVotingState(newState.isVoting);
      }
    });
  }

  private cleanup(): void {
    if (this.scene) {
      this.scene.destroy();
      this.scene = null;
    }
    
    if (this.fork) {
      this.fork.destroy();
      this.fork = null;
    }
    
    this.loading.hide();
    this.errorDisplay.hide();
  }
}
