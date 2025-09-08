import { VotePayload } from '../types/conductor-types';
import { ApiManager } from './WebSocketManager';
import { StateManager } from './StateManager';
import { EventEmitter } from './EventEmitter';

/**
 * Manages vote submission logic
 */
export class VoteManager extends EventEmitter<{
  vote_submitted: VotePayload;
  vote_failed: Error;
}> {
  private apiManager: ApiManager;
  private stateManager: StateManager;

  constructor(apiManager: ApiManager, stateManager: StateManager) {
    super();
    this.apiManager = apiManager;
    this.stateManager = stateManager;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for vote submission requests from state manager
    this.stateManager.on('vote_submit', (data: { choiceIndex: number | null; forkId: string }) => {
      this.submitVote(data.choiceIndex, data.forkId);
    });
  }

  /**
   * Submit a vote for the given choice
   */
  private async submitVote(choiceIndex: number | null, forkId: string): Promise<void> {
    const state = this.stateManager.getState();
    
    // Don't submit if already submitted
    if (state.voteSent) {
      return;
    }

    // Create vote payload
    const votePayload: VotePayload = {
      showId: 'local', // Using 'local' as per existing implementation
      forkId,
      choiceIndex: choiceIndex !== null ? (choiceIndex as 0 | 1) : 0, // Default to 0 for "no vote"
      deviceId: state.deviceId
    };


    try {
      // Mark as submitted immediately to prevent double submission
      this.stateManager.markVoteSubmitted();
      
      await this.apiManager.submitVote(votePayload);
      
      this.emit('vote_submitted', votePayload);
      
    } catch (error) {
      console.error('Failed to submit vote:', error);
      this.emit('vote_failed', error as Error);
      
      // Reset vote submitted status on failure so user can try again
      // Note: This could lead to double votes, but it's better than losing votes
      // The server should handle deduplication based on deviceId + forkId
    }
  }

  /**
   * Manually trigger vote submission (for testing or manual submission)
   */
  public manualSubmit(choiceIndex: number | null = null): void {
    const state = this.stateManager.getState();
    
    if (!state.activeState || state.activeState.type !== 'fork') {
      console.warn('Cannot submit vote: not in fork state');
      return;
    }

    const selectedIndex = choiceIndex ?? state.selectedChoiceIndex;
    this.submitVote(selectedIndex, state.activeState.id);
  }
}
