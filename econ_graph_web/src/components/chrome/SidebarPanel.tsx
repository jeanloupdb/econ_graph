"use client";

import { InsertCompositeModal } from "@/components/forms/InsertCompositeModal";
import {
    useCompareScenarios,
    useComputeAll,
    useComputeWithScenario,
    useCreateScenario,
    useScenarios,
} from "@/lib/api/hooks";
import type { CompareNodeResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { BarChart3, GitCompare, Home, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ApiNodeEditor } from "./sidebar/ApiNodeEditor";
import { ComparisonSidebarContent } from "./sidebar/ComparisonSidebarContent";
import { NodeEditor } from "./sidebar/NodeEditor";
import { ScenarioExplorer } from "./sidebar/ScenarioExplorer";
import { StandardMenuContent } from "./sidebar/StandardMenuContent";

import type { ViewMode } from "@/lib/types";

const MODE_CONFIG: Record<
  Exclude<ViewMode, 'columns'>,
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

interface SidebarPanelProps {
  className?: string;
}

export function SidebarPanel({ className }: SidebarPanelProps) {
  const router = useRouter();
  const isOpen = useUIStore((s) => s.floatingPanelOpen);
  const setFloatingPanelOpen = useUIStore((s) => s.setFloatingPanelOpen);
  const mode = useUIStore((s) => s.viewMode);

  // Node editor state
  const nodeEditorMode = useUIStore((s) => s.nodeEditorMode);
  const nodeEditorNodeId = useUIStore((s) => s.nodeEditorNodeId);
  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const setNodeEditorNodeId = useUIStore((s) => s.setNodeEditorNodeId);
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const setIsComputing = useUIStore((s) => s.setIsComputing);

  // Composites modal
  const [showInsertCompositeModal, setShowInsertCompositeModal] = useState(false);

  // Scenario/project state
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
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

  // Mutations
  const computeAll = useComputeAll();
  const computeWithScenario = useComputeWithScenario();
  const createScenario = useCreateScenario();
  const compareMutation = useCompareScenarios();
  const setViewMode = useUIStore((s) => s.setViewMode);
  const setComparisonMode = useScenarioStore((s) => s.setComparisonMode);

  // Handle create composite from graph
  const handleCreateCompositeFromGraph = useCallback(() => {
    if (!currentProjectId) {
      toast.error("Sélectionnez un projet avant de créer un composite.");
      return;
    }
    resetDetailPanels();
    const encoded = encodeURIComponent(currentProjectId);
    router.push(`/composites/new?return=graph&project=${encoded}`);
  }, [currentProjectId, router, resetDetailPanels]);

  // Handle calculate all
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

  // Handle select scenario
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

  // If node editor is active, show that instead
  if (nodeEditorMode === "create-api" || nodeEditorMode === "edit-api") {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <ApiNodeEditor
          mode={nodeEditorMode === "create-api" ? "create" : "edit"}
          nodeId={nodeEditorNodeId}
        />
      </div>
    );
  }

  if (nodeEditorMode) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <NodeEditor mode={nodeEditorMode} nodeId={nodeEditorNodeId} />
      </div>
    );
  }

  // Not open and no editor - render nothing
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col h-full",
          className
        )}
      >
        {/* Mode Tabs Header */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-0.5">
            {(
              Object.entries(MODE_CONFIG) as [ViewMode, (typeof MODE_CONFIG)["baseline"]][]
            ).map(([modeKey, config]) => {
              const Icon = config.icon;
              const isActive = mode === modeKey;

              return (
                <button
                  key={modeKey}
                  onClick={() => {
                    setViewMode(modeKey);
                    if (modeKey === "comparison") {
                      setComparisonMode(true);
                    } else {
                      setComparisonMode(false);
                      if (modeKey === "baseline") {
                        resetToBaseline();
                      }
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded-md",
                    "text-xs font-medium transition-all duration-150",
                    isActive
                      ? cn(config.activeColor, config.activeBg)
                      : cn(config.inactiveColor, "hover:bg-white/[0.04] hover:text-zinc-300")
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setFloatingPanelOpen(false)}
            className="flex items-center justify-center w-6 h-6 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Action bar for scenario mode */}
        {mode === "scenario" && (
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
              {scenarios.length} scénario{scenarios.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => {
                useScenarioStore.getState().triggerInlineScenarioCreation();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Nouveau</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
      </div>

      {/* Modals */}
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

