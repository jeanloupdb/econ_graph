"use client";

import { CollapsibleModePanel } from "@/components/chrome/CollapsibleModePanel";
import { TopbarMinimal } from "@/components/chrome/TopbarMinimal";
import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { CommandPalette } from "@/components/command/CommandPalette";
import { BottomToolbar } from "@/components/graph/BottomToolbar";
import { GraphAiBar } from "@/components/graph/GraphAiBar";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { Inspector } from "@/components/panels/Inspector";
import { LibraryPanel } from "@/components/panels/LibraryPanel";
import { ScenarioPanel } from "@/components/panels/ScenarioPanel";
import { ProjectGraphProvider } from "@/graph/providers/ProjectGraphProvider";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { useEffect, useRef } from "react";
import { ReactFlowProvider } from "reactflow";

import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { toast } from "sonner";

import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useInsertCompositeNode } from "@/graph/hooks/useInsertCompositeNode";
import { queryKeys, useComputeWithScenario } from "@/lib/api/hooks";
import {
  PENDING_COMPOSITE_INSERT_KEY,
  PENDING_COMPOSITE_REFRESH_KEY,
} from "@/lib/composites/constants";
import type {
  PendingCompositeInsertPayload,
  PendingCompositeRefreshPayload,
} from "@/lib/composites/types";
import { useScenarioStore } from "@/store/scenarioState";
import { GraphThemeProvider, useGraphTheme, GRAPH_LIGHT_COLORS } from "@/lib/context/GraphThemeContext";

