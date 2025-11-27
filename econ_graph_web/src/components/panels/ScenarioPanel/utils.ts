import type { Node } from "@/lib/types";
import type { CompositeSectionParam } from "./types";

export const makeVirtualNodeFromParam = (
  param: CompositeSectionParam,
  projectId: string | null
): Node =>
  ({
    id: param.overrideKey,
    slug: param.meta?.slug || param.rawId,
    raw_internal_id: param.rawId,
    label: param.meta?.label || param.rawId,
    unit: param.meta?.unit || "",
    status: "unknown",
    confidence: 1,
    notes: null,
    pos_x: null,
    pos_y: null,
    value_computed: param.currentValue ?? param.meta?.current_value ?? null,
    computation_definition: null,
    last_computed_at: null,
    computation_error: null,
    project_id: projectId,
    composite_id: null,
    composite_root_ids: null,
    composite_roots: null,
    provider_enabled: false,
    provider_type: null,
    provider_url: null,
    provider_json_path: null,
    provider_timeout: null,
    provider_cache_ttl: null,
    provider_last_fetched_at: null,
    provider_last_error: null,
  }) as Node;

export const formatDisplayNumber = (
  value: number | null | undefined
): string =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
      }).format(value);
