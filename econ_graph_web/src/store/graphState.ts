/**
 * Graph state store - manages graph-specific UI state
 * Positions, zoom, edges (local for MVP)
 */

import { create } from 'zustand';
import type { GraphViewport, GraphEdge } from '../lib/types';

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface GraphState {
  // Node positions (local, not persisted)
  nodePositions: Map<string, { x: number; y: number }>;
  setNodePosition: (id: string, x: number, y: number) => void;
  setNodePositions: (positions: NodePosition[]) => void;
  getNodePosition: (id: string) => { x: number; y: number } | undefined;
  // Undo snapshot for layout
  lastPositionsSnapshot: Map<string, { x: number; y: number }> | null;
  pushPositionsSnapshot: (positions: NodePosition[]) => void;
  restoreLastPositions: () => void;

  // Edges (local for MVP)
  edges: GraphEdge[];
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (edgeId: string) => void;
  setEdges: (edges: GraphEdge[]) => void;

  // Viewport
  viewport: GraphViewport;
  setViewport: (viewport: GraphViewport) => void;

  // Layout state
  layoutInProgress: boolean;
  setLayoutInProgress: (inProgress: boolean) => void;

  // Focus management
  focusNodeId: string | null;
  setFocusNodeId: (id: string | null) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodePositions: new Map(),
  lastPositionsSnapshot: null,
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  layoutInProgress: false,
  focusNodeId: null,

  setNodePosition: (id, x, y) =>
    set((state) => {
      const newPositions = new Map(state.nodePositions);
      newPositions.set(id, { x, y });
      return { nodePositions: newPositions };
    }),

  setNodePositions: (positions) =>
    set(() => {
      const newPositions = new Map();
      positions.forEach((pos) => {
        newPositions.set(pos.id, { x: pos.x, y: pos.y });
      });
      return { nodePositions: newPositions };
    }),

  pushPositionsSnapshot: (positions) =>
    set(() => {
      const snap = new Map<string, { x: number; y: number }>();
      positions.forEach((p) => snap.set(p.id, { x: p.x, y: p.y }));
      return { lastPositionsSnapshot: snap };
    }),

  restoreLastPositions: () =>
    set((state) => {
      if (!state.lastPositionsSnapshot) return {} as any;
      return { nodePositions: new Map(state.lastPositionsSnapshot), lastPositionsSnapshot: null } as any;
    }),

  getNodePosition: (id) => get().nodePositions.get(id),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    })),

  setEdges: (edges) => set({ edges }),

  setViewport: (viewport) => set({ viewport }),

  setLayoutInProgress: (inProgress) => set({ layoutInProgress: inProgress }),

  setFocusNodeId: (id) => set({ focusNodeId: id }),
}));
