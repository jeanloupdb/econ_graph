"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    useComputeAll,
    useComputeWithScenario,
    useScenarios,
} from "@/lib/api/hooks";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import {
    ChevronDown,
    ChevronLeft,
    Code2,
    Eye
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserMenu } from "./UserMenu";

export function Topbar() {
  const router = useRouter();
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setScenarioPanelOpen = useUIStore((s) => s.setScenarioPanelOpen);
  const setIsComputing = useUIStore((s) => s.setIsComputing);

  const scenarioAutoStatusRef = useRef<Record<string, "idle" | "pending">>({});
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
  const scenarioValuesScenarioId = useScenarioStore(
    (s) => s.scenarioValuesScenarioId
  );
  const setScenarioComputedValues = useScenarioStore(
    (s) => s.setScenarioComputedValues
  );
  const clearScenarioComputedValues = useScenarioStore(
    (s) => s.clearScenarioComputedValues
  );
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  const scenarioAId = useScenarioStore((s) => s.scenarioAId);
  const scenarioBId = useScenarioStore((s) => s.scenarioBId);
  const setComparisonMode = useScenarioStore((s) => s.setComparisonMode);
  const setComparisonScenarios = useScenarioStore(
    (s) => s.setComparisonScenarios
  );
  const setComparisonValues = useScenarioStore((s) => s.setComparisonValues);
  const clearComparison = useScenarioStore((s) => s.clearComparison);

  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const currentScenario = scenarios.find((s) => s.id === activeScenarioId);
  const scenarioA = scenarios.find((s) => s.id === scenarioAId) || null;
  const scenarioB = scenarios.find((s) => s.id === scenarioBId) || null;



  // Determine current mode
  const mode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const nodeEditorMode = useUIStore((s) => s.nodeEditorMode);

  // Sync viewMode when activeScenarioId changes (optional, but good UX)
  useEffect(() => {
    if (activeScenarioId && mode !== 'scenario' && mode !== 'comparison') {
        setViewMode('scenario');
    }
  }, [activeScenarioId, mode, setViewMode]);

  // Unified baseline styles for all modes
  const getContainerStyles = () => {
    return "bg-white/60 dark:bg-black/40 border-white/20 backdrop-blur-xl shadow-lg";
  };

  const getTextStyles = () => {
    return "text-zinc-900 dark:text-zinc-100";
  };

  const getSubTextStyles = () => {
    return "text-zinc-600 dark:text-zinc-300";
  };

  // Close dropdowns when clicking outside


  // ... (Keep existing useEffects for auto-compute logic) ...
  useEffect(() => {
    const clearAllRetryTimeouts = () => {
      Object.values(scenarioAutoRetryTimeoutRef.current).forEach(
        (timeoutId) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      );
      scenarioAutoRetryTimeoutRef.current = {};
    };

    if (
      !activeScenarioId ||
      !currentProjectId ||
      comparisonEnabled ||
      computeWithScenario.isPending
    ) {
      scenarioAutoStatusRef.current = {};
      clearAllRetryTimeouts();
      return;
    }

    if (scenarioValuesScenarioId === activeScenarioId) {
      scenarioAutoStatusRef.current[activeScenarioId] = "idle";
      const timeoutId = scenarioAutoRetryTimeoutRef.current[activeScenarioId];
      if (timeoutId) {
        clearTimeout(timeoutId);
        scenarioAutoRetryTimeoutRef.current[activeScenarioId] = null;
      }
      return;
    }

    const status = scenarioAutoStatusRef.current[activeScenarioId] ?? "idle";
    if (status === "pending") {
      return;
    }

    const scenarioIdForRun = activeScenarioId;
    scenarioAutoStatusRef.current[scenarioIdForRun] = "pending";
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
        scenarioAutoStatusRef.current[scenarioIdForRun] = "idle";
        const timeoutId = scenarioAutoRetryTimeoutRef.current[scenarioIdForRun];
        if (timeoutId) {
          clearTimeout(timeoutId);
          scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = null;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("❌ Failed to preload scenario values:", error);
        scenarioAutoStatusRef.current[scenarioIdForRun] = "idle";
        if (!scenarioAutoRetryTimeoutRef.current[scenarioIdForRun]) {
          scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] =
            window.setTimeout(() => {
              scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = null;
              setScenarioAutoTick((tick) => tick + 1);
            }, 5000);
        }
      }
    };

    void runPreload();

    return () => {
      cancelled = true;
      if (scenarioAutoStatusRef.current[scenarioIdForRun] === "pending") {
        scenarioAutoStatusRef.current[scenarioIdForRun] = "idle";
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





  return (
    <div>
      <div className={`fixed top-2 left-2 right-2 h-14 flex items-center justify-between rounded-2xl border px-4 z-50 transition-all duration-500 ${getContainerStyles()}`}>
        <div className="flex items-center gap-3">

          {/* Back Button */}
          <Link
            href="/dashboard"
            className={`group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 border border-white/10 bg-black/20 hover:bg-black/40 backdrop-blur-md shadow-sm ${getSubTextStyles()}`}
            title="Retour au tableau de bord"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
          </Link>

          {/* Mode Switcher */}
          <div className="flex items-center h-10 gap-1 p-1 rounded-xl border border-white/10 bg-black/20 backdrop-blur-md shadow-inner">
            <button
              disabled={!!nodeEditorMode}
              onClick={() => {
                setViewMode('baseline');
                setComparisonMode(false);
                resetToBaseline();
                setInspectorOpen(false);
                setScenarioPanelOpen(false);
              }}
              className={`h-full px-4 text-xs font-bold rounded-lg transition-all duration-300 flex items-center ${
                mode === "baseline"
                  ? "bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
              } ${!!nodeEditorMode ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Baseline
            </button>
            <button
              disabled={!!nodeEditorMode}
              onClick={() => {
                setViewMode('scenario');
                setComparisonMode(false);
                setInspectorOpen(false);
                setScenarioPanelOpen(false);
              }}
              className={`h-full px-4 text-xs font-bold rounded-lg transition-all duration-300 flex items-center ${
                mode === "scenario"
                  ? "bg-gradient-to-b from-blue-500 to-blue-600 text-white border border-blue-400/30"
                  : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
              } ${!!nodeEditorMode ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Scénarios
            </button>
            <button
              disabled={!!nodeEditorMode}
              onClick={() => {
                setViewMode('comparison');
                setComparisonMode(true);
                setInspectorOpen(false);
                setScenarioPanelOpen(false);
              }}
              className={`h-full px-4 text-xs font-bold rounded-lg transition-all duration-300 flex items-center ${
                mode === "comparison"
                  ? "bg-gradient-to-b from-orange-500 to-orange-600 text-white border border-orange-400/30"
                  : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
              } ${!!nodeEditorMode ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Comparaison
            </button>
          </div>

          {/* Project Title */}
          <h1 className={`text-lg font-semibold leading-tight flex items-center gap-2 ml-2 min-w-0 max-w-[400px] ${getTextStyles()}`}>
            <span className="truncate shrink">{currentProject?.name || "Econ Graph"}</span>
            {mode === "scenario" && (
              <span className="text-blue-600 dark:text-blue-400 font-normal shrink-0 flex items-center gap-2 whitespace-nowrap">
                <span className="text-zinc-400 dark:text-zinc-600">/</span>
                <DropdownMenu>
                    <DropdownMenuTrigger className="hover:bg-white/10 rounded px-1 -ml-1 transition-colors outline-none flex items-center gap-1">
                        {currentScenario ? currentScenario.name : "Sélectionner un scénario"}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {scenarios.map(s => (
                            <DropdownMenuItem 
                                key={s.id} 
                                onClick={async () => {
                                    setActiveScenario(s.id);
                                    try {
                                        setIsComputing(true);
                                        const result = await computeWithScenario.mutateAsync({
                                            projectId: currentProjectId || undefined,
                                            scenarioId: s.id,
                                        });
                                        setScenarioComputedValues(s.id, result.results);
                                    } catch (error) {
                                        console.error("Failed to compute scenario:", error);
                                    } finally {
                                        setIsComputing(false);
                                    }
                                }}
                                className={s.id === activeScenarioId ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""}
                            >
                                {s.name}
                            </DropdownMenuItem>
                        ))}
                        {scenarios.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-zinc-500">Aucun scénario</div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Visualizer/Developer Switch */}
          <div className="flex items-center h-10 gap-1 p-1 rounded-xl border border-white/10 bg-black/20 backdrop-blur-md shadow-inner">
            <button
              onClick={() => useUIStore.getState().setDeveloperMode(false)}
              className={`h-full flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg transition-all duration-300 ${
                !useUIStore((s) => s.developerMode)
                  ? "bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
            </button>
            <button
              onClick={() => useUIStore.getState().setDeveloperMode(true)}
              className={`h-full flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg transition-all duration-300 ${
                useUIStore((s) => s.developerMode)
                  ? "bg-gradient-to-b from-violet-500 to-violet-600 text-white border border-violet-400/30"
                  : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <UserMenu />
        </div>
      </div>
    </div>
  );
}
