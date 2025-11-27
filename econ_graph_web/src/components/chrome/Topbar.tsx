'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUIStore } from '@/store/uiState';
import { useProjectStore } from '@/store/projectState';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2, Settings2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { NewNodeModal } from '@/components/forms/NewNodeModal';
import { NewApiNodeModal } from '@/components/forms/NewApiNodeModal';
import { InsertCompositeModal } from '@/components/forms/InsertCompositeModal';
import { useScenarioStore } from '@/store/scenarioState';
import { useComputeAll, useComputeWithScenario, useScenarios, useCompareScenarios } from '@/lib/api/hooks';
import { SwitchSelector } from '@/components/ui/switch-selector';
import { GraphAddNodeMenu } from '@/components/graph/GraphAddNodeMenu';
import { toast } from 'sonner';

export function Topbar() {
  const router = useRouter();
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setScenarioPanelOpen = useUIStore((s) => s.setScenarioPanelOpen);
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const setIsComputing = useUIStore((s) => s.setIsComputing);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateApiDialog, setShowCreateApiDialog] = useState(false);
  const [showScenarioDropdown, setShowScenarioDropdown] = useState(false);
  const [showInsertCompositeModal, setShowInsertCompositeModal] = useState(false);

  const scenarioDropdownRef = useRef<HTMLDivElement>(null);
  const scenarioAutoStatusRef = useRef<Record<string, 'idle' | 'pending'>>({});
  const scenarioAutoRetryTimeoutRef = useRef<Record<string, number | null>>({});
  const [scenarioAutoTick, setScenarioAutoTick] = useState(0);

  const computeAll = useComputeAll();
  const computeWithScenario = useComputeWithScenario();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const resetToBaseline = useScenarioStore((s) => s.resetToBaseline);
  const scenarioValuesScenarioId = useScenarioStore((s) => s.scenarioValuesScenarioId);
  const setScenarioComputedValues = useScenarioStore((s) => s.setScenarioComputedValues);
  const clearScenarioComputedValues = useScenarioStore((s) => s.clearScenarioComputedValues);
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  const scenarioAId = useScenarioStore((s) => s.scenarioAId);
  const scenarioBId = useScenarioStore((s) => s.scenarioBId);
  const setComparisonMode = useScenarioStore((s) => s.setComparisonMode);
  const setComparisonScenarios = useScenarioStore((s) => s.setComparisonScenarios);
  const setComparisonValues = useScenarioStore((s) => s.setComparisonValues);
  const clearComparison = useScenarioStore((s) => s.clearComparison);

  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const currentScenario = scenarios.find((s) => s.id === activeScenarioId);
  const scenarioA = scenarios.find((s) => s.id === scenarioAId) || null;
  const scenarioB = scenarios.find((s) => s.id === scenarioBId) || null;

  const compareMutation = useCompareScenarios();
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);
  const handleCreateCompositeFromGraph = useCallback(() => {
    if (!currentProjectId) {
      toast.error('Sélectionnez un projet avant de créer un composite.');
      return;
    }
    resetDetailPanels();
    const encoded = encodeURIComponent(currentProjectId);
    router.push(`/composites/new?return=graph&project=${encoded}`);
  }, [currentProjectId, router, resetDetailPanels]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scenarioDropdownRef.current && !scenarioDropdownRef.current.contains(event.target as Node)) {
        setShowScenarioDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const clearAllRetryTimeouts = () => {
      Object.values(scenarioAutoRetryTimeoutRef.current).forEach((timeoutId) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      scenarioAutoRetryTimeoutRef.current = {};
    };

    if (!activeScenarioId || !currentProjectId || comparisonEnabled || computeWithScenario.isPending) {
      scenarioAutoStatusRef.current = {};
      clearAllRetryTimeouts();
      return;
    }

    if (scenarioValuesScenarioId === activeScenarioId) {
      scenarioAutoStatusRef.current[activeScenarioId] = 'idle';
      const timeoutId = scenarioAutoRetryTimeoutRef.current[activeScenarioId];
      if (timeoutId) {
        clearTimeout(timeoutId);
        scenarioAutoRetryTimeoutRef.current[activeScenarioId] = null;
      }
      return;
    }

    const status = scenarioAutoStatusRef.current[activeScenarioId] ?? 'idle';
    if (status === 'pending') {
      return;
    }

    const scenarioIdForRun = activeScenarioId;
    scenarioAutoStatusRef.current[scenarioIdForRun] = 'pending';
    let cancelled = false;

    const runPreload = async () => {
      try {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: scenarioIdForRun,
        });
        if (cancelled) {
          return;
        }
        setScenarioComputedValues(scenarioIdForRun, result.results);
        scenarioAutoStatusRef.current[scenarioIdForRun] = 'idle';
        const timeoutId = scenarioAutoRetryTimeoutRef.current[scenarioIdForRun];
        if (timeoutId) {
          clearTimeout(timeoutId);
          scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = null;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error('❌ Failed to preload scenario values:', error);
        scenarioAutoStatusRef.current[scenarioIdForRun] = 'idle';
        if (!scenarioAutoRetryTimeoutRef.current[scenarioIdForRun]) {
          scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = window.setTimeout(() => {
            scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = null;
            setScenarioAutoTick((tick) => tick + 1);
          }, 5000);
        }
      }
    };

    void runPreload();

    return () => {
      cancelled = true;
      if (scenarioAutoStatusRef.current[scenarioIdForRun] === 'pending') {
        scenarioAutoStatusRef.current[scenarioIdForRun] = 'idle';
      }
    };
  }, [
    activeScenarioId,
    currentProjectId,
    comparisonEnabled,
    scenarioValuesScenarioId,
    computeWithScenario,
    setScenarioComputedValues,
    scenarioAutoTick,
  ]);

  const handleCalculateAll = async () => {
    try {
      setIsComputing(true);
      // Comparison mode: compute A/B instead of single scenario
      if (comparisonEnabled && scenarioAId && scenarioBId) {
        const result = await compareMutation.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioAId,
          scenarioBId,
        });
        const map: Record<string, unknown> = {};
        for (const node of result.nodes) {
          map[node.node_id] = node;
        }
        setComparisonValues(map);
        // In comparison mode we ignore scenario overrides
        return;
      }

      // Use scenario-aware computation if a scenario is active
      if (activeScenarioId) {
        if (computeWithScenario.isPending) {
          return;
        }
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: activeScenarioId,
        });
        console.log('✅ Scenario computation complete:', result);
        // Store scenario computation results
        setScenarioComputedValues(activeScenarioId, result.results);
        clearComparison();
      } else {
        const result = await computeAll.mutateAsync();
        console.log('✅ Computation complete:', result);
        // Clear scenario values when in baseline mode
        clearScenarioComputedValues();
        clearComparison();
      }
      // TODO: Show toast notification
    } catch (error) {
      console.error('❌ Computation failed:', error);
      // TODO: Show error notification
    } finally {
      setIsComputing(false);
    }
  };

  const handleTopbarScenarioSelect = async (scenarioId: string | null) => {
    // If comparison is enabled, selecting from the topbar comparison dropdown
    // is handled separately; this handler is only for the active scenario.
    if (scenarioId === null) {
      resetToBaseline();
    } else {
      setActiveScenario(scenarioId);
    }
    setShowScenarioDropdown(false);

    // Recompute immediately like the calculate-all button
    try {
      setIsComputing(true);
      if (scenarioId) {
        if (computeWithScenario.isPending) {
          return;
        }
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId,
        });
        setScenarioComputedValues(scenarioId, result.results);
      } else {
        await computeAll.mutateAsync();
        clearScenarioComputedValues();
      }
    } catch (error) {
      console.error('❌ Scenario selection recompute failed (topbar):', error);
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <div>
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            title="Back to Home"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Home
          </Link>

          {/* Project + mode + selectors */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {currentProject?.name || 'Econ Graph'}
            </h1>

            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <SwitchSelector
                options={[
                  { value: 'scenario', label: 'Scénario' },
                  { value: 'comparison', label: 'Comparaison' }
                ]}
                value={comparisonEnabled ? 'comparison' : 'scenario'}
                onChange={(value) => {
                  if (value === 'scenario') {
                    setComparisonMode(false);
                    clearComparison();
                  } else {
                    setComparisonMode(true);
                    setShowCompareDropdown(true);
                  }
                }}
                size="md"
              />
            </div>

            {/* Scenario selector (Scénario mode only) */}
            {!comparisonEnabled && (
              <div className="relative" ref={scenarioDropdownRef}>
                <button
                  onClick={() => setShowScenarioDropdown(!showScenarioDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Afficher le scénario actif"
                >
                  {currentScenario?.color && (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: currentScenario.color }}
                    />
                  )}
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {currentScenario ? currentScenario.name : 'Baseline'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                </button>

                {showScenarioDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded shadow-lg z-50">
                    <div className="px-3 py-2 text-sm space-y-2">
                      {/* Baseline */}
                      <button
                        type="button"
                        onClick={() => {
                          void handleTopbarScenarioSelect(null);
                        }}
                        className={`flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                          activeScenarioId === null
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-zinc-400" />
                          <span>Baseline (données réelles)</span>
                        </div>
                        {activeScenarioId === null && (
                          <span className="text-[10px] font-medium uppercase">
                            Scénario en cours
                          </span>
                        )}
                      </button>

                      {/* Scenarios */}
                      {scenarios.map((scenario) => {
                        const isActive = activeScenarioId === scenario.id;
                        return (
                          <button
                            key={scenario.id}
                            type="button"
                            onClick={() => {
                              void handleTopbarScenarioSelect(scenario.id);
                            }}
                            className={`flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {scenario.color && (
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: scenario.color }}
                                />
                              )}
                              <span className="truncate">{scenario.name}</span>
                            </div>
                            {isActive && (
                              <span className="text-[10px] font-medium uppercase">
                                Scénario en cours
                              </span>
                            )}
                          </button>
                        );
                      })}

                      <div className="pt-2 mt-1 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                          onClick={() => {
                          setShowScenarioDropdown(false);
                            setScenarioPanelOpen(true);
                            setInspectorOpen(false);
                          }}
                          className="w-full flex items-center gap-2 text-left px-2 py-1 text-xs rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-900 dark:text-zinc-100"
                        >
                          <Settings2 className="h-3 w-3" />
                          <span>Réglages scénarios</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comparison selector (Comparaison mode only) */}
            {comparisonEnabled && (
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => setShowCompareDropdown((v) => !v)}
                >
                  {scenarioAId && scenarioBId ? (
                    <>
                      <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>{scenarioAId === 'baseline' ? 'Baseline' : scenarioA?.name}</span>
                      </span>
                      <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{scenarioBId === 'baseline' ? 'Baseline' : scenarioB?.name}</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Sélectionnez deux scénarios à comparer
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                </button>
                {showCompareDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded shadow-lg z-50 text-xs">
                    <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="font-medium text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Scénario A
                      </div>
                      <div className="mt-1 space-y-1">
                        {/* Baseline option (always available for A) */}
                        <button
                          type="button"
                          className={`flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                            scenarioAId === 'baseline'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                          onClick={() => {
                            setComparisonScenarios('baseline', scenarioBId);
                          }}
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="truncate">Baseline (données réelles)</span>
                        </button>
                        {scenarios.map((s) => (
                          <button
                            key={`cmpA-${s.id}`}
                            type="button"
                            className={`flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                              scenarioAId === s.id
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
                                : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                            onClick={() => {
                              setComparisonScenarios(s.id, scenarioBId);
                            }}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="truncate">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <div className="font-medium text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Scénario B
                      </div>
                      <div className="mt-1 space-y-1">
                        {/* Baseline option (always available for B) */}
                        <button
                          type="button"
                          className={`flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                            scenarioBId === 'baseline'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                          onClick={() => {
                            setComparisonScenarios(scenarioAId, 'baseline');
                          }}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="truncate">Baseline (données réelles)</span>
                        </button>
                        {scenarios.map((s) => (
                          <button
                            key={`cmpB-${s.id}`}
                            type="button"
                            className={`flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                              scenarioBId === s.id
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                                : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                            onClick={() => {
                              setComparisonScenarios(scenarioAId, s.id);
                            }}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="truncate">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="group inline-flex items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 disabled:text-zinc-400 disabled:dark:text-zinc-500"
                        onClick={() => {
                          setShowCompareDropdown(false);
                          if (scenarioAId && scenarioBId) {
                            void handleCalculateAll();
                          }
                        }}
                        disabled={!scenarioAId || !scenarioBId || compareMutation.isPending}
                      >
                        {compareMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <span>Comparer</span>
                            <ChevronRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Node creation menu */}
          <GraphAddNodeMenu
            onCreateNode={() => setShowCreateDialog(true)}
            onCreateApiNode={() => setShowCreateApiDialog(true)}
            onInsertComposite={() => setShowInsertCompositeModal(true)}
            onCreateComposite={() => {
              setShowInsertCompositeModal(false);
              handleCreateCompositeFromGraph();
            }}
          />

          {/* Calculate all - just icon */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCalculateAll}
            disabled={computeAll.isPending || computeWithScenario.isPending}
            title="Calculate all computed nodes"
          >
            {computeAll.isPending || computeWithScenario.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>

          {/* Settings button with Settings2 icon */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setScenarioPanelOpen(true);
            }}
            title="Scénarios & Réglages"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      {showCreateDialog && (
        <NewNodeModal open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
      )}
      {showCreateApiDialog && (
        <NewApiNodeModal
          open={showCreateApiDialog}
          onClose={() => setShowCreateApiDialog(false)}
        />
      )}
      {showInsertCompositeModal && (
        <InsertCompositeModal
          open={showInsertCompositeModal}
          onClose={() => setShowInsertCompositeModal(false)}
          onCreateComposite={() => {
            setShowInsertCompositeModal(false);
            handleCreateCompositeFromGraph();
          }}
        />
      )}
    </div>
  );
}
