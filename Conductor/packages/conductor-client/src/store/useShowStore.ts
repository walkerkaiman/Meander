import { create } from 'zustand';
import { ActiveState } from '@meander/conductor-types';

interface ShowData {
  openingNodeId: string;
  states: any[];
  connections: any[];
}

interface ShowStore {
  showData: ShowData | null;
  activeState: ActiveState | null;
  history: ActiveState[];
  validationErrors: unknown[];
  setShow: (data: ShowData) => void;
  setActiveState: (state: ActiveState) => void;
  pushError: (err: unknown) => void;
  clearErrors: () => void;
  advanceState: () => void;
  previousState: () => void;
  canAdvance: boolean;
  canGoBack: boolean;
}

export const useShowStore = create<ShowStore>((set, get) => ({
  showData: null,
  activeState: null,
  history: [],
  validationErrors: [],
  setShow: (data) => {
    const current = get().activeState;
    let active = current;
    if (!active) {
      const opening = data.states.find((s:any)=>s.id===data.openingNodeId)
        || data.states.find((s:any)=>s.type === 'opening')
        || data.states[0];
      active = opening ? { id: opening.id, type: opening.type } : null;
    }
    set({ 
      showData: data,
      activeState: active,
      history: active ? [{ id: active.id, type: active.type }] : [],
      canAdvance: active ? data.connections.some((c:any)=>c.fromNodeId===active.id) : false,
    });
  },
  setActiveState: (state) => set((s) => ({ activeState: state, history: [...s.history, state], canAdvance: true })),
  pushError: (err) => set((s) => ({ validationErrors: [...s.validationErrors, err] })),
  clearErrors: () => set({ validationErrors: [] }),
  advanceState: () => {
    const currentState = get().activeState;
    const showData = get().showData;
    if (!currentState || !showData) return;
    // find first connection where fromNodeId matches current
    const nextConn = showData.connections.find((c:any)=>c.fromNodeId===currentState.id);
    if (!nextConn) {
      set({ canAdvance:false });
      return;
    }
    const nextState = showData.states.find((s:any)=>s.id===nextConn.toNodeId);
    if (!nextState) {
      set({ canAdvance:false });
      return;
    }
    set((s)=>({
      activeState:{ id: nextState.id, type: nextState.type },
      history:[...s.history,{ id: nextState.id, type: nextState.type }],
      canAdvance: showData.connections.some((c:any)=>c.fromNodeId===nextState.id),
      canGoBack: true
    }));
  },
  previousState: () => {
    const history = get().history;
    if (history.length < 2) return; // No previous state to go back to
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];
    set((s) => ({ 
      activeState: previousState, 
      history: newHistory,
      canGoBack: newHistory.length > 1,
      canAdvance: true
    }));
  },
  canAdvance: false,
  canGoBack: false,
}));
