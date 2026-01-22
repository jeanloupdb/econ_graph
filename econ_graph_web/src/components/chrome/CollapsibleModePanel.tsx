"use client";

import { InsertCompositeModal } from "@/components/forms/InsertCompositeModal";
import {
  useCompareScenarios,
  useComputeAll,
  useComputeWithScenario,
  useCreateScenario,
  useScenarios,
} from "@/lib/api/hooks";
import { GRAPH_LIGHT_COLORS, useGraphTheme } from "@/lib/context/GraphThemeContext";
import type { CompareNodeResult, ViewMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Home,
  Minimize2,
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiNodeEditor } from "./sidebar/ApiNodeEditor";
import { ComparisonSidebarContent } from "./sidebar/ComparisonSidebarContent";
import { NodeEditor } from "./sidebar/NodeEditor";
import { ScenarioExplorer } from "./sidebar/ScenarioExplorer";
import { StandardMenuContent } from "./sidebar/StandardMenuContent";

const MODE_CONFIG: Record<
  Exclude<ViewMode, 'columns'>,  // Exclude columns from the config
  {
    icon: typeof Home;
    label: string;
    activeColor: string;
    activeBg: string;
    inactiveColor: string;
  }
> = {
  baseline: {
    icon: Home,
    label: "Base",
    activeColor: "text-zinc-100",
    activeBg: "bg-white/[0.08]",
    inactiveColor: "text-zinc-500",
  },
  scenario: {
    icon: BarChart3,
    label: "Scénarios",
    activeColor: "text-blue-400",
    activeBg: "bg-blue-500/15",
    inactiveColor: "text-zinc-500",
  },
  comparison: {
    icon: GitCompare,
    label: "Comparer",
    activeColor: "text-amber-400",
    activeBg: "bg-amber-500/15",
    inactiveColor: "text-zinc-500",
  },
};

