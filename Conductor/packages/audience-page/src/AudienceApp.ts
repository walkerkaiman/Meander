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
    console.log('Starting Audience App...');
    
    // Show loading state
    this.showLoading('Connecting to show...');
    
    try {
      // Connect WebSocket
      this.wsManager.connect();
      
      // Try to get initial state
      await this.loadInitialState();
      
    } catch (error) {
      console.error('Failed to start app:', error);
      this.showError('Connection Failed', 'Unable to connect to the show. Please refresh the page to try again.');
    }
  }

  /**
   * Stop the application
   */
  stop(): void {
    console.log('Stopping Audience App...');
    
    this.wsManager.disconnect();
    this.cleanup();
  }

  private async loadInitialState(): Promise<void> {
    try {
      console.log('📚 Loading initial state...');

      // Try to load show graph first
      console.log('📖 Fetching show graph...');
      try {
        const graph = await this.apiManager.getShowGraph();
        console.log('📖 Graph loaded:', { nodeCount: graph.states?.length || 0 });
        this.stateManager.setShowGraph(graph);
      } catch (graphError: any) {
        if (graphError.message?.includes('404') || graphError.message?.includes('No show loaded')) {
          console.log('📖 No show loaded yet, will wait for showLoaded event');
        } else {
          console.warn('📖 Failed to load graph:', graphError);
        }
      }

      // Try to load current state
      console.log('🎬 Fetching active state...');
      try {
        const activeState = await this.apiManager.getShowState();
        console.log('🎬 Active state loaded:', activeState);
        this.stateManager.setActiveState(activeState);
      } catch (stateError: any) {
        if (stateError.message?.includes('503') || stateError.message?.includes('No show loaded')) {
          console.log('🎬 No show loaded yet, will wait for stateChanged events');
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
      console.log('📖 Fetching graph after show load...');
      const graph = await this.apiManager.getShowGraph();
      console.log('📖 Graph loaded after show load:', { nodeCount: graph.states?.length || 0 });
      console.log('📖 Graph states:', graph.states?.map((s: any) => ({ id: s.id, connections: s.connections })) || []);
      console.log('📖 Graph connections:', graph.connections?.map((c: any) => `${c.fromNodeId} -> ${c.toNodeId}`) || []);

      this.stateManager.setShowGraph(graph);
      console.log('📖 Graph set in state manager');

      // If we have an active state but no current node, try to update it now that we have the graph
      const state = this.stateManager.getState();
      if (state.activeState && !state.currentNode) {
        console.log('🔄 Updating current node now that graph is available');
        this.renderCurrentState();
      } else {
        console.log('🔄 Graph loaded, but already have current node or no active state');
      }
    } catch (error) {
      console.error('❌ Failed to fetch graph after show load:', error);
    }
  }

  private setupEventListeners(): void {
    // WebSocket events
    this.wsManager.on('connected', () => {
      console.log('WebSocket connected');
      this.stateManager.setConnectionStatus(true);
    });

    this.wsManager.on('disconnected', () => {
      console.log('WebSocket disconnected');
      this.stateManager.setConnectionStatus(false);
      this.showError('Connection Lost', 'Lost connection to the show. Attempting to reconnect...');
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
        console.log('🎭 Graph loaded, checking if we need to update display');
        const currentState = this.stateManager.getState();
        if (currentState.activeState && !currentState.currentNode) {
          console.log('🔄 Graph loaded after state, updating display');
          this.renderCurrentState();
        }
      }
    });

    this.stateManager.on('event', (event) => {
      console.log('State event:', event);

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
      console.log('Vote submitted:', payload);
    });

    this.voteManager.on('vote_failed', (error) => {
      console.error('Vote submission failed:', error);
      this.stateManager.setError('Failed to submit vote. Please try again.');
    });
  }

  private handleServerMessage(message: ServerMessage): void {
    console.log('📨 Received server message:', message);

    switch (message.type) {
      case 'stateChanged':
        const state = this.stateManager.getState();
        console.log('📊 State before processing:', {
          hasShowGraph: !!state.showGraph,
          activeStateId: state.activeState?.id,
          currentNode: !!state.currentNode
        });

        this.stateManager.setActiveState(message.payload);
        break;

      case 'showLoaded':
        console.log('🎭 Show loaded event received, fetching graph...');
        this.fetchGraphOnShowLoad();
        break;

      case 'voteTick':
        this.stateManager.setCountdown(message.payload.remainingSeconds);
        break;

      case 'voteResult':
        // Reset voting state when results come in
        console.log('Vote result:', message.payload);
        break;

      case 'timerTick':
        // Handle general timer tick if needed
        console.log('Timer tick:', message.payload);
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
    console.log('State changed:', state);
    
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

    console.log('🎭 Render Current State:', {
      hasActiveState: !!state.activeState,
      hasShowGraph: !!state.showGraph,
      activeStateId: state.activeState?.id,
      currentNode: state.currentNode,
      graphNodeCount: state.showGraph ? Object.keys(state.showGraph.nodes || {}).length : 0
    });

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

      console.log('No currentNode but state exists, waiting for graph update...');
      this.showLoading('Loading show content...');
      return;
    }

    if (currentNode.type === 'scene') {
      console.log('🎬 Showing scene:', currentNode.id, currentNode.title);
      this.showScene(currentNode);
    } else if (currentNode.type === 'fork') {
      console.log('🎯 Showing fork:', currentNode.id, currentNode.title);
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
    console.log('🎭 showScene called for node:', node.id, node.title);

    if (this.currentComponent === 'scene' && this.scene) {
      console.log('🎭 Updating existing scene with transition');
      // Update existing scene with transition
      this.scene.updateWithTransition(node);
      return;
    }

    console.log('🎭 Creating new Scene component');
    this.cleanup();
    this.currentComponent = 'scene';

    this.scene = new Scene(this.container, this.config);
    this.scene.on('media_error', (error) => {
      console.error('❌ Scene media error:', error);
      // Don't show error for media issues, just continue with fallback
    });

    console.log('🎭 Calling scene.render()');
    this.scene.render(node);
  }

  private showFork(node: any, countdown: number | null, selectedChoice: number | null): void {
    console.log('🎯 showFork called - countdown:', countdown, 'selectedChoice:', selectedChoice);
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
