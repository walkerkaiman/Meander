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
    console.log('📊 setShow called with graph data');
    const current = get().activeState;
    console.log('📊 Current active state in store:', current);

    let active = current;
    if (!active) {
      console.log('📊 No current active state, setting to opening node');
      const opening = data.states.find((s:any)=>s.id===data.openingNodeId)
        || data.states.find((s:any)=>s.type === 'opening')
        || data.states[0];
      active = opening ? { id: opening.id, type: opening.type } : null;
      console.log('📊 Opening node found:', active);
    } else {
      console.log('📊 Preserving existing active state:', active);
    }

    set({
      showData: data,
      activeState: active,
      history: active ? [{ id: active.id, type: active.type }] : [],
      canAdvance: active ? data.connections.some((c:any)=>c.fromNodeId===active.id) : false,
    });
    console.log('📊 setShow completed, final activeState:', active);
  },
  setActiveState: (state) => {
    console.log('🎭 ShowStore setActiveState called with:', state);
    set((s) => {
      console.log('🔄 ShowStore updating from:', s.activeState, 'to:', state);
      return { activeState: state, history: [...s.history, state], canAdvance: true };
    });
    console.log('✅ ShowStore activeState updated');
  },
  pushError: (err) => set((s) => ({ validationErrors: [...s.validationErrors, err] })),
  clearErrors: () => set({ validationErrors: [] }),
  advanceState: () => {
    console.log('🔄 advanceState called (optimistic UI update)');
    const currentState = get().activeState;
    const showData = get().showData;
    console.log('🔄 Current state:', currentState, 'showData exists:', !!showData);

    if (!currentState || !showData) {
      console.log('❌ Missing currentState or showData');
      return;
    }

    // Find current state in states array to get its connections
    const currentStateData = showData.states.find((s:any)=>s.id===currentState.id);
    console.log('🔄 Current state data:', currentStateData);

    if (!currentStateData) {
      console.log('❌ Current state not found in states array');
      set({ canAdvance:false });
      return;
    }

    // Use connections from the current state (new format)
    let nextStateId = null;
    if (currentStateData.connections && currentStateData.connections.length > 0) {
      nextStateId = currentStateData.connections[0];
      console.log('🔄 Using connection from state:', nextStateId);
    } else {
      // Fallback to old connection format
      const nextConn = showData.connections.find((c:any)=>c.fromNodeId===currentState.id);
      if (nextConn) {
        nextStateId = nextConn.toNodeId;
        console.log('🔄 Using connection from graph (fallback):', nextStateId);
      }
    }

    if (!nextStateId) {
      console.log('❌ No next state found');
      set({ canAdvance:false });
      return;
    }

    const nextState = showData.states.find((s:any)=>s.id===nextStateId);
    console.log('🔄 Found next state:', nextState);
    if (!nextState) {
      console.log('❌ Next state not found in states array');
      set({ canAdvance:false });
      return;
    }

    console.log('✅ Optimistically advancing to:', nextState.id, nextState.type);
    set((s)=>({
      activeState:{ id: nextState.id, type: nextState.type },
      history:[...s.history,{ id: nextState.id, type: nextState.type }],
      canAdvance: showData.connections.some((c:any)=>c.fromNodeId===nextState.id) ||
                  (nextState.connections && nextState.connections.length > 0),
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
