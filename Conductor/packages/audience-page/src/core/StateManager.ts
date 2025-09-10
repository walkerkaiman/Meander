import { EventEmitter } from './EventEmitter';
import { DeviceManager } from './DeviceManager';
import { AudienceState, AudienceEvent, ActiveState, ShowPackage, SceneNode, ForkNode } from '../types/index';

/**
 * Manages the global application state
 */
export class StateManager extends EventEmitter<Record<string, AudienceEvent>> {
  private state: AudienceState;
  private deviceManager: DeviceManager;

  constructor() {
    super();
    this.deviceManager = DeviceManager.getInstance();
    this.state = this.getInitialState();
  }

  private getInitialState(): AudienceState {
    return {
      isConnected: false,
      activeState: null,
      showGraph: null,
      currentNode: null,
      countdown: null,
      isVoting: false,
      selectedChoiceIndex: null,
      voteSent: false,
      deviceId: this.deviceManager.getDeviceId(),
      error: null
    };
  }

  /**
   * Get current state (immutable)
   */
  getState(): Readonly<AudienceState> {
    return { ...this.state };
  }

  /**
   * Update connection status
   */
  setConnectionStatus(isConnected: boolean): void {
    this.state.isConnected = isConnected;
    this.emit('state_changed', this.getState());
    
    if (isConnected) {
      this.emit('event', { type: 'connection_established' });
    } else {
      this.emit('event', { type: 'connection_lost' });
    }
  }

  /**
   * Update active state from server
   */
  setActiveState(activeState: ActiveState): void {
    const previousState = this.state.activeState;
    this.state.activeState = activeState;
    this.state.error = null;

    // Reset voting state when state changes
    this.resetVotingState();

    // Update current node if we have the graph
    this.updateCurrentNode();

    // Trigger vibration on fork entry
    if (activeState.type === 'fork' && previousState?.id !== activeState.id) {
      this.deviceManager.vibrate(100);
    }

    this.emit('state_changed', this.getState());
    this.emit('event', { type: 'state_updated', payload: activeState });
  }

  /**
   * Set the show graph
   */
  setShowGraph(graph: ShowPackage): void {

    // Handle both old format (states array) and new format (nodes object)
    if (graph.states && !graph.nodes) {
      const nodes: Record<string, any> = {};
      for (const state of graph.states) {
        nodes[state.id] = { ...state };
      }
      graph = {
        ...graph,
        nodes
      };
    }

    this.state.showGraph = graph;
    this.updateCurrentNode();
    this.emit('state_changed', this.getState());
    this.emit('event', { type: 'graph_loaded', payload: graph });
  }

  /**
   * Update countdown timer
   */
  setCountdown(seconds: number): void {
    const previousCountdown = this.state.countdown;
    const previousIsVoting = this.state.isVoting;

    this.state.countdown = seconds;
    this.state.isVoting = seconds > 0;

    // Auto-submit vote when timer reaches 0
    if (seconds === 0 && !this.state.voteSent) {
      this.submitCurrentVote();
    }

    // Only emit state_changed if voting state actually changed (not just countdown number)
    if (previousIsVoting !== this.state.isVoting) {
      this.emit('state_changed', this.getState());
    }

    // Always emit countdown update for components that need to know the exact countdown value
    this.emit('countdown_updated', seconds);
  }

  /**
   * Select a choice for voting
   */
  selectChoice(choiceIndex: number): void {
    if (!this.state.isVoting || this.state.voteSent) {
      return;
    }

    this.state.selectedChoiceIndex = choiceIndex;
    this.emit('state_changed', this.getState());
    this.emit('event', { type: 'choice_selected', payload: choiceIndex });

    // Optional haptic feedback
    this.deviceManager.vibrate(50);
  }

  /**
   * Mark vote as submitted
   */
  markVoteSubmitted(): void {
    this.state.voteSent = true;
    this.emit('state_changed', this.getState());
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.state.error = error;
    this.emit('state_changed', this.getState());
    this.emit('event', { type: 'error_occurred', payload: error });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.state.error = null;
    this.emit('state_changed', this.getState());
  }

  /**
   * Reset voting-related state
   */
  private resetVotingState(): void {
    this.state.countdown = null;
    this.state.isVoting = false;
    this.state.selectedChoiceIndex = null;
    this.state.voteSent = false;
  }

  /**
   * Update current node based on active state and graph
   */
  private updateCurrentNode(): void {

    if (!this.state.activeState || !this.state.showGraph) {
      this.state.currentNode = null;
      return;
    }

    const nodeId = this.state.activeState.id;

    // Check if the node exists in the graph
    if (!this.state.showGraph.nodes || !this.state.showGraph.nodes[nodeId]) {
      console.warn(`Node ${nodeId} not found in show graph. Available nodes:`, this.state.showGraph.nodes ? Object.keys(this.state.showGraph.nodes) : 'none');
      this.state.currentNode = null;
      return;
    }

    this.state.currentNode = this.state.showGraph.nodes[nodeId];
  }

  /**
   * Submit current vote (called automatically when timer expires)
   */
  private submitCurrentVote(): void {
    if (this.state.voteSent || !this.state.activeState) {
      return;
    }

    // Even if no choice selected, we submit with null/undefined to indicate "no vote"
    const choiceIndex = this.state.selectedChoiceIndex;
    
    this.emit('vote_submit', {
      choiceIndex,
      forkId: this.state.activeState.id
    });
  }

  /**
   * Get current node as Scene
   */
  getCurrentSceneNode(): SceneNode | null {
    return this.state.currentNode?.type === 'scene' ? this.state.currentNode as SceneNode : null;
  }

  /**
   * Get current node as Fork
   */
  getCurrentForkNode(): ForkNode | null {
    return this.state.currentNode?.type === 'fork' ? this.state.currentNode as ForkNode : null;
  }
}
