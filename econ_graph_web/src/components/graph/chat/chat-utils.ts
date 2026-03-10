import type { AiContextInfo } from "@/types/ai-context";
import type { SuggestedAction } from "@/types/project-chat";

export const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const getNodeContextType = (node: any): AiContextInfo["type"] => {
  // Use status field (the actual field on Node type) to determine category
  if (node?.status === "imposed") return "parameter";
  // Fallback to legacy node_type if present
  if (node?.node_type === "setting") return "parameter";
  if (node?.node_type === "intermediate") return "calculation";
  // Default to calculation (results need edge data to distinguish, which we don't have here)
  return "calculation";
};

export const buildNodeContext = (node: any): AiContextInfo => ({
  label: node.label || node.slug,
  type: getNodeContextType(node),
  target: { kind: "node", id: node.id },
});

export function detectNodes(text: string, nodes: any[]): any[] {
  if (!nodes.length) return [];
  const lower = normalizeKey(text);
  return nodes.filter((n) => {
    const label = n.label || n.slug;
    return label && lower.includes(normalizeKey(label));
  });
}

export function getSuggestions(
  _content: string,
  _nodes: any[],
  backend?: SuggestedAction[]
): SuggestedAction[] {
  // Only show backend-provided suggestions; no frontend-generated ones
  if (backend?.length) return backend;
  return [];
}
