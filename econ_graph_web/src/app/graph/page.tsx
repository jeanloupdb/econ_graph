'use client';

import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { Inspector } from '@/components/panels/Inspector';
import { ScenarioPanel } from '@/components/panels/ScenarioPanel';
import { Topbar } from '@/components/chrome/Topbar';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useUIStore } from '@/store/uiState';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '@/store/projectState';
import { ProjectGraphProvider } from '@/graph/providers/ProjectGraphProvider';
import { useInsertCompositeNode } from '@/graph/hooks/useInsertCompositeNode';
import { PENDING_COMPOSITE_INSERT_KEY, PENDING_COMPOSITE_REFRESH_KEY } from '@/lib/composites/constants';
import { useGraphActions } from '@/graph/context/GraphActionsContext';
import { useGraphData } from '@/graph/context/GraphDataContext';
import { toast } from 'sonner';
import type { PendingCompositeInsertPayload, PendingCompositeRefreshPayload } from '@/lib/composites/types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, useComputeWithScenario } from '@/lib/api/hooks';
import { useScenarioStore } from '@/store/scenarioState';

export default function GraphPage() {
  const inspectorOpen = useUIStore((state) => state.inspectorOpen);
  const scenarioPanelOpen = useUIStore((state) => state.scenarioPanelOpen);
  const setScenarioPanelOpen = useUIStore((state) => state.setScenarioPanelOpen);
  const resetDetailPanels = useUIStore((state) => state.resetDetailPanels);
  const loadProjects = useProjectStore((s) => s.load);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const prevProjectIdRef = useRef<string | null>(null);
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  useEffect(() => {
    if (prevProjectIdRef.current === currentProjectId) {
      return;
    }
    prevProjectIdRef.current = currentProjectId ?? null;
    resetDetailPanels();
  }, [currentProjectId, resetDetailPanels]);

  const handleFitView = () => {
    // This will be handled by ReactFlow's fitView
    console.log('Fit view triggered');
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
      <div className="flex h-screen flex-col">
        <Topbar />

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <GraphCanvas />
          </div>

          {scenarioPanelOpen ? (
            <ScenarioPanel
              isOpen={scenarioPanelOpen}
              onClose={() => setScenarioPanelOpen(false)}
            />
          ) : (
            inspectorOpen && <Inspector />
          )}
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
  const [pending, setPending] = useState<PendingCompositeInsertPayload | null>(null);
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
          console.warn('Failed to resynchronise edges for node', depId, error);
        }
      }
    },
    [graphActions, nodes]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(PENDING_COMPOSITE_INSERT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PendingCompositeInsertPayload;
      if (parsed?.compositeId) {
        setPending({
          compositeId: parsed.compositeId,
          projectId: parsed.projectId ?? null,
          mode: parsed.mode || 'insert',
          nodesToDelete: parsed.nodesToDelete || [],
          replaceNodeId: parsed.replaceNodeId,
          replaceNodeSlug: parsed.replaceNodeSlug,
          position: parsed.position ?? null,
          dependentsToResync: parsed.dependentsToResync || [],
        });
      }
    } catch (error) {
      console.warn('Invalid pending composite payload', error);
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
        if (pending.mode === 'transform' && pending.nodesToDelete?.length) {
          for (const nodeId of pending.nodesToDelete) {
            try {
              await graphActions.deleteNode(nodeId);
            } catch (error) {
              console.warn('Unable to delete node during composite transform:', error);
            }
          }
        }
        const created = await insertCompositeNode(pending.compositeId, {
          slug: pending.replaceNodeSlug || undefined,
          position: pending.position || null,
        });
        await resyncDependentEdges(pending.dependentsToResync);
        toast.success(
          pending.mode === 'transform'
            ? 'Composite créé à partir du sous-graphe.'
            : `Composite inséré : ${created?.label || 'Composite'}`
        );
        if (pending.projectId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.projectExposedRoots(pending.projectId) });
        }
      } catch (error) {
        console.error('Failed to insert composite after return:', error);
        toast.error("Impossible d'insérer automatiquement ce composite.");
      } finally {
        processingRef.current = false;
        setPending(null);
      }
    })();
  }, [pending, currentProjectId, graphActions, insertCompositeNode, queryClient, resyncDependentEdges, setCurrentProject]);

  return null;
}

function PendingCompositeRefreshHandler() {
  const { nodes } = useGraphData();
  const graphActions = useGraphActions();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const [pending, setPending] = useState<PendingCompositeRefreshPayload | null>(null);
  const processingRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(PENDING_COMPOSITE_REFRESH_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PendingCompositeRefreshPayload;
      if (parsed?.compositeId) {
        setPending(parsed);
      }
    } catch (error) {
      console.warn('Invalid pending composite refresh payload', error);
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
    const targets = nodes.filter((node) => node.composite_id === pending.compositeId);
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
        toast.success('Composite mis à jour dans le projet.');
        const targetProject = pending.projectId || currentProjectId;
        if (targetProject) {
          queryClient.invalidateQueries({ queryKey: queryKeys.projectExposedRoots(targetProject) });
        }
      } catch (error) {
        console.error('Failed to recompute composite nodes:', error);
        toast.error('Impossible de recalculer les nœuds composites.');
      } finally {
        processingRef.current = false;
        setPending(null);
      }
    })();
  }, [pending, currentProjectId, graphActions, nodes, queryClient, setCurrentProject]);

  return null;
}

function ScenarioAutoLoader() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setScenarioComputedValues = useScenarioStore((s) => s.setScenarioComputedValues);
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
        console.error('Failed to auto-load scenario values:', error);
      }
    })();
  }, [currentProjectId, activeScenarioId, computeWithScenario, setScenarioComputedValues]);

  return null;
}
