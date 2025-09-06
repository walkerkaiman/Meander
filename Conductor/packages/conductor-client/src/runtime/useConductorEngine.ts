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
  // Actions
  setActiveState: (s: ActiveState) => void;
  setCountdown: (seconds: number) => void;
  completeVote: (result: VoteResult) => void;
  advance: () => void;
}

export const useConductorEngine = create<EngineState>((set, get) => ({
  activeState: null,
  countdown: null,
  isVoting: false,
  voteResult: null,

  // --- mutators used by other hooks ---
  setActiveState: async (s) => {
    set({ activeState: s, isVoting: false, countdown: null, voteResult: null });
    // mirror to show store so Canvas highlights correctly
    try {
      const store = useShowStore.getState();
      store.setActiveState(s);
      if (!store.showData || store.showData.states.length === 0) {
        const graph = await fetchGraph();
        if (graph) store.setShow(graph);
      }
    } catch (_) {}
  },
  setCountdown: (seconds) => set({ countdown: seconds, isVoting: true }),
  completeVote: (result) => set({ voteResult: result, isVoting: false, countdown: null }),

  // --- public advance API used by UI ---
  advance: () => {
    const { activeState } = get();
    if (!activeState) return;

    if (activeState.type === "scene") {
      // Manual scene advance via REST call
      fetch(`http://${location.hostname}:4000/advance`, { method: "POST" }).catch(() => {});
    } else if (activeState.type === "fork") {
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
      }
    }
  },
}));
