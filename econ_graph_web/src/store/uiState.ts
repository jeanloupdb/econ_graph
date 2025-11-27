/**
 * UI state store - manages interaction modes, panels, and selection
 * Using Zustand for lightweight state management
 */

import { create } from 'zustand';
import type { InteractionMode } from '../lib/types';

interface UIState {
  // Interaction mode (always 'select')
  mode: InteractionMode;

  // Panel visibility
  inspectorOpen: boolean;
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  scenarioPanelOpen: boolean;
  setScenarioPanelOpen: (open: boolean) => void;

  // Node selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Edge selection
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;

  // Multi-edge selection (for grouped edges)
  selectedEdgeIds: string[];
  setSelectedEdgeIds: (ids: string[]) => void;

  // Multi-selection (for lasso mode)
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  addSelectedNode: (id: string) => void;
  removeSelectedNode: (id: string) => void;
  clearSelection: () => void;

  // Connection mode state
  connectionSource: string | null;
  setConnectionSource: (id: string | null) => void;

  // Presentation mode
  presentationMode: boolean;
  togglePresentationMode: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Side panel stack (navigation within sidebar)
  panelStack: Array<{ key: string; title: string; type: string; props?: any }>;
  pushPanel: (panel: { key?: string; title: string; type: string; props?: any }) => void;
  popPanel: () => void;
  clearPanels: () => void;

  // Resizable sidebar width
  sidePanelWidth: number; // in px
  setSidePanelWidth: (px: number) => void;

  // Scenario panel highlight (focus specific param card)
  scenarioPanelHighlightId: string | null;
  setScenarioPanelHighlight: (nodeId: string | null) => void;

  // Reset helpers
  resetDetailPanels: () => void;

  // Recently highlighted node (transient halo)
  highlightedNodeId: string | null;
  flashNodeHighlight: (nodeId: string | null, durationMs?: number) => void;

  // Computing state (reload/refresh)
  isComputing: boolean;
  setIsComputing: (isComputing: boolean) => void;
}

let highlightTimeout: number | null = null;

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  mode: 'select',
  inspectorOpen: true,
  scenarioPanelOpen: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedEdgeIds: [],
  selectedNodeIds: [],
  connectionSource: null,
  presentationMode: false,
  commandPaletteOpen: false,
  panelStack: [],
  sidePanelWidth: 448, // ~28rem default
  scenarioPanelHighlightId: null,
  highlightedNodeId: null,
  isComputing: false,

  // Actions
  toggleInspector: () =>
    set((state) => ({
      inspectorOpen: !state.inspectorOpen,
      // If we are opening the inspector, close the scenario panel
      scenarioPanelOpen: state.inspectorOpen ? state.scenarioPanelOpen : false,
    })),
  setInspectorOpen: (open) =>
    set((state) => ({
      inspectorOpen: open,
      // Opening the inspector closes the scenario panel; closing it leaves scenario state unchanged
      scenarioPanelOpen: open ? false : state.scenarioPanelOpen,
    })),
  setScenarioPanelOpen: (open) =>
    set((state) => ({
      scenarioPanelOpen: open,
      // Opening the scenario panel closes the inspector and clears current selection
      inspectorOpen: open ? false : state.inspectorOpen,
      selectedNodeId: open ? null : state.selectedNodeId,
      selectedEdgeId: open ? null : state.selectedEdgeId,
      selectedEdgeIds: open ? [] : state.selectedEdgeIds,
    })),

  setSelectedNodeId: (id) =>
    set((state) => ({
      selectedNodeId: id,
      selectedEdgeId: null, // Clear edge selection when selecting a node
      inspectorOpen: id !== null,
      // Selecting a node re-focuses on the inspector
      scenarioPanelOpen: id !== null ? false : state.scenarioPanelOpen,
      // Reset panel navigation when selecting a node directly
      panelStack: id ? [] as any : state.panelStack,
    })),

  setSelectedEdgeId: (id) =>
    set((state) => ({
      selectedEdgeId: id,
      selectedEdgeIds: id ? [id] : [], // Also set multi-selection for consistency
      selectedNodeId: null, // Clear node selection when selecting an edge
      inspectorOpen: id !== null,
      scenarioPanelOpen: id !== null ? false : state.scenarioPanelOpen,
    })),

  setSelectedEdgeIds: (ids) =>
    set((state) => ({
      selectedEdgeIds: ids,
      selectedEdgeId: ids.length > 0 ? ids[0] : null, // Set first edge as primary
      selectedNodeId: null,
      inspectorOpen: ids.length > 0,
      scenarioPanelOpen: ids.length > 0 ? false : state.scenarioPanelOpen,
    })),

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  addSelectedNode: (id) =>
    set((state) => ({
      selectedNodeIds: [...state.selectedNodeIds, id],
    })),
  removeSelectedNode: (id) =>
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.filter((nodeId) => nodeId !== id),
    })),
  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedEdgeIds: [],
      selectedNodeIds: [],
    }),

  setConnectionSource: (id) => set({ connectionSource: id }),

  togglePresentationMode: () =>
    set((state) => ({
      presentationMode: !state.presentationMode,
      inspectorOpen: state.presentationMode ? true : false,
      // Leaving presentation mode re-opens the inspector, not the scenario panel
      scenarioPanelOpen: state.presentationMode ? false : state.scenarioPanelOpen,
    })),

  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  pushPanel: (panel) =>
    set((state) => {
      const next = { key: panel.key || `${panel.type}-${Date.now()}`, ...panel } as any;
      const top = state.panelStack[state.panelStack.length - 1];
      // Avoid stacking identical panels (same type and same main identifier like nodeId)
      const sameType = top && top.type === next.type;
      const sameNode = top && top.props?.nodeId && next.props?.nodeId && top.props.nodeId === next.props.nodeId;
      if (sameType && sameNode) {
        return { inspectorOpen: true } as any; // no change to stack
      }
      return {
        panelStack: [...state.panelStack, next],
        inspectorOpen: true,
      } as any;
    }),
  popPanel: () =>
    set((state) => ({ panelStack: state.panelStack.slice(0, -1) })),
  clearPanels: () => set({ panelStack: [] }),

  setSidePanelWidth: (px) =>
    set({ sidePanelWidth: Math.max(320, Math.min(px, 560)) }),

  setScenarioPanelHighlight: (nodeId) => set({ scenarioPanelHighlightId: nodeId }),

  flashNodeHighlight: (nodeId, durationMs = 2400) => {
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
      highlightTimeout = null;
    }
    set({ highlightedNodeId: nodeId });
    if (!nodeId) {
      return;
    }
    if (typeof window !== 'undefined') {
      highlightTimeout = window.setTimeout(() => {
        set({ highlightedNodeId: null });
        highlightTimeout = null;
      }, durationMs);
    }
  },

  resetDetailPanels: () =>
    set(() => ({
      inspectorOpen: false,
      scenarioPanelOpen: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedEdgeIds: [],
      selectedNodeIds: [],
      connectionSource: null,
      panelStack: [],
      scenarioPanelHighlightId: null,
      highlightedNodeId: null,
    })),

  setIsComputing: (isComputing) => set({ isComputing }),
}));
