import type { CompositeGraphData } from "@/lib/types";

export interface TransformCompositeSessionPayload {
  initialGraphData: CompositeGraphData;
  initialName?: string | null;
  projectId: string;
  replaceNodeId?: string | null;
  replaceNodeSlug?: string | null;
  replaceNodeLabel?: string | null;
  nodesToDelete: string[];
  originalPosition?: { x: number | null; y: number | null } | null;
  dependentsToResync?: string[];
}

export interface PendingCompositeInsertPayload {
  compositeId: string;
  projectId: string | null;
  mode?: "insert" | "transform";
  replaceNodeId?: string | null;
  replaceNodeSlug?: string | null;
  nodesToDelete?: string[];
  position?: { x: number | null; y: number | null } | null;
  dependentsToResync?: string[];
}

export interface PendingCompositeRefreshPayload {
  projectId: string | null;
  compositeId: string;
}
