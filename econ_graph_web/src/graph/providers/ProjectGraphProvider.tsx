import { GraphActionsProvider } from '@/graph/context/GraphActionsContext';
import { GraphDataProvider, type NodePositionUpdate } from '@/graph/context/GraphDataContext';
import { apiClient } from '@/lib/api/client';
import { queryKeys, useProjectNodes, useProjectEdges } from '@/lib/api/hooks';
import type { Node, NodeCreate, NodeUpdate } from '@/lib/types';
import { useProjectStore } from '@/store/projectState';
import { useCommandHistoryStore, setRefreshNodesCallback } from '@/store/commandHistory';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useEffect } from 'react';
import {
  buildNodeCreateCommand,
  buildNodeUpdateCommand,
  buildNodeDeleteCommand,
  snapshotNodeForUndo,
} from '@/lib/commands';

interface ProjectGraphProviderProps {
  children: ReactNode;
}

export function ProjectGraphProvider({ children }: ProjectGraphProviderProps) {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const nodesQuery = useProjectNodes(currentProjectId);
  const edgesQuery = useProjectEdges(currentProjectId);
  const queryClient = useQueryClient();
  const setHistoryCurrentProject = useCommandHistoryStore((s) => s.setCurrentProject);
  const pushCommand = useCommandHistoryStore((s) => s.pushCommand);

  // Set up command history for this project
  useEffect(() => {
    setHistoryCurrentProject(currentProjectId);
  }, [currentProjectId, setHistoryCurrentProject]);

  // Extract nodes and edges first
  const nodes = Array.isArray(nodesQuery.data) ? nodesQuery.data : [];
  const edges = Array.isArray(edgesQuery.data) ? edgesQuery.data : [];

  const persistNodePositions = useCallback(async (updates: NodePositionUpdate[]) => {
    if (!updates.length) return;
    
    console.log('[GRAPH PROVIDER] persistNodePositions called:', updates);
    
    // Record commands for each position update
    for (const update of updates) {
      const currentNode = nodes.find((n) => n.id === update.id);
      if (currentNode && currentProjectId) {
        // Capture old position
        const previousState = snapshotNodeForUndo(currentNode);
        
        // Create update command for position change
        const command = buildNodeUpdateCommand(
          currentProjectId,
          update.id,
          previousState,
          { pos_x: update.x, pos_y: update.y },
          currentNode.label
        );
        console.log('[GRAPH PROVIDER] Pushing position update command:', command);
        pushCommand(command);
      }
    }
    
    // Apply the updates
    await Promise.all(
      updates.map(({ id, x, y }) =>
        apiClient.patch(`/nodes/${id}`, {
          pos_x: x,
          pos_y: y,
        }).catch(() => {})
      )
    );
  }, [nodes, currentProjectId, pushCommand]);

  const refreshNodes = useCallback(async () => {
    console.log('[GRAPH PROVIDER] refreshNodes() called - FULL REFRESH');
    
    // Force invalidate ALL related queries
    await queryClient.invalidateQueries({ queryKey: ['nodes'] });
    await queryClient.invalidateQueries({ queryKey: ['edges'] });
    await queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    await queryClient.invalidateQueries({ queryKey: ['project-stats'] });
    
    console.log('[GRAPH PROVIDER] Queries invalidated, refetching...');
    
    // Force refetch with explicit wait
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['nodes'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['edges'], type: 'active' }),
    ]);
    
    console.log('[GRAPH PROVIDER] Refetch complete');
    
    // Additional small delay for React to process updates
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log('[GRAPH PROVIDER] refreshNodes() completed');
  }, [queryClient]);

  // Set up the refresh callback for undo/redo
  useEffect(() => {
    setRefreshNodesCallback(refreshNodes);
    return () => setRefreshNodesCallback(() => {});
  }, [refreshNodes]);

  const dataValue = useMemo(
    () => ({
      nodes,
      edges,
      isLoading: nodesQuery.isLoading || edgesQuery.isLoading,
      refresh: refreshNodes,
      persistNodePositions,
    }),
    [nodes, edges, nodesQuery.isLoading, edgesQuery.isLoading, refreshNodes, persistNodePositions]
  );

  const invalidateExposedRoots = useCallback(() => {
    if (!currentProjectId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.projectExposedRoots(currentProjectId) });
  }, [currentProjectId, queryClient]);

  const actionsValue = useMemo(() => {
    const ensureProjectPayload = (payload: NodeCreate): NodeCreate => ({
      ...payload,
      slug: payload.slug?.trim() || payload.slug,
      project_id: payload.project_id ?? currentProjectId ?? 'default',
    });

    return {
      mode: 'project' as const,
      getNodeById: (id: string) => nodes.find((n) => n.id === id),
      createNode: async (payload: NodeCreate) => {
        console.log('[GRAPH PROVIDER] createNode called with payload:', payload);
        const created = await apiClient.post<Node, NodeCreate>('/nodes', ensureProjectPayload(payload));
        
        // Record command for undo/redo
        if (currentProjectId && created) {
          const command = buildNodeCreateCommand(
            currentProjectId,
            created.id,
            payload,
            created.label
          );
          console.log('[GRAPH PROVIDER] Pushing create command:', command);
          pushCommand(command);
        }
        
        await refreshNodes();
        invalidateExposedRoots();
        return created;
      },
      updateNode: async (id: string, payload: NodeUpdate) => {
        console.log('[GRAPH PROVIDER] updateNode called:', { id, payload });
        
        // Capture current state BEFORE updating for undo
        const currentNode = nodes.find((n) => n.id === id);
        const previousState = currentNode ? snapshotNodeForUndo(currentNode) : null;
        
        const updated = await apiClient.patch<Node, NodeUpdate>(`/nodes/${id}`, payload);
        
        // Record command for undo/redo
        if (currentProjectId && currentNode && previousState) {
          const command = buildNodeUpdateCommand(
            currentProjectId,
            id,
            previousState,
            payload,
            currentNode.label
          );
          console.log('[GRAPH PROVIDER] Pushing update command:', command);
          pushCommand(command);
        } else {
          console.warn('[GRAPH PROVIDER] Could not push update command:', {
            hasProjectId: !!currentProjectId,
            hasCurrentNode: !!currentNode,
            hasPreviousState: !!previousState,
          });
        }
        
        await refreshNodes();
        invalidateExposedRoots();
        return updated;
      },
      deleteNode: async (id: string) => {
        console.log('[GRAPH PROVIDER] deleteNode called:', id);
        
        // Capture current state BEFORE deleting for undo
        const currentNode = nodes.find((n) => n.id === id);
        
        // Record command for undo/redo BEFORE deleting
        if (currentProjectId && currentNode) {
          const command = buildNodeDeleteCommand(currentProjectId, currentNode);
          console.log('[GRAPH PROVIDER] Pushing delete command:', command);
          pushCommand(command);
        }
        
        await apiClient.delete<void>(`/nodes/${id}`);
        await refreshNodes();
        invalidateExposedRoots();
      },
      computeNode: async (id: string) => {
        await apiClient.post(`/compute/nodes/${id}`, {});
        await refreshNodes();
      },
      computeProject: async () => {
        if (!currentProjectId) return;
        await apiClient.post(`/compute/all?project=${currentProjectId}`, {});
        await refreshNodes();
      },
      refreshNodes,
      refreshScenarios: () => {
        if (currentProjectId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.scenarios(currentProjectId) });
        }
      }
    };
  }, [currentProjectId, invalidateExposedRoots, nodes, refreshNodes, queryClient, pushCommand]);

  return (
    <GraphDataProvider value={dataValue}>
      <GraphActionsProvider value={actionsValue}>
        {children}
      </GraphActionsProvider>
    </GraphDataProvider>
  );
}
