/**
 * UI state store - manages interaction modes, panels, and selection
 * Using Zustand for lightweight state management
 */

import { create } from 'zustand';
import type { InteractionMode, ViewMode } from '../lib/types';

interface UIState {
  // Interaction mode (always 'select')
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;

  // View mode (baseline, scenario, comparison)
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Panel visibility
  inspectorOpen: boolean;
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  scenarioPanelOpen: boolean;
  setScenarioPanelOpen: (open: boolean) => void;
  libraryPanelOpen: boolean;
  toggleLibraryPanel: () => void;
  setLibraryPanelOpen: (open: boolean) => void;

  // Node selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectNodeWithoutInspector: (id: string | null) => void;

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

  // AI Assistant visibility
  aiAssistantOpen: boolean;
  setAiAssistantOpen: (open: boolean) => void;
  aiPromptPrefill: string;
  setAiPromptPrefill: (text: string) => void;

  // Computing state (reload/refresh)
  isComputing: boolean;
  setIsComputing: (isComputing: boolean) => void;

  // Edit Node Modal
  editNodeModalOpen: boolean;
  setEditNodeModalOpen: (open: boolean) => void;

  // Developer Mode (vs Visualizer)
  developerMode: boolean;
  setDeveloperMode: (mode: boolean) => void;

  // Node Editor State
  nodeEditorMode: 'create' | 'edit' | 'create-api' | 'edit-api' | null;
  setNodeEditorMode: (mode: 'create' | 'edit' | 'create-api' | 'edit-api' | null) => void;
  nodeEditorNodeId: string | null;
  setNodeEditorNodeId: (id: string | null) => void;
  nodeEditorFullscreenOpen: boolean;
  setNodeEditorFullscreenOpen: (open: boolean) => void;

  // Node Creation Draft
  nodeCreationDraft: {
    label: string;
    unit: string;
    notes: string;
    code: string;
    slug: string;
    url: string;
    jsonPath: string;
  };
  setNodeCreationDraft: (draft: Partial<UIState['nodeCreationDraft']>) => void;
  resetNodeCreationDraft: () => void;
}

let highlightTimeout: number | null = null;

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  mode: 'select',
  viewMode: 'baseline',
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
  aiAssistantOpen: false,
  aiPromptPrefill: '',
  isComputing: false,
  editNodeModalOpen: false,
  developerMode: true,

  // Node Editor State
  nodeEditorMode: null,
  nodeEditorNodeId: null,
  nodeEditorFullscreenOpen: false,
  setNodeEditorMode: (mode) => set({ nodeEditorMode: mode }),
  setNodeEditorNodeId: (id) => set({ nodeEditorNodeId: id }),
  setNodeEditorFullscreenOpen: (open) => set({ nodeEditorFullscreenOpen: open }),

  // Node Creation Draft
  nodeCreationDraft: {
    label: '',
    unit: '',
    notes: '',
    code: '',
    slug: '',
    url: '',
    jsonPath: '',
  },
  setNodeCreationDraft: (draft) => set((state) => ({ nodeCreationDraft: { ...state.nodeCreationDraft, ...draft } })),
  resetNodeCreationDraft: () => set({
    nodeCreationDraft: {
      label: '',
      unit: '',
      notes: '',
      code: '',
      slug: '',
      url: '',
      jsonPath: '',
    }
  }),

  // Actions
  setMode: (mode) => set({ mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setDeveloperMode: (mode) => set({ developerMode: mode }),
  setEditNodeModalOpen: (open) => set({ editNodeModalOpen: open }),
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
      libraryPanelOpen: open ? false : state.libraryPanelOpen,
    })),

  libraryPanelOpen: false,
  toggleLibraryPanel: () =>
    set((state) => ({
      libraryPanelOpen: !state.libraryPanelOpen,
      // If opening library, close other panels? Maybe not, library is on the left usually.
      // But for now let's keep it independent or maybe close inspector if it's too crowded?
      // Let's keep it independent for now as it's likely on the left.
    })),
  setLibraryPanelOpen: (open) => set({ libraryPanelOpen: open }),

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

  selectNodeWithoutInspector: (id: string | null) =>
    set((state) => ({
      selectedNodeId: id,
      selectedEdgeId: null, // Clear edge selection when selecting a node
      // Don't open inspector, keep current state
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
      aiAssistantOpen: false,
    })),

  setAiAssistantOpen: (open) => set({ aiAssistantOpen: open }),
  setAiPromptPrefill: (text) => set({ aiPromptPrefill: text }),

  setIsComputing: (isComputing) => set({ isComputing }),
}));
