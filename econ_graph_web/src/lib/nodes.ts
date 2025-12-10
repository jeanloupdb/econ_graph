import type { Node } from "@/lib/types";

export function getNodeDisplayIdentifier(node?: Node | null): string {
  if (!node) {
    return "";
  }
  return (
    node.slug ||
    node.raw_internal_id ||
    node.composite_roots?.find((root) => root.slug)?.slug ||
    node.composite_roots?.[0]?.label ||
    node.composite_root_ids?.[0] ||
    node.id ||
    ""
  );
}
