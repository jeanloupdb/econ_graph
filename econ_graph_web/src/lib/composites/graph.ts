import { deriveEdgesFromCompute } from '@/lib/layout/graph';
import type {
  CompositeGraphData,
  CompositeGraphEdge,
  Node,
  NodeCreate,
} from '@/lib/types';

function generateFallbackId(label: string | undefined, seed?: string) {
  const base =
    (label || seed || 'node')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '') || 'node';
  return `${base}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)
    .toString(16)
    .padStart(3, '0')}`;
}

export function ensureCompositeNodeDefaults(
  payload: Partial<Node> & { id?: string; label: string }
): Node {
  const normalizedRawId = (payload.raw_internal_id || payload.id || '').trim();
  const id =
    normalizedRawId || generateFallbackId(payload.label, payload.id || payload.slug);
  const slug = (payload.slug || '').trim() || id;
  const rawInternalId = normalizedRawId || id;
  return {
    id,
    slug,
    raw_internal_id: rawInternalId,
    label: payload.label,
    unit: payload.unit || '',
    status: payload.status || 'unknown',
    confidence: typeof payload.confidence === 'number' ? payload.confidence : 1,
    notes: payload.notes ?? null,
    value_computed: payload.value_computed ?? null,
    computation_definition: payload.computation_definition ?? '',
    last_computed_at: payload.last_computed_at ?? null,
    computation_error: payload.computation_error ?? null,
    project_id: null,
    pos_x: payload.pos_x ?? null,
    pos_y: payload.pos_y ?? null,
    composite_id: payload.composite_id ?? null,
    provider_enabled: !!payload.provider_enabled,
    provider_type: payload.provider_type ?? null,
    provider_url: payload.provider_url ?? null,
    provider_json_path: payload.provider_json_path ?? null,
    provider_timeout: payload.provider_timeout ?? null,
    provider_cache_ttl: payload.provider_cache_ttl ?? null,
    provider_last_fetched_at: payload.provider_last_fetched_at ?? null,
    provider_last_error: payload.provider_last_error ?? null,
    created_at: payload.created_at ?? undefined,
    updated_at: payload.updated_at ?? undefined,
  };
}

export function normalizeCompositeNodes(nodes?: Node[]): Node[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((node, index) =>
    ensureCompositeNodeDefaults({
      ...node,
      label: node.label || `node_${index + 1}`,
      pos_x: node.pos_x ?? (index % 4) * 240,
      pos_y: node.pos_y ?? Math.floor(index / 4) * 180,
    })
  );
}

export function buildCompositeNodesPayload(nodes: Node[]): NodeCreate[] {
  return nodes.map((node) => ({
    id: node.raw_internal_id || node.id,
    slug: node.slug || node.id,
    raw_internal_id: node.raw_internal_id || node.id,
    label: node.label,
    unit: node.unit,
    status: node.status,
    confidence: node.confidence,
    notes: node.notes,
    computation_definition: node.computation_definition,
    value_computed: node.value_computed ?? null,
    last_computed_at: node.last_computed_at ?? null,
    computation_error: node.computation_error ?? null,
    project_id: null,
    pos_x: node.pos_x ?? null,
    pos_y: node.pos_y ?? null,
    composite_id: (node as any).composite_id ?? null,
    provider_enabled: node.provider_enabled,
    provider_type: node.provider_type,
    provider_url: node.provider_url,
    provider_json_path: node.provider_json_path,
    provider_timeout: node.provider_timeout,
    provider_cache_ttl: node.provider_cache_ttl,
    provider_last_fetched_at: node.provider_last_fetched_at ?? null,
    provider_last_error: node.provider_last_error ?? null,
  })) as NodeCreate[];
}

export function deriveCompositeEdges(nodes: Node[]): CompositeGraphEdge[] {
  const slugToId = new Map<string, string>();
  nodes.forEach((node) => {
    if (node.slug) {
      slugToId.set(node.slug, node.id);
    }
    slugToId.set(node.id, node.id);
  });

  return nodes
    .flatMap((node) =>
      deriveEdgesFromCompute(
        {
          id: node.id,
          computation_definition: node.computation_definition || undefined,
        },
        {
          resolveSlug: (slug) => slugToId.get(slug),
        }
      )
    )
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));
}

export function serializeCompositeGraph(
  nodes: Node[],
  options?: { edges?: CompositeGraphEdge[] }
): CompositeGraphData {
  return {
    nodes: buildCompositeNodesPayload(nodes),
    edges: options?.edges ?? deriveCompositeEdges(nodes),
  };
}
