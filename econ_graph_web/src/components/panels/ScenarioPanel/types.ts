import type { CompositeRootInfo, Node } from "@/lib/types";

export type CompositeSectionParam = {
  key: string;
  rawId: string;
  node: Node | null;
  meta?: CompositeRootInfo;
  overrideKey: string;
  compositeNodeId: string;
  currentValue?: number | null;
};

export type CompositeSection = {
  composite: Node;
  params: CompositeSectionParam[];
};

export type OverrideTarget =
  | { type: "node"; nodeId: string }
  | { type: "composite"; compositeNodeId: string; rawInternalId: string };

export const makeCompositeOverrideKey = (
  compositeNodeId: string,
  rawInternalId: string
) => {
  const trimmed = rawInternalId?.trim() || rawInternalId;
  return `composite::${compositeNodeId}::${trimmed}`;
};
