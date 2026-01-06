/**
 * Zustand store for scenario management.
 *
 * Manages the active scenario selection and persists it to localStorage.
 * Also stores computed scenario values for display.
 */

import { create } from 'zustand';
import type { ComputeNodeResponse, CompareNodeResult } from '@/lib/types';

interface ScenarioState {
  // Active scenario ID (null means "Baseline" - using real values)
  activeScenarioId: string | null;

  // Computed scenario values (node_id -> { value, real_value, scenario_value, error })
  scenarioComputedValues: Record<string, ComputeNodeResponse>;
  scenarioValuesScenarioId: string | null;

  // Comparison mode state
  comparisonEnabled: boolean;
  scenarioAId: string | null;
  scenarioBId: string | null;
  comparisonValues: Record<string, CompareNodeResult>;

  // Trigger to open new scenario dialog
  requestNewScenarioDialog: boolean;
  triggerNewScenarioDialog: () => void;
  clearNewScenarioDialogRequest: () => void;

  // Trigger inline scenario creation
  requestInlineScenarioCreation: boolean;
  triggerInlineScenarioCreation: () => void;
  clearInlineScenarioCreationRequest: () => void;

  // Set the active scenario
  setActiveScenario: (scenarioId: string | null) => void;

  // Reset to baseline (no scenario active)
  resetToBaseline: () => void;

  // Store scenario computation results
  setScenarioComputedValues: (
    scenarioId: string | null,
    values: Record<string, ComputeNodeResponse>
  ) => void;

  // Clear scenario computed values
  clearScenarioComputedValues: () => void;

  // Comparison mode setters
  setComparisonMode: (enabled: boolean) => void;
  setComparisonScenarios: (aId: string | null, bId: string | null) => void;
  setComparisonValues: (values: Record<string, CompareNodeResult>) => void;
  clearComparison: () => void;
}

/**
 * Load and save active scenario from/to localStorage
 * This allows the active scenario to persist across page refreshes
 */
function loadActiveScenario(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('activeScenarioId');
  } catch {
    return null;
  }
}

function saveActiveScenario(scenarioId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (scenarioId) {
      localStorage.setItem('activeScenarioId', scenarioId);
    } else {
      localStorage.removeItem('activeScenarioId');
    }
  } catch {
    // Ignore localStorage errors
  }
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  activeScenarioId: loadActiveScenario(),
  scenarioComputedValues: {},
  scenarioValuesScenarioId: null,
  comparisonEnabled: false,
  scenarioAId: null,
  scenarioBId: null,
  comparisonValues: {},
  requestNewScenarioDialog: false,
  requestInlineScenarioCreation: false,

  triggerNewScenarioDialog: () => set({ requestNewScenarioDialog: true }),
  clearNewScenarioDialogRequest: () => set({ requestNewScenarioDialog: false }),

  triggerInlineScenarioCreation: () => set({ requestInlineScenarioCreation: true }),
  clearInlineScenarioCreationRequest: () => set({ requestInlineScenarioCreation: false }),

  setActiveScenario: (scenarioId: string | null) => {
    saveActiveScenario(scenarioId);
    set({ activeScenarioId: scenarioId });
  },

  resetToBaseline: () => {
    saveActiveScenario(null);
    set({
      activeScenarioId: null,
      scenarioComputedValues: {},
      scenarioValuesScenarioId: null,
    });
  },

  setScenarioComputedValues: (scenarioId, values) => {
    set({
      scenarioComputedValues: values,
      scenarioValuesScenarioId: scenarioId || null,
    });
  },

  clearScenarioComputedValues: () => {
    set({ scenarioComputedValues: {}, scenarioValuesScenarioId: null });
  },

  setComparisonMode: (enabled: boolean) => {
    set((state) => ({
      comparisonEnabled: enabled,
      comparisonValues: enabled ? state.comparisonValues : {},
    }));
  },

  setComparisonScenarios: (aId: string | null, bId: string | null) => {
    set({ scenarioAId: aId, scenarioBId: bId });
  },

  setComparisonValues: (values: Record<string, CompareNodeResult>) => {
    set({ comparisonValues: values });
  },

  clearComparison: () => {
    set({
      comparisonEnabled: false,
      scenarioAId: null,
      scenarioBId: null,
      comparisonValues: {},
    });
  },
}));
