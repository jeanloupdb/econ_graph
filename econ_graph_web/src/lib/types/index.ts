/**
 * Core types for the SmartGraph application
 * These are used throughout the application until OpenAPI types are generated
 */

export type NodeStatus = 'unknown' | 'observed' | 'imposed' | 'implied' | 'invalid';

export type NodeUnit = string; // free-form unit label stored from backend

export type PlausibleRange = [number, number];

// Algo-only: no manual/computed flag or computation mode enums

export interface CompositeRootInfo {
  id: string;
  slug?: string | null;
  label?: string | null;
  unit?: string | null;
  provider_type?: string | null;
  provider_url?: string | null;
  composite_id?: string | null;
  overridable?: boolean | null;
  current_value?: number | null;
  raw_internal_id?: string | null;
}

export interface Node {
  id: string;
  slug: string;
  label: string;
  unit: NodeUnit;
  status: NodeStatus;
  confidence: number;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;

  // Computation fields
  value_computed?: number | null;
  computation_definition?: string | null;
  last_computed_at?: string | null;
  computation_error?: string | null;
  project_id?: string | null;
  composite_id?: string | null;
  composite_root_ids?: string[] | null;
  composite_roots?: CompositeRootInfo[] | null;
  raw_internal_id?: string | null;
  plausible_range?: PlausibleRange | null;

  // Provider (optional)
  provider_enabled?: boolean;
  provider_type?: string | null;
  provider_url?: string | null;
  provider_json_path?: string | null;
  provider_timeout?: number | null;
  provider_cache_ttl?: number | null;
  provider_last_fetched_at?: string | null;
  provider_last_error?: string | null;
}

export interface NodeCreate {
  id?: string;
  slug: string;
  label: string;
  unit: NodeUnit;
  status: NodeStatus;
  confidence: number;
  notes?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;
  composite_id?: string | null;

  // Computation fields
  value_computed?: number | null;
  computation_definition?: string | null;
  last_computed_at?: string | null;
  computation_error?: string | null;
  project_id?: string | null;
  // Provider fields (optional)
  provider_enabled?: boolean;
  provider_type?: string | null;
  provider_url?: string | null;
  provider_json_path?: string | null;
  provider_timeout?: number | null;
  provider_cache_ttl?: number | null;
  provider_last_fetched_at?: string | null;
  provider_last_error?: string | null;
  composite_roots?: CompositeRootInfo[] | null;
  plausible_range?: PlausibleRange | null;
  raw_internal_id?: string | null;
}

export interface NodeUpdate {
  slug?: string;
  label?: string;
  unit?: NodeUnit;
  status?: NodeStatus;
  confidence?: number;
  notes?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;
  composite_id?: string | null;

  // Computation fields
  value_computed?: number | null;
  computation_definition?: string | null;
  last_computed_at?: string | null;
  computation_error?: string | null;
  provider_timeout?: number | null;
  provider_cache_ttl?: number | null;
  plausible_range?: PlausibleRange | null;
  raw_internal_id?: string | null;
}

export type RuleSeverity = 'error' | 'warning' | 'info';

export interface RuleViolation {
  rule_id: string;
  rule_name: string;
  severity: RuleSeverity;
  message: string;
  nodes_involved: string[];
  suggestion?: {
    action: 'update_value' | 'update_range' | 'update_status';
    node_id: string;
    proposed_value?: number;
    proposed_range?: PlausibleRange;
    proposed_status?: NodeStatus;
    proposed_unit?: NodeUnit;
  };
}

export interface CheckRulesResponse {
  total_violations: number;
  violations: RuleViolation[];
  checked_at: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  enabled: boolean;
}

export interface APIError {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}

// Graph-specific types for UI
export interface GraphNode extends Node {
  x?: number;
  y?: number;
}

export type EdgeType = 'default' | 'dependency' | 'influence' | 'correlation';

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  edge_type: EdgeType;
  rule_id?: string | null;
}

export interface EdgeCreate {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  edge_type: EdgeType;
  rule_id?: string | null;
}

export interface EdgeUpdate {
  label?: string | null;
  edge_type?: EdgeType;
  rule_id?: string | null;
}

// Legacy type for backwards compatibility
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: EdgeType;
}

