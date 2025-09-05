import express from 'express';
import { z } from 'zod';
import { serverEventBus } from '../eventBus';
import { Sequencer } from '../sequencer';

// Define schemas for request validation
const voteSchema = z.object({
  showId: z.string(),
  forkId: z.string(),
  choiceIndex: z.union([z.literal(0), z.literal(1)]),
  deviceId: z.string(),
});

export const audienceRouter = express.Router();

// In-memory storage for votes - in a real app, this would be a database
interface Vote {
  forkId: string;
  choiceIndex: 0 | 1;
  deviceId: string;
  timestamp: number;
}

let votes: Vote[] = [];
const sequencer = new Sequencer(serverEventBus);

// GET /audience/show - Get current show state
audienceRouter.get('/show', (req, res) => {
  const currentState = sequencer.getCurrentState();
  if (!currentState) {
    return res.status(404).json({ error: 'No show loaded' });
  }
  return res.json({
    id: currentState.id,
    type: currentState.type,
  });
});

// POST /audience/vote - Record a vote
// This endpoint is rate-limited by middleware in index.ts
audienceRouter.post('/vote', (req, res) => {
  const result = voteSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error });
  }

  const { forkId, choiceIndex, deviceId } = result.data;

  // Check if this device has already voted for this fork
  const existingVoteIndex = votes.findIndex(v => v.forkId === forkId && v.deviceId === deviceId);
  if (existingVoteIndex !== -1) {
    // Update existing vote (idempotent)
    votes[existingVoteIndex] = { forkId, choiceIndex, deviceId, timestamp: Date.now() };
  } else {
    // Add new vote
    votes.push({ forkId, choiceIndex, deviceId, timestamp: Date.now() });
  }

  // For simplicity, we're doing aggregation on every vote
  // In a real app, you'd have a more sophisticated mechanism (e.g., periodic aggregation or triggered by a countdown)
  aggregateVotes(forkId);

  return res.status(202).json({ success: true });
});

function aggregateVotes(forkId: string) {
  // Filter votes for this fork
  const forkVotes = votes.filter(v => v.forkId === forkId);

  if (forkVotes.length === 0) {
    return;
  }

  // Count votes for each choice
  const counts: [number, number] = [0, 0];
  forkVotes.forEach(vote => {
    counts[vote.choiceIndex]++;
  });

  // Determine winner - in case of a tie, default to choice index 0
  let winnerIndex: 0 | 1 = 0;
  if (counts[1] > counts[0]) {
    winnerIndex = 1;
  }

  // Record the result in history
  sequencer.recordVoteHistory(forkId, counts, winnerIndex);

  // Emit event for real-time updates (e.g., to UI or other services)
  serverEventBus.emit('voteResult', {
    forkId,
    counts,
    winnerIndex,
  });

  // Optionally, trigger advancement to the next state based on the vote result
  // This would depend on your specific logic for when to advance (e.g., after a countdown)
  // const nextStateId = determineNextStateBasedOnVote(forkId, winnerIndex);
  // if (nextStateId) {
  //   sequencer.advance(nextStateId);
  // }
}

