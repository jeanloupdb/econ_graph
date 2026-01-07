'use client';

/**
 * GraphPageOrchestrator
 * 
 * Orchestre tous les effets de bord et la logique métier de la page graph.
 * Sépare clairement les responsabilités :
 * - Gestion des pending actions (composites)
 * - Auto-loading des données (scenarios, projects)
 * - Synchronisation URL ↔ Store
 * - Keyboard shortcuts
 * 
 * La page devient un simple layout renderer.
 */

import { useGraphActions } from '@/graph/context/GraphActionsContext';
import { useGraphData } from '@/graph/context/GraphDataContext';
import { useInsertCompositeNode } from '@/graph/hooks/useInsertCompositeNode';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { queryKeys, useComputeWithScenario } from '@/lib/api/hooks';
import { PENDING_COMPOSITE_INSERT_KEY, PENDING_COMPOSITE_REFRESH_KEY } from '@/lib/composites/constants';
import type { PendingCompositeInsertPayload, PendingCompositeRefreshPayload } from '@/lib/composites/types';
import { useProjectStore } from '@/store/projectState';
import { useScenarioStore } from '@/store/scenarioState';
import { useUIStore } from '@/store/uiState';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// URL SYNC HANDLER
// ============================================================================

function useURLProjectSync() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project');
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const loadProjects = useProjectStore((s) => s.load);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Sync URL param with store
  useEffect(() => {
    if (projectIdParam && projects.length > 0) {
      const targetProject = projects.find(p => p.id === projectIdParam);
      if (targetProject && currentProjectId !== projectIdParam) {
        setCurrentProject(projectIdParam);
      }
    }
  }, [projectIdParam, projects, currentProjectId, setCurrentProject]);
}

// ============================================================================
// PANEL RESET HANDLER
// ============================================================================

function usePanelResetOnProjectChange() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const prevProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevProjectIdRef.current === currentProjectId) return;
    prevProjectIdRef.current = currentProjectId ?? null;
    resetDetailPanels();
  }, [currentProjectId, resetDetailPanels]);
}

// ============================================================================
// KEYBOARD SHORTCUTS HANDLER
// ============================================================================

function useGraphKeyboardShortcuts() {
  const handleFitView = useCallback(() => {
    console.log('Fit view triggered');
    // This will be handled by ReactFlow's fitView
  }, []);

  useKeyboardShortcuts({
    onFitView: handleFitView,
    enabled: true,
  });
}

// ============================================================================
// PENDING COMPOSITE INSERT HANDLER
// ============================================================================

function usePendingCompositeInsert() {
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

  // Read from sessionStorage on mount
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

  // Process pending insertion
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
}

// ============================================================================
// PENDING COMPOSITE REFRESH HANDLER
// ============================================================================

function usePendingCompositeRefresh() {
  const { nodes } = useGraphData();
  const graphActions = useGraphActions();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const [pending, setPending] = useState<PendingCompositeRefreshPayload | null>(null);
  const processingRef = useRef(false);
  const queryClient = useQueryClient();

  // Read from sessionStorage on mount
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

  // Process pending refresh
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
}

// ============================================================================
// SCENARIO AUTO LOADER
// ============================================================================

function useScenarioAutoLoader() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setScenarioComputedValues = useScenarioStore((s) => s.setScenarioComputedValues);
  const computeWithScenario = useComputeWithScenario();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    if (!currentProjectId || !activeScenarioId) return;

    loadedRef.current = true;

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
}

// ============================================================================
// PROJECT AUTO COMPUTER
// ============================================================================

function useProjectAutoComputer() {
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
        } catch (e) {
          console.error("Auto-compute failed", e);
        }
      }
    };

    const timer = setTimeout(compute, 500);
    return () => clearTimeout(timer);
  }, [currentProjectId, graphActions]);
}

// ============================================================================
// MAIN ORCHESTRATOR COMPONENT
// ============================================================================

/**
 * GraphPageOrchestrator
 * 
 * Composant invisible qui orchestre tous les effets de bord.
 * Utilise le pattern "Custom Hooks" pour séparer chaque responsabilité.
 */
export function GraphPageOrchestrator() {
  // URL & Project sync
  useURLProjectSync();
  usePanelResetOnProjectChange();
  
  // Keyboard
  useGraphKeyboardShortcuts();
  
  // Pending actions
  usePendingCompositeInsert();
  usePendingCompositeRefresh();
  
  // Auto-loaders
  useScenarioAutoLoader();
  useProjectAutoComputer();

  // This component doesn't render anything
  return null;
}




