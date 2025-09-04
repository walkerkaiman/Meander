import { create } from "zustand";
import { ActiveState } from "@meander/conductor-types";

interface ShowStore {
  nodes: any[]; // react-flow elements (to refine later)
  activeState: ActiveState | null;
  history: ActiveState[];
  validationErrors: unknown[];
  setShow: (nodes: any[]) => void;
  setActiveState: (state: ActiveState) => void;
  pushError: (err: unknown) => void;
  clearErrors: () => void;
}

export const useShowStore = create<ShowStore>((set) => ({
  nodes: [],
  activeState: null,
  history: [],
  validationErrors: [],
  setShow: (nodes) => set({ nodes }),
  setActiveState: (state) => set((s) => ({ activeState: state, history: [...s.history, state] })),
  pushError: (err) => set((s) => ({ validationErrors: [...s.validationErrors, err] })),
  clearErrors: () => set({ validationErrors: [] }),
}));