function GraphPageContent() {
  const { isLightMode } = useGraphTheme();
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const scenarioPanelOpen = useUIStore((s) => s.scenarioPanelOpen);
  const setScenarioPanelOpen = useUIStore(
    (state) => state.setScenarioPanelOpen
  );
  const resetDetailPanels = useUIStore((state) => state.resetDetailPanels);
  const aiAssistantOpen = useUIStore((s) => s.aiAssistantOpen);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const setFloatingPanelOpen = useUIStore((s) => s.setFloatingPanelOpen);

  const loadProjects = useProjectStore((s) => s.load);
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("project");

  const prevProjectIdRef = useRef<string | null>(null);

  // Reset to baseline mode with sidebar open on page load
  useEffect(() => {
    setViewMode("baseline");
    setFloatingPanelOpen(true);
  }, [setViewMode, setFloatingPanelOpen]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Sync URL project param with store
  useEffect(() => {
    if (projectIdParam && projects.length > 0) {
      const targetProject = projects.find((p) => p.id === projectIdParam);
      if (targetProject && currentProjectId !== projectIdParam) {
        setCurrentProject(projectIdParam);
      }
    }
  }, [projectIdParam, projects, currentProjectId, setCurrentProject]);

  useEffect(() => {
    if (prevProjectIdRef.current === currentProjectId) {
      return;
    }
    prevProjectIdRef.current = currentProjectId ?? null;
    resetDetailPanels();
  }, [currentProjectId, resetDetailPanels]);

  const handleFitView = () => {
    console.log("Fit view triggered");
  };

  useKeyboardShortcuts({
    onFitView: handleFitView,
    enabled: true,
  });

  return (
    <ProjectGraphProvider>
      <PendingCompositeInsertHandler />
      <PendingCompositeRefreshHandler />
      <ScenarioAutoLoader />
      <ProjectAutoComputer />

      {/* Auth Overlay - shows when user tries to edit while not authenticated */}
      <AuthOverlay />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />

      <div 
        className={`flex h-screen flex-col ${isLightMode ? '' : 'dark'}`}
        style={isLightMode ? { backgroundColor: GRAPH_LIGHT_COLORS.pageBg } : { backgroundColor: '#0a0a0b' }}
      >
        {/* Topbar - barre supérieure */}
        <TopbarMinimal />

        {/* Contenu principal - zone de travail */}
        <div className="flex-1 relative overflow-hidden">
          {/* Canvas central avec ReactFlow - toujours plein écran */}
          <ReactFlowProvider>
            <GraphCanvas />

            {/* Bottom Toolbar - barre d'outils flottante centrée */}
            <BottomToolbar />

            {/* AI Assistant Bar - sans backdrop, interactions parallèles */}
            {aiAssistantOpen && <GraphAiBar />}

            {/* Library Panel */}
            <LibraryPanelWrapper />
          </ReactFlowProvider>

          {/* Collapsible Mode Panel - floating header when collapsed, full sidebar when expanded */}
          <CollapsibleModePanel />

          {/* Inspector - overlay flottant à droite */}
          <FloatingInspectorWrapper
            inspectorOpen={inspectorOpen}
            scenarioPanelOpen={scenarioPanelOpen}
            setScenarioPanelOpen={setScenarioPanelOpen}
          />
        </div>
      </div>
    </ProjectGraphProvider>
  );
}

function PendingCompositeInsertHandler() {
  const insertCompositeNode = useInsertCompositeNode();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const graphActions = useGraphActions();
  const { nodes } = useGraphData();
  const [pending, setPending] = useState<PendingCompositeInsertPayload | null>(
    null
  );
  const processingRef = useRef(false);
  const queryClient = useQueryClient();

  const resyncDependentEdges = useCallback(
    async (dependentIds?: string[] | null) => {
      if (!dependentIds || dependentIds.length === 0) return;
      for (const depId of dependentIds) {
        const target = nodes.find((n) => n.id === depId);
        const definition = target?.computation_definition;
        if (!definition) continue;
        try {
          await graphActions.updateNode(depId, {
            computation_definition: definition,
          });
        } catch (error) {
          console.warn("Failed to resynchronise edges for node", depId, error);
        }
      }
    },
    [graphActions, nodes]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(PENDING_COMPOSITE_INSERT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PendingCompositeInsertPayload;
      if (parsed?.compositeId) {
        setPending({
          compositeId: parsed.compositeId,
          projectId: parsed.projectId ?? null,
          mode: parsed.mode || "insert",
          nodesToDelete: parsed.nodesToDelete || [],
          replaceNodeId: parsed.replaceNodeId,
          replaceNodeSlug: parsed.replaceNodeSlug,
          position: parsed.position ?? null,
          dependentsToResync: parsed.dependentsToResync || [],
        });
      }
    } catch (error) {
      console.warn("Invalid pending composite payload", error);
    } finally {
      window.sessionStorage.removeItem(PENDING_COMPOSITE_INSERT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!pending?.compositeId) return;
    if (processingRef.current) return;
    if (pending.projectId && pending.projectId !== currentProjectId) {
      setCurrentProject(pending.projectId);
      return;
    }
    processingRef.current = true;
    (async () => {
      try {
        if (pending.mode === "transform" && pending.nodesToDelete?.length) {
          for (const nodeId of pending.nodesToDelete) {
            try {
              await graphActions.deleteNode(nodeId);
            } catch (error) {
              console.warn(
                "Unable to delete node during composite transform:",
                error
              );
            }
          }
        }
        const created = await insertCompositeNode(pending.compositeId, {
          slug: pending.replaceNodeSlug || undefined,
          position: pending.position || null,
        });
        await resyncDependentEdges(pending.dependentsToResync);
        toast.success(
          pending.mode === "transform"
            ? "Composite créé à partir du sous-graphe."
            : `Composite inséré : ${created?.label || "Composite"}`
        );
        if (pending.projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.projectExposedRoots(pending.projectId),
          });
        }
      } catch (error) {
        console.error("Failed to insert composite after return:", error);
        toast.error("Impossible d'insérer automatiquement ce composite.");
      } finally {
        processingRef.current = false;
        setPending(null);
      }
    })();
  }, [
    pending,
    currentProjectId,
    graphActions,
    insertCompositeNode,
    queryClient,
    resyncDependentEdges,
    setCurrentProject,
  ]);

  return null;
}

