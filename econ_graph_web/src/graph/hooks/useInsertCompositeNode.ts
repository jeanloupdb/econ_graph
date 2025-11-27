"use client";

import { useCallback } from "react";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { apiClient, APIClientError } from "@/lib/api/client";
import type { Composite, CompositeGraphData, NodeCreate } from "@/lib/types";
import { useUIStore } from "@/store/uiState";
import { useGraphStore } from "@/store/graphState";

export interface InsertCompositeOptions {
  slug?: string | null;
  label?: string | null;
  position?: { x: number | null; y: number | null } | null;
  notes?: string | null;
  skipCompute?: boolean;
}

function findFinalCompositeNode(
  graph?: CompositeGraphData
): NodeCreate | null {
  const nodes = graph?.nodes ?? [];
  if (!nodes.length) {
    return null;
  }
  const outgoing = new Map<string, number>();
  nodes.forEach((node) => outgoing.set(node.id, 0));
  (graph?.edges ?? []).forEach((edge) => {
    outgoing.set(edge.source, (outgoing.get(edge.source) || 0) + 1);
  });
  const leaves = nodes.filter((node) => (outgoing.get(node.id) || 0) === 0);
  return leaves[0] ?? null;
}

function slugify(source: string) {
  return source
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)+/g, "")
    .slice(0, 60);
}

function makeUniqueSlug(base: string, existing: Set<string>, attempt = 1) {
  const normalizedBase = base || "composite";
  if (attempt === 1 && !existing.has(normalizedBase)) {
    return normalizedBase;
  }
  let suffix = attempt;
  let candidate = `${normalizedBase}_${suffix}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${normalizedBase}_${suffix}`;
  }
  return candidate;
}

export function useInsertCompositeNode() {
  const graphActions = useGraphActions();
  const { nodes } = useGraphData();
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const flashNodeHighlight = useUIStore((s) => s.flashNodeHighlight);
  const setFocusNodeId = useGraphStore((s) => s.setFocusNodeId);

  return useCallback(
    async (compositeId: string, options?: InsertCompositeOptions) => {
      if (!compositeId) {
        throw new Error("Aucun composite sélectionné.");
      }
      const composite = await apiClient.get<Composite>(
        `/composites/${compositeId}`
      );
      const finalNode = findFinalCompositeNode(composite.graph_data);
      if (!finalNode) {
        throw new Error(
          "Composite invalide : impossible d'identifier la feuille finale."
        );
      }

      const preferredSlug = options?.slug?.trim() || null;
      const preferredLabel = options?.label?.trim() || null;
      const preferredNotes =
        options?.notes ??
        (finalNode.label
          ? `Composite basé sur '${finalNode.label}'`
          : null);
      const preferredPosition = options?.position ?? null;
      const shouldCompute = options?.skipCompute !== true;

      let created: Awaited<ReturnType<typeof graphActions.createNode>> | null =
        null;

      if (preferredSlug) {
        const payload: NodeCreate = {
          slug: preferredSlug,
          label: preferredLabel || composite.name || finalNode.label || "Composite",
          unit: finalNode.unit || "",
          status: "unknown",
          confidence: 1,
          notes: preferredNotes,
          value_computed: null,
          composite_id: composite.id,
          pos_x: preferredPosition?.x ?? null,
          pos_y: preferredPosition?.y ?? null,
        };
        created = await graphActions.createNode(payload);
      } else {
        const existingSlugs = new Set(
          nodes
            .map((node) => (node.slug || node.id || "").trim())
            .filter((slug) => !!slug)
        );
        const baseSlug = slugify(
          finalNode.slug || composite.name || composite.id
        );
        let attempt = 1;

        while (!created) {
          const candidateSlug = makeUniqueSlug(baseSlug, existingSlugs, attempt);
          const payload: NodeCreate = {
            slug: candidateSlug,
            label: composite.name || finalNode.label || "Composite",
            unit: finalNode.unit || "",
            status: "unknown",
            confidence: 1,
            notes: preferredNotes,
            value_computed: null,
            composite_id: composite.id,
            pos_x: preferredPosition?.x ?? null,
            pos_y: preferredPosition?.y ?? null,
          };

          try {
            created = await graphActions.createNode(payload);
          } catch (error) {
            if (
              error instanceof APIClientError &&
              error.status === 409 &&
              attempt < 8
            ) {
              existingSlugs.add(candidateSlug);
              attempt += 1;
              continue;
            }
            throw error;
          }
        }
      }

      if (graphActions.computeNode && shouldCompute) {
        await graphActions.computeNode(created.id);
      }
      setSelectedNodeId(created.id);
      setInspectorOpen(true);
      setFocusNodeId(created.id);
      flashNodeHighlight(created.id);
      return created;
    },
    [flashNodeHighlight, graphActions, nodes, setFocusNodeId, setInspectorOpen, setSelectedNodeId]
  );
}