export function CollapsibleModePanel() {
  const { isLightMode } = useGraphTheme();
  const router = useRouter();
  const isExpanded = useUIStore((s) => s.floatingPanelOpen);
  const setExpanded = useUIStore((s) => s.setFloatingPanelOpen);
  const mode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  // Node editor state
  const nodeEditorMode = useUIStore((s) => s.nodeEditorMode);
  const nodeEditorNodeId = useUIStore((s) => s.nodeEditorNodeId);
  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const setNodeEditorNodeId = useUIStore((s) => s.setNodeEditorNodeId);
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const setIsComputing = useUIStore((s) => s.setIsComputing);

  // Composites modal
  const [showInsertCompositeModal, setShowInsertCompositeModal] = useState(false);

  // Scenario onboarding tooltip
  const [showScenarioOnboarding, setShowScenarioOnboarding] = useState(false);
  const aiAssistantOpen = useUIStore((s) => s.aiAssistantOpen);

  // Show scenario onboarding after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowScenarioOnboarding(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const dismissScenarioOnboarding = useCallback(() => {
    setShowScenarioOnboarding(false);
  }, []);

  useEffect(() => {
    if (mode === "scenario" && showScenarioOnboarding) {
      dismissScenarioOnboarding();
    }
  }, [mode, showScenarioOnboarding, dismissScenarioOnboarding]);

  useEffect(() => {
    if (aiAssistantOpen && showScenarioOnboarding) {
      dismissScenarioOnboarding();
    }
  }, [aiAssistantOpen, showScenarioOnboarding, dismissScenarioOnboarding]);

  // Scenario/project state
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const canEdit = useProjectStore((s) => s.canEdit)();
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const resetToBaseline = useScenarioStore((s) => s.resetToBaseline);
  const setScenarioComputedValues = useScenarioStore((s) => s.setScenarioComputedValues);
  const clearScenarioComputedValues = useScenarioStore((s) => s.clearScenarioComputedValues);
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  const scenarioAId = useScenarioStore((s) => s.scenarioAId);
  const scenarioBId = useScenarioStore((s) => s.scenarioBId);
  const setComparisonValues = useScenarioStore((s) => s.setComparisonValues);
  const clearComparison = useScenarioStore((s) => s.clearComparison);
  const setComparisonMode = useScenarioStore((s) => s.setComparisonMode);

  // Mutations
  const computeAll = useComputeAll();
  const computeWithScenario = useComputeWithScenario();
  const createScenario = useCreateScenario();
  const compareMutation = useCompareScenarios();

  const handleModeChange = (newMode: ViewMode) => {
    if (nodeEditorMode) return;
    setViewMode(newMode);
    setExpanded(true);
    if (newMode === "comparison") {
      setComparisonMode(true);
    } else {
      setComparisonMode(false);
      if (newMode === "baseline") {
        resetToBaseline();
      }
    }
  };

  const handleCreateCompositeFromGraph = useCallback(() => {
    if (!currentProjectId) {
      toast.error("Sélectionnez un projet avant de créer un composite.");
      return;
    }
    resetDetailPanels();
    const encoded = encodeURIComponent(currentProjectId);
    router.push(`/composites/new?return=graph&project=${encoded}`);
  }, [currentProjectId, router, resetDetailPanels]);

  const handleCalculateAll = async () => {
    try {
      setIsComputing(true);
      if (comparisonEnabled && scenarioAId && scenarioBId) {
        const result = await compareMutation.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioAId,
          scenarioBId,
        });
        const map: Record<string, CompareNodeResult> = {};
        for (const node of result.nodes) {
          map[node.node_id] = node;
        }
        setComparisonValues(map);
        return;
      }

      if (activeScenarioId) {
        if (computeWithScenario.isPending) return;
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: activeScenarioId,
        });
        setScenarioComputedValues(activeScenarioId, result.results);
        clearComparison();
      } else {
        await computeAll.mutateAsync();
        clearScenarioComputedValues();
        clearComparison();
      }
    } catch (error) {
      console.error("❌ Computation failed:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const handleSelectScenario = async (scenarioId: string | null) => {
    if (scenarioId === null) {
      resetToBaseline();
    } else {
      setActiveScenario(scenarioId);
    }

    try {
      setIsComputing(true);
      if (scenarioId) {
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
      console.error("Failed to compute scenario:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const showNodeEditor = nodeEditorMode !== null;
  const shouldBeExpanded = isExpanded || showNodeEditor;

  const ModeTabsHeader = ({ showExpandToggle = true }: { showExpandToggle?: boolean }) => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-0.5">
        {(Object.entries(MODE_CONFIG) as [ViewMode, (typeof MODE_CONFIG)["baseline"]][]).map(
          ([modeKey, config]) => {
            const Icon = config.icon;
            const isActive = mode === modeKey;
            const isDisabled = !!nodeEditorMode;
            const isScenarioButton = modeKey === "scenario";

            return (
              <div key={modeKey} className="relative">
                <button
                  onClick={() => {
                    handleModeChange(modeKey);
                    if (isScenarioButton) dismissScenarioOnboarding();
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
                    "text-xs font-medium transition-all duration-150",
                    isDisabled && "opacity-40 cursor-not-allowed",
                    isActive
                      ? cn(
                          isLightMode ? "text-zinc-800 bg-white shadow-sm" : cn(config.activeColor, config.activeBg)
                        )
                      : cn(
                          isLightMode ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700" : cn(config.inactiveColor, "hover:bg-white/[0.04] hover:text-zinc-300")
                        ),
                    isScenarioButton && showScenarioOnboarding && !isActive && "ring-2 ring-blue-500 ring-offset-1"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{config.label}</span>
                </button>

                {/* Scenario Onboarding Tooltip */}
                {isScenarioButton && (
                  <AnimatePresence>
                    {showScenarioOnboarding && !isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-3 w-64 z-50"
                      >
                        <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
                          <div className="absolute -top-2 left-6 w-4 h-4 bg-zinc-900 border-l border-t border-zinc-700 rotate-45" />
                          <div className="relative">
                            <p className="text-sm font-medium text-zinc-200 mb-2">Testez des hypothèses</p>
                            <p className="text-sm text-zinc-400 mb-4">
                              Les scénarios vous permettent de modifier les paramètres pour voir comment les résultats changent.
                            </p>
                            <p className="text-xs text-zinc-500 mb-4">Ex : &quot;Et si mon budget augmente de 20% ?&quot;</p>
                            <button
                              onClick={dismissScenarioOnboarding}
                              className="w-full py-2 px-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-medium transition-colors"
                            >
                              Compris
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          }
        )}
      </div>

      {showExpandToggle && (
        <button
          onClick={() => setExpanded(!shouldBeExpanded)}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150",
            isLightMode
              ? "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"
          )}
        >
          {shouldBeExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}
    </div>
  );

  // Collapsed state
  if (!shouldBeExpanded) {
    return (
      <div
        className={cn(
          "absolute left-4 top-4 z-20 px-2 py-1.5 backdrop-blur-xl rounded-xl border",
          "animate-in fade-in slide-in-from-top-2 duration-200",
          isLightMode
            ? "shadow-lg"
            : "bg-zinc-900/90 border-white/[0.08] shadow-2xl"
        )}
        style={isLightMode
          ? { backgroundColor: `${GRAPH_LIGHT_COLORS.panelBg}f2`, borderColor: GRAPH_LIGHT_COLORS.panelBorder }
          : undefined
        }
      >
        <ModeTabsHeader />
      </div>
    );
  }

  // Expanded state
  return (
    <>
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 z-30 w-[300px] flex flex-col border-r",
          "animate-in slide-in-from-left-4 duration-300 ease-out group",
          !isLightMode && "bg-[#0a0a0b] border-white/[0.06]"
        )}
        style={isLightMode 
          ? { backgroundColor: GRAPH_LIGHT_COLORS.panelBg, borderColor: GRAPH_LIGHT_COLORS.panelBorder }
          : undefined
        }
      >
        {/* Minimize button */}
        <button
          onClick={() => setExpanded(false)}
          disabled={!!nodeEditorMode}
          className={cn(
            "absolute -right-4 top-4 z-40 flex items-center justify-center w-8 h-8 rounded-full shadow-lg border",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            nodeEditorMode && "opacity-40 cursor-not-allowed",
            isLightMode
              ? "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-700"
              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
          )}
          title="Réduire le panneau"
        >
          <Minimize2 className="h-4 w-4" />
        </button>

        {/* Header with mode tabs */}
        <div className={cn("px-2 py-2 border-b", isLightMode ? "border-zinc-300" : "border-white/[0.06]")}>
          <div className={cn("flex items-center gap-0.5 p-1 rounded-xl", isLightMode ? "bg-zinc-300/60" : "bg-white/[0.04]")}>
            {(Object.entries(MODE_CONFIG) as [ViewMode, (typeof MODE_CONFIG)["baseline"]][]).map(
              ([modeKey, config]) => {
                const Icon = config.icon;
                const isActive = mode === modeKey;
                const isDisabled = !!nodeEditorMode;
                const isScenarioButton = modeKey === "scenario";

                return (
                  <div key={modeKey} className="relative flex-1">
                    <button
                      onClick={() => {
                        handleModeChange(modeKey);
                        if (isScenarioButton) dismissScenarioOnboarding();
                      }}
                      disabled={isDisabled}
                      className={cn(
                        "w-full flex items-center justify-center gap-1 px-2 py-2 rounded-lg",
                        "text-[11px] font-semibold transition-all duration-200",
                        isDisabled && "opacity-40 cursor-not-allowed",
                        isActive
                          ? isLightMode
                            ? "bg-white text-zinc-800 shadow-sm border border-zinc-300"
                            : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                          : isLightMode
                            ? "text-zinc-600 hover:text-zinc-800 hover:bg-white/50"
                            : cn(config.inactiveColor, "hover:bg-white/[0.04] hover:text-zinc-300"),
                        isScenarioButton && showScenarioOnboarding && !isActive && "ring-2 ring-blue-500 ring-offset-1"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{config.label}</span>
                    </button>

                    {/* Scenario Onboarding Tooltip */}
                    {isScenarioButton && (
                      <AnimatePresence>
                        {showScenarioOnboarding && !isActive && (
                          <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-full top-0 ml-3 w-64 z-50"
                          >
                            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
                              <div className="absolute top-3 -left-2 w-4 h-4 bg-zinc-900 border-l border-b border-zinc-700 rotate-45" />
                              <div className="relative">
                                <p className="text-sm font-medium text-zinc-200 mb-2">Testez des hypothèses</p>
                                <p className="text-sm text-zinc-400 mb-3">
                                  Les scénarios vous permettent de modifier les paramètres pour voir comment les résultats changent.
                                </p>
                                <p className="text-xs text-zinc-500 mb-4">Ex : &quot;Et si mon budget augmente de 20% ?&quot;</p>
                                <button
                                  onClick={dismissScenarioOnboarding}
                                  className="w-full py-2 px-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-medium transition-colors"
                                >
                                  Compris
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Node editor modes */}
        {(nodeEditorMode === "create-api" || nodeEditorMode === "edit-api") && (
          <ApiNodeEditor mode={nodeEditorMode === "create-api" ? "create" : "edit"} nodeId={nodeEditorNodeId} />
        )}

        {nodeEditorMode && nodeEditorMode !== "create-api" && nodeEditorMode !== "edit-api" && (
          <NodeEditor mode={nodeEditorMode} nodeId={nodeEditorNodeId} />
        )}

        {/* Regular content when no node editor */}
        {!nodeEditorMode && (
          <>
            {mode === "scenario" && (
              <div className={cn("px-3 py-2 border-b flex items-center justify-between", isLightMode ? "border-zinc-400" : "border-white/[0.06]")}>
                <span className={cn("text-[10px] font-medium uppercase tracking-wide", isLightMode ? "text-zinc-600" : "text-zinc-500")}>
                  {scenarios.length} scénario{scenarios.length !== 1 ? "s" : ""}
                </span>
                {canEdit && (
                  <button
                    onClick={() => useScenarioStore.getState().triggerInlineScenarioCreation()}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-blue-500 hover:bg-blue-500/10 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Nouveau</span>
                  </button>
                )}
              </div>
            )}

            <div className={cn("flex-1 overflow-y-auto", isLightMode ? "graph-light-scrollbar" : "custom-scrollbar")}>
              {mode === "scenario" ? (
                <ScenarioExplorer
                  onSelectScenario={handleSelectScenario}
                  onCreateScenario={async (name: string) => {
                    if (!name.trim() || !currentProjectId) return;
                    try {
                      const newScenario = await createScenario.mutateAsync({
                        projectId: currentProjectId,
                        data: { name, color: "#3B82F6" },
                      });
                      toast.success("Scénario créé");
                      setActiveScenario(newScenario.id);
                      await handleSelectScenario(newScenario.id);
                    } catch (error) {
                      toast.error("Erreur lors de la création du scénario");
                      console.error(error);
                    }
                  }}
                />
              ) : mode === "comparison" ? (
                <ComparisonSidebarContent
                  onCalculate={handleCalculateAll}
                  isComputing={computeAll.isPending || computeWithScenario.isPending}
                />
              ) : (
                <StandardMenuContent
                  onShowCreateApiDialog={() => {
                    setNodeEditorNodeId(null);
                    setNodeEditorMode("create-api");
                  }}
                  onShowInsertCompositeModal={() => setShowInsertCompositeModal(true)}
                  onEditNode={(id) => {
                    setNodeEditorNodeId(id);
                    setNodeEditorMode("edit");
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

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
    </>
  );
}