export type InteractionMode = 'select' | 'add' | 'connect' | 'lasso' | 'ai-select';

export type ViewMode = 'baseline' | 'scenario' | 'comparison' | 'columns';

export interface GraphViewport {
  x: number;
  y: number;
  zoom: number;
}

// Composite nodes
export interface CompositeGraphEdge {
  source: string;
  target: string;
}

export interface CompositeGraphData {
  nodes: NodeCreate[];
  edges: CompositeGraphEdge[];
}

export interface Composite {
  id: string;
  name: string;
  graph_data: CompositeGraphData;
  created_at: string;
  updated_at: string;
}

export interface CompositeSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  graph_data?: CompositeGraphData;
}

export interface CompositeUsageProject {
  id: string;
  name: string;
}

export interface CompositeUsageComposite {
  id: string;
  name: string;
}

export interface CompositeUsage {
  id: string;
  name: string;
  projects: CompositeUsageProject[];
  composites: CompositeUsageComposite[];
}

export interface CompositeCreateInput {
  id?: string;
  name: string;
  graph_data: CompositeGraphData;
}

export interface CompositeUpdateInput {
  name?: string;
  graph_data?: CompositeGraphData;
}

export interface CompositeComputeResult {
  value: number | null;
  error: string | null;
  last_computed_at: string | null;
}

export interface CompositeComputeResponse {
  results: Record<string, CompositeComputeResult | undefined>;
}

export interface ProjectExposedRoot {
  instance_id: string;
  label: string;
  unit?: string | null;
  type: 'project';
}

export interface CompositeExposedRootEntry {
  composite_node_instance_id: string;
  composite_id: string;
  internal_id: string;
  raw_internal_id: string | null;
  composite_instance_path?: string[];
  linked_node_instance_id?: string | null;
  label?: string | null;
  unit?: string | null;
  current_value?: number | null;
  type: 'composite';
}

export interface ProjectExposedRoots {
  project_roots: ProjectExposedRoot[];
  composite_roots: CompositeExposedRootEntry[];
}

// Scenario types
export interface Scenario {
  id: string;
  project_id: string;
  name: string;
  color?: string | null;
  created_at: string;
  updated_at: string;
  graph_data?: CompositeGraphData;
  overrides?: ScenarioNodeOverride[];
  composite_overrides?: ScenarioCompositeOverride[];
}

export interface ScenarioCreate {
  name: string;
  color?: string | null;
}

export interface ScenarioUpdate {
  name?: string;
  color?: string | null;
}

export interface ScenarioNodeOverride {
  id: string;
  scenario_id: string;
  node_id: string;
  mode: 'value' | 'formula';
  override_value: number | null;
  override_code: string | null;
}

export interface ScenarioCompositeOverride {
  id: string;
  scenario_id: string;
  composite_node_instance_id: string;
  internal_id: string;
  composite_internal_id?: string | null;
  mode: 'value' | 'formula';
  override_value: number | null;
  override_code: string | null;
}

// Scenario comparison
export interface CompareNodeResult {
  node_id: string;
  value_a: number | null;
  value_b: number | null;
  delta: number | null;
  real_value: number | null;
  error_a: string | null;
  error_b: string | null;
}

export interface CompareGraphResponse {
  nodes: CompareNodeResult[];
}

export interface OverrideUpdate {
  node_id?: string;
  composite_node_instance_id?: string;
  composite_internal_id?: string;
  mode?: 'value' | 'formula';
  override_value: number | null;
  override_code?: string | null;
}

export interface OverrideBatchUpdate {
  overrides: OverrideUpdate[];
}

export interface ScenarioOverrideValidateResponse {
  ok: boolean;
  result?: number | null;
  error?: string | null;
}

// Extended node with scenario data
export interface NodeWithScenario extends Node {
  real_value?: number | null;
  scenario_value?: number | null;
}

// Compute response with scenario support
export interface ComputeNodeResponse {
  value: number | null;
  real_value: number | null;
  scenario_value: number | null;
  error: string | null;
}

export interface ComputeAllScenarioResponse {
  results: Record<string, ComputeNodeResponse>;
  total_computed: number;
  total_errors: number;
}
