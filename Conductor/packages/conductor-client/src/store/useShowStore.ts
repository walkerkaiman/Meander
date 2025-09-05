import { create } from 'zustand';
import { ActiveState } from '@meander/conductor-types';

interface ShowData {
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
  setShow: (data) => set({ showData: data }),
  setActiveState: (state) => set((s) => ({ activeState: state, history: [...s.history, state], canAdvance: true })),
  pushError: (err) => set((s) => ({ validationErrors: [...s.validationErrors, err] })),
  clearErrors: () => set({ validationErrors: [] }),
  advanceState: () => {
    const currentState = get().activeState;
    const showData = get().showData;
    if (!currentState || !showData) return;
    // Placeholder logic for advancing state
    // In a real implementation, this would find the next state based on connections
    const currentIndex = showData.states.findIndex(s => s.id === currentState.id);
    if (currentIndex < showData.states.length - 1) {
      const nextState = showData.states[currentIndex + 1];
      set((s) => ({ 
        activeState: { id: nextState.id, type: nextState.type }, 
        history: [...s.history, { id: nextState.id, type: nextState.type }],
        canAdvance: currentIndex + 1 < showData.states.length - 1,
        canGoBack: true
      }));
    } else {
      set({ canAdvance: false });
    }
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
