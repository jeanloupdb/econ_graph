/**
 * TanStack Query hooks for API operations
 * Provides optimistic updates and cache management
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  Node,
  NodeCreate,
  NodeUpdate,
  Edge,
  EdgeCreate,
  CheckRulesResponse,
  Rule,
  Scenario,
  ScenarioCreate,
  ScenarioUpdate,
  ScenarioNodeOverride,
  OverrideBatchUpdate,
  ComputeAllScenarioResponse,
  CompareGraphResponse,
  ScenarioOverrideValidateResponse,
  Composite,
  CompositeCreateInput,
  CompositeUpdateInput,
  CompositeSummary,
  ProjectExposedRoots,
} from '../types';

// Query keys
export const queryKeys = {
  nodes: ['nodes'] as const,
  projectNodes: (project: string) => ['nodes', 'project', project] as const,
  projectEdges: (project: string) => ['edges', 'project', project] as const,
  node: (id: string) => ['nodes', id] as const,
  nodeDeps: (id: string) => ['nodes', id, 'deps'] as const,
  nodeDependents: (id: string) => ['nodes', id, 'dependents'] as const,
  nodeAncestors: (id: string) => ['nodes', id, 'ancestors'] as const,
  theme: ['ui', 'theme'] as const,
  nodeTones: (project: string) => ['ui', 'node-tones', project] as const,
  rules: ['rules'] as const,
  rule: (id: string) => ['rules', id] as const,
  scenarios: (project: string) => ['scenarios', 'project', project] as const,
  scenario: (id: string) => ['scenarios', id] as const,
  scenarioOverrides: (scenarioId: string) => ['scenarios', scenarioId, 'overrides'] as const,
  scenarioOverrideValidate: (scenarioId: string, nodeId: string) =>
    ['scenarios', scenarioId, 'override-validate', nodeId] as const,
  composites: ['composites'] as const,
  composite: (id: string) => ['composites', id] as const,
  projectExposedRoots: (projectId: string) => ['projects', projectId, 'exposed-roots'] as const,
};

// ============================================================================
// Node hooks
// ============================================================================

export function useNodes(options?: Omit<UseQueryOptions<Node[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<Node[], Error>({
    queryKey: queryKeys.nodes,
    queryFn: () => apiClient.get<Node[]>('/nodes'),
    ...options,
  });
}

export function useProjectNodes(
  project: string | null | undefined,
  options?: Omit<UseQueryOptions<Node[], Error>, 'queryKey' | 'queryFn'>
) {
  const projectParam = project || '';
  return useQuery<Node[], Error>({
    queryKey: queryKeys.projectNodes(projectParam),
    queryFn: () => apiClient.get<Node[]>(`/nodes${project ? `?project=${encodeURIComponent(project)}` : ''}`),
    enabled: !!project,
    staleTime: 30_000,
    ...options,
  });
}

export function useProjectEdges(
  project: string | null | undefined,
  options?: Omit<UseQueryOptions<Edge[], Error>, 'queryKey' | 'queryFn'>
) {
  const projectParam = project || '';
  return useQuery<Edge[], Error>({
    queryKey: queryKeys.projectEdges(projectParam),
    queryFn: () => apiClient.get<Edge[]>(`/edges${project ? `?project=${encodeURIComponent(project)}` : ''}`),
    enabled: !!project,
    staleTime: 30_000,
    ...options,
  });
}

export interface ThemeConfig {
  node_status: Record<string, { bg: string; border: string; text: string }>;
  node_tone?: Record<'root' | 'intermediate' | 'leaf' | 'error', { bg: string; border: string; text: string }>;
  edge_types: Record<string, { stroke: string }>;
  value_states: Record<string, { bg: string; border: string; text: string }>;
}

export function useTheme(options?: Omit<UseQueryOptions<ThemeConfig, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<ThemeConfig, Error>({
    queryKey: queryKeys.theme,
    queryFn: () => apiClient.get<ThemeConfig>('/ui/theme'),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}

export type NodeToneKey = 'root' | 'intermediate' | 'leaf' | 'error';
export type NodeTones = Record<string, { tone: NodeToneKey }>;

export function useNodeTones(
  project: string | null | undefined,
  options?: Omit<UseQueryOptions<NodeTones, Error>, 'queryKey' | 'queryFn'>
) {
  const p = project || '';
  return useQuery<NodeTones, Error>({
    queryKey: queryKeys.nodeTones(p),
    queryFn: () => apiClient.get<NodeTones>(`/ui/node-tones${project ? `?project=${encodeURIComponent(project)}` : ''}`),
    enabled: !!project,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}

export function useNode(
  id: string,
  options?: Omit<UseQueryOptions<Node, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Node, Error>({
    queryKey: queryKeys.node(id),
    queryFn: () => apiClient.get<Node>(`/nodes/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useNodeDependencies(
  id: string,
  project?: string,
  options?: Omit<UseQueryOptions<string[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<string[], Error>({
    queryKey: [...queryKeys.nodeDeps(id), project || ''],
    queryFn: () => apiClient.get<string[]>(`/nodes/${id}/dependencies${project ? `?project=${encodeURIComponent(project)}` : ''}`),
    enabled: !!id,
    ...options,
  });
}

export function useNodeDependents(
  id: string,
  project?: string,
  options?: Omit<UseQueryOptions<string[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<string[], Error>({
    queryKey: [...queryKeys.nodeDependents(id), project || ''],
    queryFn: () => apiClient.get<string[]>(`/nodes/${id}/dependents${project ? `?project=${encodeURIComponent(project)}` : ''}`),
    enabled: !!id,
    ...options,
  });
}

export function useNodeAncestors(
  id: string,
  project?: string,
  options?: Omit<UseQueryOptions<string[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<string[], Error>({
    queryKey: [...queryKeys.nodeAncestors(id), project || ''],
    queryFn: () => apiClient.get<string[]>(`/nodes/${id}/ancestors${project ? `?project=${encodeURIComponent(project)}` : ''}`),
    enabled: !!id,
    ...options,
  });
}

export function useCreateNode(
  options?: UseMutationOptions<Node, Error, NodeCreate>
) {
  const queryClient = useQueryClient();

  return useMutation<Node, Error, NodeCreate>({
    mutationFn: (data) => apiClient.post<Node, NodeCreate>('/nodes', data),
    onSuccess: (newNode) => {
      // Update cache optimistically
      queryClient.setQueryData<Node[]>(queryKeys.nodes, (old) => {
        return old ? [...old, newNode] : [newNode];
      });
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
    },
    ...options,
  });
}


export function useCreateEdge(
  options?: UseMutationOptions<Edge, Error, EdgeCreate>
) {
  const queryClient = useQueryClient();

  return useMutation<Edge, Error, EdgeCreate>({
    mutationFn: (data) => apiClient.post<Edge, EdgeCreate>('/edges', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
    },
    ...options,
  });
}

export function useUpdateNode(
  nodeId: string,
  options?: UseMutationOptions<Node, Error, NodeUpdate>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NodeUpdate) => apiClient.patch<Node, NodeUpdate>(`/nodes/${nodeId}`, data),
    onMutate: async (updatedData: NodeUpdate) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.node(nodeId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.nodes });

      // Snapshot previous values
      const previousNode = queryClient.getQueryData<Node>(queryKeys.node(nodeId));
      const previousNodes = queryClient.getQueryData<Node[]>(queryKeys.nodes);

      // Optimistically update
      if (previousNode) {
        const optimisticNode = { ...previousNode, ...updatedData };
        queryClient.setQueryData<Node>(queryKeys.node(nodeId), optimisticNode);
      }

      if (previousNodes) {
        queryClient.setQueryData<Node[]>(
          queryKeys.nodes,
          previousNodes.map((node) =>
            node.id === nodeId ? { ...node, ...updatedData } : node
          )
        );
      }

      return { previousNode, previousNodes };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if ((context as any)?.previousNode) {
        queryClient.setQueryData<Node>(queryKeys.node(nodeId), (context as any).previousNode);
      }
      if ((context as any)?.previousNodes) {
        queryClient.setQueryData<Node[]>(queryKeys.nodes, (context as any).previousNodes);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.node(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
    },
    ...options,
  });
}

// ============================================================================
// Composite hooks
// ============================================================================

export function useComposites(
  options?: Omit<UseQueryOptions<CompositeSummary[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CompositeSummary[], Error>({
    queryKey: queryKeys.composites,
    queryFn: () => apiClient.get<CompositeSummary[]>('/composites'),
    ...options,
  });
}

export function useComposite(
  id: string | null,
  options?: Omit<UseQueryOptions<Composite, Error>, 'queryKey' | 'queryFn'>
) {
  const key = id ? queryKeys.composite(id) : ['composites', ''] as const;
  return useQuery<Composite, Error>({
    queryKey: key,
    queryFn: () => apiClient.get<Composite>(`/composites/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useProjectExposedRoots(
  projectId: string | null,
  options?: Omit<UseQueryOptions<ProjectExposedRoots, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProjectExposedRoots, Error>({
    queryKey: projectId ? queryKeys.projectExposedRoots(projectId) : ['projects', 'exposed-roots', ''] as const,
    queryFn: () => apiClient.get<ProjectExposedRoots>(`/projects/${projectId}/exposed-roots`),
    enabled: !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useCreateComposite(
  options?: UseMutationOptions<Composite, Error, CompositeCreateInput>
) {
  const queryClient = useQueryClient();
  return useMutation<Composite, Error, CompositeCreateInput>({
    mutationFn: (payload) => apiClient.post<Composite, CompositeCreateInput>('/composites', payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.composites });
      queryClient.setQueryData(queryKeys.composite(created.id), created);
    },
    ...options,
  });
}

export function useUpdateComposite(
  compositeId: string,
  options?: UseMutationOptions<Composite, Error, CompositeUpdateInput>
) {
  const queryClient = useQueryClient();
  return useMutation<Composite, Error, CompositeUpdateInput>({
    mutationFn: (payload) =>
      apiClient.patch<Composite, CompositeUpdateInput>(`/composites/${compositeId}`, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.composites });
      queryClient.setQueryData(queryKeys.composite(compositeId), updated);
    },
    ...options,
  });
}

export function useDeleteComposite(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete<void>(`/composites/${id}`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.composites });
      queryClient.removeQueries({ queryKey: queryKeys.composite(id) });
    },
    ...options,
  });
}

export function useDeleteNode(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nodeId: string) => apiClient.delete<void>(`/nodes/${nodeId}`),
    onMutate: async (nodeId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.nodes });

      // Snapshot previous value
      const previousNodes = queryClient.getQueryData<Node[]>(queryKeys.nodes);

      // Optimistically remove
      if (previousNodes) {
        queryClient.setQueryData<Node[]>(
          queryKeys.nodes,
          previousNodes.filter((node) => node.id !== nodeId)
        );
      }

      return { previousNodes };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if ((context as any)?.previousNodes) {
        queryClient.setQueryData<Node[]>(queryKeys.nodes, (context as any).previousNodes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
    },
    ...options,
  });
}

// ============================================================================
// Rules hooks
// ============================================================================

export function useCheckRules(
  options?: UseMutationOptions<CheckRulesResponse, Error, { scope?: string }>
) {
  return useMutation<CheckRulesResponse, Error, { scope?: string }>({
    mutationFn: (data) => apiClient.post<CheckRulesResponse>('/rules/check', data),
    ...options,
  });
}

export function useRules(
  options?: Omit<UseQueryOptions<Rule[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Rule[], Error>({
    queryKey: queryKeys.rules,
    queryFn: () => apiClient.get<Rule[]>('/rules'),
    ...options,
  });
}

// ============================================================================
// Apply suggestion hook
// ============================================================================

export function useApplySuggestion(
  options?: UseMutationOptions<
    Node,
    Error,
    { nodeId: string; update: NodeUpdate }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    Node,
    Error,
    { nodeId: string; update: NodeUpdate }
  >({
    mutationFn: ({ nodeId, update }) =>
      apiClient.patch<Node, NodeUpdate>(`/nodes/${nodeId}`, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
    },
    ...options,
  });
}

// ============================================================================
// Computation hooks
// ============================================================================

export interface ComputeResponse {
  node_id: string;
  value: number | null;
  error: string | null;
  computed_at: string | null;
}

export interface ComputeAllResponse {
  results: Record<string, ComputeResponse>;
  total_computed: number;
  total_errors: number;
}

export function useComputeNode(
  options?: UseMutationOptions<ComputeResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation<ComputeResponse, Error, string>({
    mutationFn: (nodeId) => apiClient.post<ComputeResponse>(`/compute/nodes/${nodeId}`, {}),
    onSuccess: (result) => {
      // Invalidate node queries to refetch updated computed values
      queryClient.invalidateQueries({ queryKey: queryKeys.node(result.node_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
    },
    ...options,
  });
}

export function useCompareScenarios(
  options?: UseMutationOptions<
    CompareGraphResponse,
    Error,
    { projectId?: string; scenarioAId: string; scenarioBId: string }
  >
) {
  return useMutation<
    CompareGraphResponse,
    Error,
    { projectId?: string; scenarioAId: string; scenarioBId: string }
  >({
    mutationFn: ({ projectId, scenarioAId, scenarioBId }) => {
      const params = new URLSearchParams();
      if (projectId) params.set('project', projectId);
      const query = params.toString();
      return apiClient.post<CompareGraphResponse>(
        `/compute/compare${query ? `?${query}` : ''}`,
        {
          scenario_a_id: scenarioAId,
          scenario_b_id: scenarioBId,
        },
      );
    },
    ...options,
  });
}

export function useComputeAll(
  options?: UseMutationOptions<ComputeAllResponse, Error, void>
) {
  const queryClient = useQueryClient();

  return useMutation<ComputeAllResponse, Error, void>({
    mutationFn: () => apiClient.post<ComputeAllResponse>('/compute/all', {}),
    onSuccess: () => {
      // Invalidate all node queries to refetch updated computed values
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
    },
    ...options,
  });
}

export function useComputeWithScenario(
  options?: UseMutationOptions<ComputeAllScenarioResponse, Error, { projectId?: string; scenarioId?: string | null }>
) {
  return useMutation<ComputeAllScenarioResponse, Error, { projectId?: string; scenarioId?: string | null }>({
    mutationFn: ({ projectId, scenarioId }) => {
      const params = new URLSearchParams();
      if (projectId) params.set('project', projectId);
      if (scenarioId) params.set('scenario_id', scenarioId);
      const queryString = params.toString();
      return apiClient.post<ComputeAllScenarioResponse>(`/compute/all${queryString ? `?${queryString}` : ''}`, {});
    },
    onSuccess: () => {
      // DON'T invalidate node queries when computing scenarios
      // Scenario values are stored in scenarioComputedValues and displayed from there
      // Invalidating would refetch nodes with baseline values and cause flickering
    },
    ...options,
  });
}

// ============================================================================
// Scenario hooks
// ============================================================================

export function useScenarios(
  projectId: string | null | undefined,
  options?: Omit<UseQueryOptions<Scenario[], Error>, 'queryKey' | 'queryFn'>
) {
  const p = projectId || '';
  return useQuery<Scenario[], Error>({
    queryKey: queryKeys.scenarios(p),
    queryFn: () => apiClient.get<Scenario[]>(`/api/projects/${projectId}/scenarios`),
    enabled: !!projectId,
    ...options,
  });
}

export function useScenario(
  scenarioId: string | null | undefined,
  options?: Omit<UseQueryOptions<Scenario, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Scenario, Error>({
    queryKey: queryKeys.scenario(scenarioId || ''),
    queryFn: () => apiClient.get<Scenario>(`/api/scenarios/${scenarioId}`),
    enabled: !!scenarioId,
    ...options,
  });
}

export function useCreateScenario(
  options?: UseMutationOptions<Scenario, Error, { projectId: string; data: ScenarioCreate }>
) {
  const queryClient = useQueryClient();

  return useMutation<Scenario, Error, { projectId: string; data: ScenarioCreate }>({
    mutationFn: ({ projectId, data }) =>
      apiClient.post<Scenario>(`/api/projects/${projectId}/scenarios`, data),
    onSuccess: (_, variables) => {
      // Invalidate scenarios list for this project
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios(variables.projectId) });
    },
    ...options,
  });
}

export function useDuplicateScenario(
  options?: UseMutationOptions<Scenario, Error, { scenarioId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation<Scenario, Error, { scenarioId: string }>({
    mutationFn: ({ scenarioId }) =>
      apiClient.post<Scenario>(`/api/scenarios/${scenarioId}/duplicate`, {}),
    onSuccess: (result) => {
      // Invalidate scenarios list for this project
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios(result.project_id) });
    },
    ...options,
  });
}

export function useUpdateScenario(
  options?: UseMutationOptions<Scenario, Error, { scenarioId: string; data: ScenarioUpdate }>
) {
  const queryClient = useQueryClient();

  return useMutation<Scenario, Error, { scenarioId: string; data: ScenarioUpdate }>({
    mutationFn: ({ scenarioId, data }) =>
      apiClient.patch<Scenario, ScenarioUpdate>(`/api/scenarios/${scenarioId}`, data),
    onSuccess: (result) => {
      // Invalidate scenario and scenarios list
      queryClient.invalidateQueries({ queryKey: queryKeys.scenario(result.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios(result.project_id) });
    },
    ...options,
  });
}

export function useDeleteScenario(
  options?: UseMutationOptions<void, Error, { scenarioId: string; projectId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { scenarioId: string; projectId: string }>({
    mutationFn: ({ scenarioId }) =>
      apiClient.delete(`/api/scenarios/${scenarioId}`),
    onSuccess: (_, variables) => {
      // Invalidate scenarios list
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios(variables.projectId) });
    },
    ...options,
  });
}

export function useScenarioOverrides(
  scenarioId: string | null | undefined,
  options?: Omit<UseQueryOptions<ScenarioNodeOverride[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ScenarioNodeOverride[], Error>({
    queryKey: queryKeys.scenarioOverrides(scenarioId || ''),
    queryFn: () => apiClient.get<ScenarioNodeOverride[]>(`/api/scenarios/${scenarioId}/overrides`),
    enabled: !!scenarioId,
    ...options,
  });
}

export function useUpdateOverrides(
  options?: UseMutationOptions<
    ScenarioNodeOverride[],
    Error,
    { scenarioId: string; projectId?: string | null; data: OverrideBatchUpdate }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<
    ScenarioNodeOverride[],
    Error,
    { scenarioId: string; projectId?: string | null; data: OverrideBatchUpdate }
  >({
    mutationFn: ({ scenarioId, data }) =>
      apiClient.put<ScenarioNodeOverride[], OverrideBatchUpdate>(`/api/scenarios/${scenarioId}/overrides`, data),
    onSuccess: (_, variables) => {
      // Invalidate overrides and scenario
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarioOverrides(variables.scenarioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scenario(variables.scenarioId) });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scenarios(variables.projectId) });
      }
    },
    ...options,
  });
}

export function useValidateOverride(
  options?: UseMutationOptions<
    ScenarioOverrideValidateResponse,
    Error,
    { scenarioId: string; nodeId: string; code: string; realValue: number }
  >,
) {
  return useMutation<
    ScenarioOverrideValidateResponse,
    Error,
    { scenarioId: string; nodeId: string; code: string; realValue: number }
  >({
    mutationFn: ({ scenarioId, nodeId, code, realValue }) =>
      apiClient.post<
        ScenarioOverrideValidateResponse,
        { node_id: string; code: string; real_value: number }
      >(`/api/scenarios/${scenarioId}/overrides/validate`, {
        node_id: nodeId,
        code,
        real_value: realValue,
      }),
    ...options,
  });
}

// ============================================================================
// AI Usage hooks
// ============================================================================

export interface DailyUsage {
  date: string;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_eur: number;
}

export interface MonthlyUsage {
  month: string;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_eur: number;
}

export interface AIUsageStats {
  total_requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  estimated_cost_eur: number;
  daily_usage: DailyUsage[];
  monthly_usage: MonthlyUsage[];
}

export function useAIUsage(
  options?: Omit<UseQueryOptions<AIUsageStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AIUsageStats, Error>({
    queryKey: ['ai-usage'] as const,
    queryFn: () => apiClient.get<AIUsageStats>('/ai/usage'),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  });
}
