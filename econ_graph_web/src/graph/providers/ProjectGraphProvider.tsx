import { GraphActionsProvider } from '@/graph/context/GraphActionsContext';
import { GraphDataProvider, type NodePositionUpdate } from '@/graph/context/GraphDataContext';
import { apiClient } from '@/lib/api/client';
import { queryKeys, useProjectNodes } from '@/lib/api/hooks';
import type { Node, NodeCreate, NodeUpdate } from '@/lib/types';
import { useProjectStore } from '@/store/projectState';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';

interface ProjectGraphProviderProps {
  children: ReactNode;
}

export function ProjectGraphProvider({ children }: ProjectGraphProviderProps) {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const nodesQuery = useProjectNodes(currentProjectId);
  const queryClient = useQueryClient();

  const persistNodePositions = useCallback(async (updates: NodePositionUpdate[]) => {
    if (!updates.length) return;
    await Promise.all(
      updates.map(({ id, x, y }) =>
        apiClient.patch(`/nodes/${id}`, {
          pos_x: x,
          pos_y: y,
        }).catch(() => {})
      )
    );
  }, []);

  const nodes = Array.isArray(nodesQuery.data) ? nodesQuery.data : [];

  const refreshNodes = useCallback(() => {
    void nodesQuery.refetch();
  }, [nodesQuery]);

  const dataValue = useMemo(
    () => ({
      nodes,
      isLoading: nodesQuery.isLoading,
      refresh: refreshNodes,
      persistNodePositions,
    }),
    [nodes, nodesQuery.isLoading, refreshNodes, persistNodePositions]
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
        const created = await apiClient.post<Node, NodeCreate>('/nodes', ensureProjectPayload(payload));
        refreshNodes();
        invalidateExposedRoots();
        return created;
      },
      updateNode: async (id: string, payload: NodeUpdate) => {
        const updated = await apiClient.patch<Node, NodeUpdate>(`/nodes/${id}`, payload);
        refreshNodes();
        invalidateExposedRoots();
        return updated;
      },
      deleteNode: async (id: string) => {
        await apiClient.delete<void>(`/nodes/${id}`);
        refreshNodes();
        invalidateExposedRoots();
      },
      computeNode: async (id: string) => {
        await apiClient.post(`/compute/nodes/${id}`, {});
        refreshNodes();
      },
      computeProject: async () => {
        if (!currentProjectId) return;
        await apiClient.post(`/compute/all?project=${currentProjectId}`, {});
        refreshNodes();
      },
      refreshNodes,
      refreshScenarios: () => {
        if (currentProjectId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.scenarios(currentProjectId) });
        }
      }
    };
  }, [currentProjectId, invalidateExposedRoots, nodes, refreshNodes, queryClient]);

  return (
    <GraphDataProvider value={dataValue}>
      <GraphActionsProvider value={actionsValue}>
        {children}
      </GraphActionsProvider>
    </GraphDataProvider>
  );
}
