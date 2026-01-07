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
import { BarChart3, GitCompare, Home, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { NewScenarioDialog } from "../panels/ScenarioPanel/ScenarioDialogs";
import { ApiNodeEditor } from "./sidebar/ApiNodeEditor";
import { ComparisonSidebarContent } from "./sidebar/ComparisonSidebarContent";
import { NodeDetailsFooter } from "./sidebar/NodeDetailsFooter";
import { NodeEditor } from "./sidebar/NodeEditor";
import { ScenarioExplorer } from "./sidebar/ScenarioExplorer";
import { SidebarContainer } from "./sidebar/SidebarContainer";
import { StandardMenuContent } from "./sidebar/StandardMenuContent";

interface MenuSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function MenuSidebar({ collapsed = false, onToggleCollapse }: MenuSidebarProps) {
  const router = useRouter();
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const setIsComputing = useUIStore((s) => s.setIsComputing);
  const libraryPanelOpen = useUIStore((s) => s.libraryPanelOpen);
  const nodeEditorMode = useUIStore((s) => s.nodeEditorMode);
  const nodeEditorNodeId = useUIStore((s) => s.nodeEditorNodeId);
  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const setNodeEditorNodeId = useUIStore((s) => s.setNodeEditorNodeId);

  const [showInsertCompositeModal, setShowInsertCompositeModal] = useState(false);

  // Scenario Creation State
  const [showNewScenarioDialog, setShowNewScenarioDialog] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");

  const computeAll = useComputeAll();
  const computeWithScenario = useComputeWithScenario();
  const createScenario = useCreateScenario();
  
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const resetToBaseline = useScenarioStore((s) => s.resetToBaseline);
  const setScenarioComputedValues = useScenarioStore(
    (s) => s.setScenarioComputedValues
  );
  const clearScenarioComputedValues = useScenarioStore(
    (s) => s.clearScenarioComputedValues
  );
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  const scenarioAId = useScenarioStore((s) => s.scenarioAId);
  const scenarioBId = useScenarioStore((s) => s.scenarioBId);
  const setComparisonValues = useScenarioStore((s) => s.setComparisonValues);
  const clearComparison = useScenarioStore((s) => s.clearComparison);
  const compareMutation = useCompareScenarios();

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
      // Comparison mode: compute A/B instead of single scenario
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
        console.log("✅ Scenario computation complete:", result);
        // Store scenario computation results
        setScenarioComputedValues(activeScenarioId, result.results);
        clearComparison();
      } else {
        const result = await computeAll.mutateAsync();
        console.log("✅ Computation complete:", result);
        // Clear scenario values when in baseline mode
        clearScenarioComputedValues();
        clearComparison();
      }
      // TODO: Show toast notification
    } catch (error) {
      console.error("❌ Computation failed:", error);
      // TODO: Show error notification
    } finally {
      setIsComputing(false);
    }
  };

  const handleCreateScenario = async () => {
    if (!newScenarioName.trim() || !currentProjectId) return;
    try {
      const newScenario = await createScenario.mutateAsync({
        projectId: currentProjectId,
        data: {
            name: newScenarioName,
        }
      });
      toast.success("Scénario créé avec succès");
      setShowNewScenarioDialog(false);
      setNewScenarioName("");
      // Automatically switch to the new scenario
      setActiveScenario(newScenario.id);
      // Trigger computation for the new scenario (initially same as baseline usually)
      handleCalculateAll();
    } catch (error) {
      toast.error("Erreur lors de la création du scénario");
      console.error(error);
    }
  };

  const handleSelectScenario = async (scenarioId: string | null) => {
    if (scenarioId === null) {
        resetToBaseline();
        // Switching to baseline will change mode to 'baseline', so standard menu will appear
    } else {
        setActiveScenario(scenarioId);
    }
    
    // Trigger computation
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

  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const scenarioPanelOpen = useUIStore((s) => s.scenarioPanelOpen);


  // Mode determination for styling
  const mode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);



  // Show Menu sidebar only if no other panel is open
  const showMenuSidebar = !inspectorOpen && !scenarioPanelOpen && !libraryPanelOpen;

  if (!showMenuSidebar) return null;

  if (nodeEditorMode === 'create-api' || nodeEditorMode === 'edit-api') {
    return (
      <ApiNodeEditor
        mode={nodeEditorMode === 'create-api' ? 'create' : 'edit'}
        nodeId={nodeEditorNodeId}
      />
    );
  }

  if (nodeEditorMode) {
    return (
      <NodeEditor
        mode={nodeEditorMode}
        nodeId={nodeEditorNodeId}
      />
    );
  }

  return (
    <>
      <SidebarContainer
        useFixedPosition={false}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        header={
          collapsed ? null : (
            <div className="flex flex-col gap-3 w-full">
              {/* Mode Tabs - Full Width with Clear Active State */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                <button
                  onClick={() => setViewMode('baseline')}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 px-2 rounded-md text-xs font-medium transition-all relative",
                    mode === 'baseline'
                      ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  <Home className={cn("h-4 w-4", mode === 'baseline' && "text-zinc-900 dark:text-zinc-100")} />
                  <span>Base</span>
                  {mode === 'baseline' && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  )}
                </button>
                <button
                  onClick={() => setViewMode('scenario')}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 px-2 rounded-md text-xs font-medium transition-all relative",
                    mode === 'scenario'
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Scénarios</span>
                </button>
                <button
                  onClick={() => setViewMode('comparison')}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 px-2 rounded-md text-xs font-medium transition-all relative",
                    mode === 'comparison'
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  <GitCompare className="h-4 w-4" />
                  <span>Comparer</span>
                </button>
              </div>

              {/* Contextual Action Row */}
              {mode === 'scenario' && scenarios.length >= 2 && (
                <button
                  onClick={() => setViewMode('comparison')}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border-2 border-dashed border-amber-400/50 hover:border-amber-400 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-xs font-medium transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>Comparer ces scénarios</span>
                </button>
              )}

              {/* Create scenario button */}
              {mode === 'scenario' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-500 font-medium uppercase tracking-wide">
                    {scenarios.length} scénario{scenarios.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => {
                      useScenarioStore.getState().triggerInlineScenarioCreation();
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Nouveau</span>
                  </button>
                </div>
              )}
            </div>
          )
        }
        footer={<NodeDetailsFooter />}
      >
        {mode === 'scenario' ? (
          <ScenarioExplorer
            onSelectScenario={handleSelectScenario}
            onCreateScenario={async (name: string) => {
              if (!name.trim() || !currentProjectId) return;
              try {
                const newScenario = await createScenario.mutateAsync({
                  projectId: currentProjectId,
                  data: {
                    name: name,
                    color: "#3B82F6",
                  }
                });
                toast.success("Scénario créé");
                // Automatically switch to the new scenario
                setActiveScenario(newScenario.id);
                // Trigger computation for the new scenario
                await handleSelectScenario(newScenario.id);
              } catch (error) {
                toast.error("Erreur lors de la création du scénario");
                console.error(error);
              }
            }}
          />
        ) : mode === 'comparison' ? (
            <ComparisonSidebarContent 
              onCalculate={handleCalculateAll} 
              isComputing={computeAll.isPending || computeWithScenario.isPending} 
            />
        ) : (
          <StandardMenuContent
              onShowCreateApiDialog={() => {
                setNodeEditorNodeId(null);
                setNodeEditorMode('create-api');
              }}
              onShowInsertCompositeModal={() => setShowInsertCompositeModal(true)}
              onEditNode={(id) => {
                setNodeEditorNodeId(id);
                setNodeEditorMode('edit');
              }}
          />
        )}
      </SidebarContainer>

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
      {showNewScenarioDialog && (
        <NewScenarioDialog
            open={showNewScenarioDialog}
            onOpenChange={setShowNewScenarioDialog}
            value={newScenarioName}
            onValueChange={setNewScenarioName}
            onConfirm={handleCreateScenario}
            isSubmitting={createScenario.isPending}
        />
      )}
    </>
  );
}
