"use client";

import { InsertCompositeModal } from "@/components/forms/InsertCompositeModal";
import { ShareProjectModal } from "@/components/modals/ShareProjectModal";
import {
    useCompareScenarios,
    useComputeAll,
    useComputeWithScenario,
    useCreateScenario,
    useScenarios,
} from "@/lib/api/hooks";
import type { CompareNodeResult } from "@/lib/types";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { Loader2, Plus, RefreshCw, Share2 } from "lucide-react";
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

export function MenuSidebar() {
  const router = useRouter();
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setScenarioPanelOpen = useUIStore((s) => s.setScenarioPanelOpen);
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const setIsComputing = useUIStore((s) => s.setIsComputing);
  const libraryPanelOpen = useUIStore((s) => s.libraryPanelOpen);
  const nodeEditorMode = useUIStore((s) => s.nodeEditorMode);
  const nodeEditorNodeId = useUIStore((s) => s.nodeEditorNodeId);
  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const setNodeEditorNodeId = useUIStore((s) => s.setNodeEditorNodeId);

  const [showInsertCompositeModal, setShowInsertCompositeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Scenario Creation State
  const [showNewScenarioDialog, setShowNewScenarioDialog] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");

  const computeAll = useComputeAll();
  const computeWithScenario = useComputeWithScenario();
  const createScenario = useCreateScenario();
  
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  
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
        header={
          <>
            <span className="text-sm font-medium">
              {mode === 'scenario' ? 'Explorateur de Scénarios' : mode === 'comparison' ? 'Comparaison' : 'Menu'}
            </span>
            <div className="flex items-center gap-1">
              {mode === 'scenario' && (
                  <button
                      onClick={() => {
                        // Trigger inline creation in ScenarioExplorer
                        useScenarioStore.getState().triggerInlineScenarioCreation();
                      }}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="Nouveau scénario"
                  >
                      <Plus className="h-4 w-4" />
                  </button>
              )}
              <button
                  onClick={handleCalculateAll}
                  disabled={computeAll.isPending || computeWithScenario.isPending}
                  className="p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                  title="Tout recalculer"
              >
                  {(computeAll.isPending || computeWithScenario.isPending) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                      <RefreshCw className="h-4 w-4" />
                  )}
              </button>

              {useUIStore.getState().developerMode && (
                  <button
                      onClick={() => setShowShareModal(true)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="Partager"
                  >
                      <Share2 className="h-4 w-4" />
                  </button>
              )}
            </div>
          </>
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
      {showShareModal && currentProjectId && (
        <ShareProjectModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          projectId={currentProjectId}
          projectName={currentProject?.name || "Projet"}
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
