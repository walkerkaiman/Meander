import { EventEmitter } from 'eventemitter3';
import { ActiveState } from 'conductor-types';
import { Level } from 'level';
import path from 'path';
import os from 'os';

// Assuming ShowPackage is a type that represents the validated show data structure
interface ShowPackage {
  metadata: { initialStateId: string };
  nodes: Record<string, any>;
}

interface VoteHistory {
  forkId: string;
  counts: [number, number];
  winnerIndex: 0 | 1;
  timestamp: number;
}

export class Sequencer {
  private currentState: ActiveState | null = null;
  private show: ShowPackage | null = null;
  private eventBus: EventEmitter;
  private db: Level<string, string>;
  private voteHistory: VoteHistory[] = [];
  private dataDir: string = process.env.DATA_DIR || path.join(os.homedir(), '.meander');
  private lastTransition: number = 0;
  private debounceMs: number = 300;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    // Initialize LevelDB
    this.db = new Level<string, string>(path.join(this.dataDir, 'conductor', 'db'), { valueEncoding: 'json' });
    this.loadStateFromDB();
  }

  private async loadStateFromDB(): Promise<void> {
    try {
      // Attempt to load the last saved state
      const savedState = await this.db.get('currentState');
      if (savedState) {
        this.currentState = JSON.parse(savedState);
        console.log('Loaded state from DB:', this.currentState);
      }

      // Load vote history if available
      const savedHistory = await this.db.get('voteHistory');
      if (savedHistory) {
        this.voteHistory = JSON.parse(savedHistory);
        console.log('Loaded vote history from DB:', this.voteHistory.length, 'entries');
      }
    } catch (error) {
      console.error('Failed to load state from DB:', error);
      // If no state is found or there's an error, we'll start fresh
    }
  }

  private async persistState(): Promise<void> {
    try {
      if (this.currentState) {
        await this.db.put('currentState', JSON.stringify(this.currentState));
      }
      await this.db.put('voteHistory', JSON.stringify(this.voteHistory));
    } catch (error) {
      console.error('Failed to persist state to DB:', error);
    }
  }

  public async loadShow(show: ShowPackage): Promise<void> {
    this.show = show;
    // If we don't have a current state from DB, initialize with the show's initial state
    if (!this.currentState) {
      this.currentState = {
        id: show.metadata.initialStateId,
        type: show.nodes[show.metadata.initialStateId]?.type === 'fork' ? 'fork' : 'scene',
      };
    }
    await this.persistState();
    // Emit state changed event
    if (this.currentState) {
      this.eventBus.emit('stateChanged', this.currentState);
    }
  }

  public advance(nextId: string): boolean {
    const now = Date.now();
    if (now - this.lastTransition < this.debounceMs) {
      console.log('Transition debounced');
      return false;
    }

    if (!this.show || !this.show.nodes[nextId]) {
      console.error('Unknown state or no show loaded:', nextId);
      this.eventBus.emit('sequenceError', { message: 'Unknown state or no show loaded', nextId });
      return false;
    }

    // Check for connections or next state logic if applicable
    // For now, we'll assume any state can be advanced to if it exists in nodes
    // In a real app, you'd validate connections here

    this.currentState = {
      id: nextId,
      type: this.show.nodes[nextId].type === 'fork' ? 'fork' : 'scene',
    };
    this.lastTransition = now;
    this.persistState();
    // Emit state changed event
    this.eventBus.emit('stateChanged', this.currentState);
    // Additional logic for OSC broadcasting can be triggered via eventBus
    return true;
  }

  public recordVoteHistory(forkId: string, counts: [number, number], winnerIndex: 0 | 1): void {
    const historyEntry: VoteHistory = {
      forkId,
      counts,
      winnerIndex,
      timestamp: Date.now(),
    };
    this.voteHistory.push(historyEntry);
    this.persistState();
  }

  public getCurrentState(): ActiveState | null {
    return this.currentState;
  }

  public getVoteHistory(): VoteHistory[] {
    return this.voteHistory;
  }
}
