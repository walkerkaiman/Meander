import { create } from "zustand";
import { ActiveState, VoteResult } from "@meander/conductor-types";
import { getConductorSocket } from "../hooks/useConductorSocket";
import { useShowStore } from "../store/useShowStore";

async function fetchGraph() {
  try {
    const res = await fetch(`http://${location.hostname}:4000/audience/graph`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface EngineState {
  activeState: ActiveState | null;
  countdown: number | null;
  isVoting: boolean;
  voteResult: VoteResult | null;
  showSeconds: number;
  sceneSeconds: number;
  // Actions
  setActiveState: (s: ActiveState) => void;
  setCountdown: (seconds: number) => void;
  completeVote: (result: VoteResult) => void;
  setTimers: (show: number, scene: number) => void;
  advance: () => void;
  startVote: () => void;
}

export const useConductorEngine = create<EngineState>((set, get) => ({
  activeState: null,
  countdown: null,
  isVoting: false,
  voteResult: null,
  showSeconds: 0,
  sceneSeconds: 0,

  // --- mutators used by other hooks ---
  setActiveState: async (s) => {
    console.log('🎯 setActiveState called with:', s);
    set({ activeState: s, isVoting: false, countdown: null, voteResult: null });
    console.log('✅ Engine state updated to:', s);

    // mirror to show store so Canvas highlights correctly
    try {
      const store = useShowStore.getState();
      console.log('🔄 Setting active state in show store');
      store.setActiveState(s);
      console.log('✅ Show store updated');

      // Only fetch graph if we have no showData at all (not just empty states)
      // This prevents graph fetching from interfering with advancement
      if (!store.showData) {
        console.log('📊 Fetching graph because no showData exists');
        console.log('📊 Current activeState in store during fetch:', store.activeState);
        const graph = await fetchGraph();
        if (graph) {
          const currentStore = useShowStore.getState();
          console.log('📊 After fetch, current activeState in store:', currentStore.activeState);
          // Double-check that we still don't have showData to prevent race conditions
          if (!currentStore.showData) {
            console.log('📊 Applying fetched graph to store');
            currentStore.setShow(graph);
          } else {
            console.log('📊 Graph already exists, skipping apply');
          }
        }
      } else {
        console.log('📊 Show data already exists, skipping graph fetch');
        console.log('📊 Current showData states count:', store.showData.states?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error in setActiveState:', error);
    }
  },
  setCountdown: (seconds) => set({ countdown: seconds, isVoting: true }),
  completeVote: (result) => set({ voteResult: result, isVoting: false, countdown: null }),

  setTimers: (show, scene) => set({ showSeconds: show, sceneSeconds: scene }),

  // --- public advance API used by UI ---
  advance: () => {
    const { activeState } = get();
    console.log('🚀 Advance button clicked, current state:', activeState);

    if (!activeState) {
      console.log('❌ No active state to advance from');
      return;
    }

    if (activeState.type === "scene" || activeState.type === "fork") {
      console.log('📤 Making HTTP POST to /advance for', activeState.type, ':', activeState.id);
      // Manual advance via REST call (works for both scenes and forks)
      fetch(`http://${location.hostname}:4000/advance`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log('📥 Advance HTTP response:', response.status);
        if (!response.ok) {
          console.error('❌ Advance HTTP request failed:', response.status, response.statusText);
        }
      })
      .catch(error => {
        console.error('❌ Advance HTTP request error:', error);
      });
    } else {
      console.log('❓ Unknown state type:', activeState.type);
    }
  },

  // --- public start vote API used by UI ---
  startVote: () => {
    const { activeState } = get();
    console.log('🗳️ Start Vote button clicked, current state:', activeState);

    if (!activeState || activeState.type !== "fork") {
      console.log('❌ Not in a fork state, cannot start vote');
      return;
    }

    console.log('📤 Sending WebSocket startVote for fork:', activeState.id);
    // Initiate vote via websocket
    const ws = getConductorSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "startVote",
          payload: { forkId: activeState.id },
        })
      );
      // Engine now in voting mode; countdown will come from server
      set({ isVoting: true, voteResult: null });
      console.log('✅ Vote started for fork:', activeState.id);
    } else {
      console.error('❌ WebSocket not connected for vote initiation');
    }
  },
}));