function PendingCompositeRefreshHandler() {
  const { nodes } = useGraphData();
  const graphActions = useGraphActions();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const [pending, setPending] = useState<PendingCompositeRefreshPayload | null>(
    null
  );
  const processingRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(PENDING_COMPOSITE_REFRESH_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PendingCompositeRefreshPayload;
      if (parsed?.compositeId) {
        setPending(parsed);
      }
    } catch (error) {
      console.warn("Invalid pending composite refresh payload", error);
    } finally {
      window.sessionStorage.removeItem(PENDING_COMPOSITE_REFRESH_KEY);
    }
  }, []);

  useEffect(() => {
    if (!pending?.compositeId) return;
    if (processingRef.current) return;
    if (pending.projectId && pending.projectId !== currentProjectId) {
      setCurrentProject(pending.projectId);
      return;
    }
    if (!nodes || nodes.length === 0) return;
    const targets = nodes.filter(
      (node) => node.composite_id === pending.compositeId
    );
    if (targets.length === 0) {
      setPending(null);
      return;
    }
    processingRef.current = true;
    (async () => {
      try {
        const computeFn = graphActions.computeNode;
        if (!computeFn) {
          graphActions.refreshNodes();
        } else {
          for (const node of targets) {
            await computeFn(node.id);
          }
        }
        toast.success("Composite mis à jour dans le projet.");
        const targetProject = pending.projectId || currentProjectId;
        if (targetProject) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.projectExposedRoots(targetProject),
          });
        }
      } catch (error) {
        console.error("Failed to recompute composite nodes:", error);
        toast.error("Impossible de recalculer les nœuds composites.");
      } finally {
        processingRef.current = false;
        setPending(null);
      }
    })();
  }, [
    pending,
    currentProjectId,
    graphActions,
    nodes,
    queryClient,
    setCurrentProject,
  ]);

  return null;
}

function ScenarioAutoLoader() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setScenarioComputedValues = useScenarioStore(
    (s) => s.setScenarioComputedValues
  );
  const computeWithScenario = useComputeWithScenario();
  const loadedRef = useRef(false);

  useEffect(() => {
    // Only load once when the component mounts
    if (loadedRef.current) return;
    if (!currentProjectId || !activeScenarioId) return;

    loadedRef.current = true;

    // Auto-load scenario values on page load
    (async () => {
      try {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId,
          scenarioId: activeScenarioId,
        });
        setScenarioComputedValues(activeScenarioId, result.results);
      } catch (error) {
        console.error("Failed to auto-load scenario values:", error);
      }
    })();
  }, [
    currentProjectId,
    activeScenarioId,
    computeWithScenario,
    setScenarioComputedValues,
  ]);

  return null;
}

function ProjectAutoComputer() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const graphActions = useGraphActions();
  const computedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentProjectId) return;
    if (computedRef.current === currentProjectId) return;

    const compute = async () => {
      if (graphActions.computeProject) {
        try {
          await graphActions.computeProject();
          computedRef.current = currentProjectId;
          // toast.success("Projet recalculé");
        } catch (e) {
          console.error("Auto-compute failed", e);
        }
      }
    };

    // Small delay to ensure everything is ready
    const timer = setTimeout(compute, 500);
    return () => clearTimeout(timer);
  }, [currentProjectId, graphActions]);

  return null;
}

export default function GraphPage() {
  return (
    <GraphThemeProvider>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            Loading...
          </div>
        }
      >
        <GraphPageContent />
      </Suspense>
    </GraphThemeProvider>
  );
}

function LibraryPanelWrapper() {
  const libraryPanelOpen = useUIStore((s) => s.libraryPanelOpen);
  const canEdit = useProjectStore((s) => s.canEdit)();
  
  // Don't show library panel if user can't edit (viewers/public)
  if (!libraryPanelOpen || !canEdit) return null;
  
  return (
    <div className="absolute left-0 top-0 z-10 h-full shadow-xl">
      <LibraryPanel />
    </div>
  );
}

function FloatingInspectorWrapper({
  inspectorOpen,
  scenarioPanelOpen,
  setScenarioPanelOpen,
}: {
  inspectorOpen: boolean;
  scenarioPanelOpen: boolean;
  setScenarioPanelOpen: (open: boolean) => void;
}) {
  const { isLightMode } = useGraphTheme();
  
  if (!inspectorOpen && !scenarioPanelOpen) return null;

  return (
    <div 
      className="absolute right-0 top-0 bottom-0 z-30 w-[320px] border-l overflow-hidden"
      style={isLightMode 
        ? { backgroundColor: GRAPH_LIGHT_COLORS.panelBg, borderColor: GRAPH_LIGHT_COLORS.panelBorder }
        : { backgroundColor: '#0a0a0b', borderColor: 'rgba(255,255,255,0.06)' }
      }
    >
      {inspectorOpen && <Inspector />}
      {scenarioPanelOpen && !inspectorOpen && (
        <ScenarioPanel
          isOpen={scenarioPanelOpen}
          onClose={() => setScenarioPanelOpen(false)}
        />
      )}
    </div>
  );
}
