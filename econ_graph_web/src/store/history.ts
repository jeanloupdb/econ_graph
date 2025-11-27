/**
 * History store - implements undo/redo for UI actions
 * Tracks local graph modifications for better UX
 */

import { create } from 'zustand';

export type HistoryAction =
  | { type: 'node_position'; nodeId: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'edge_add'; edge: { id: string; source: string; target: string } }
  | { type: 'edge_remove'; edge: { id: string; source: string; target: string } }
  | { type: 'node_select'; from: string | null; to: string | null }
  | { type: 'viewport'; from: { x: number; y: number; zoom: number }; to: { x: number; y: number; zoom: number } };

interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];

  // Actions
  addAction: (action: HistoryAction) => void;
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;
  clear: () => void;

  // State
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY_SIZE = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  addAction: (action) =>
    set((state) => {
      const newPast = [...state.past, action];
      // Keep history size manageable
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }
      return {
        past: newPast,
        future: [], // Clear future when new action is added
        canUndo: true,
        canRedo: false,
      };
    }),

  undo: () => {
    const state = get();
    if (state.past.length === 0) return null;

    const action = state.past[state.past.length - 1];
    set({
      past: state.past.slice(0, -1),
      future: [action, ...state.future],
      canUndo: state.past.length > 1,
      canRedo: true,
    });

    return action;
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return null;

    const action = state.future[0];
    set({
      past: [...state.past, action],
      future: state.future.slice(1),
      canUndo: true,
      canRedo: state.future.length > 1,
    });

    return action;
  },

  clear: () =>
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    }),
}));
