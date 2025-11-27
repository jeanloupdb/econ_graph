import { useMemo } from "react";
import type { CompositeRootInfo, Node, ProjectExposedRoots } from "@/lib/types";
import type {
  CompositeSection,
  CompositeSectionParam,
} from "./types";
import { makeCompositeOverrideKey } from "./types";

interface SectionsHookParams {
  nodes: Node[];
  exposedRoots?: ProjectExposedRoots | null;
  legacyRootNodes: Node[];
}

export function useScenarioPanelSections({
  nodes,
  exposedRoots,
  legacyRootNodes,
}: SectionsHookParams) {
  const nodesById = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const nodesBySlug = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((node) => {
      if (node.slug) {
        map.set(node.slug, node);
      }
    });
    return map;
  }, [nodes]);

  const projectRootNodes = useMemo(() => {
    if (exposedRoots?.project_roots?.length) {
      const exposedIds = new Set(
        exposedRoots.project_roots.map((root) => root.instance_id)
      );
      return nodes.filter((node) => exposedIds.has(node.id));
    }
    return legacyRootNodes;
  }, [exposedRoots, legacyRootNodes, nodes]);

  const compositeMetadata = useMemo((): {
    sections: CompositeSection[];
    compositeRootNodeIds: Set<string>;
  } => {
    const compositeRootNodeIds = new Set<string>();
  if (exposedRoots?.composite_roots?.length) {
    const sectionMap = new Map<string, CompositeSection>();
    exposedRoots.composite_roots.forEach((root) => {
      const compositeNode = nodesById.get(root.composite_node_instance_id);
      if (!compositeNode) return;
        if (!sectionMap.has(compositeNode.id)) {
          sectionMap.set(compositeNode.id, { composite: compositeNode, params: [] });
        }
      const rawInternalId =
        root.raw_internal_id ||
        root.linked_node_instance_id ||
        root.internal_id ||
        "";
      if (!rawInternalId) return;
      const displayId =
        root.internal_id ||
        root.label ||
        root.linked_node_instance_id ||
        rawInternalId;
      const overrideKey = makeCompositeOverrideKey(
        compositeNode.id,
        rawInternalId
      );
      const matchedNode =
        (root.linked_node_instance_id &&
          nodesById.get(root.linked_node_instance_id)) ||
        nodesById.get(rawInternalId) ||
        nodesBySlug.get(rawInternalId) ||
        (displayId && nodesById.get(displayId)) ||
        (displayId && nodesBySlug.get(displayId)) ||
        null;
      if (matchedNode) {
        compositeRootNodeIds.add(matchedNode.id);
      }
      const param: CompositeSectionParam = {
        key: overrideKey,
        rawId: rawInternalId,
        node: matchedNode,
        meta: {
          id: displayId,
          slug: matchedNode?.slug || displayId,
          label:
            root.label ||
            matchedNode?.label ||
            matchedNode?.slug ||
            displayId,
          unit: root.unit || matchedNode?.unit,
          current_value: root.current_value ?? matchedNode?.value_computed ?? null,
          raw_internal_id: rawInternalId,
        },
        overrideKey,
        compositeNodeId: compositeNode.id,
        currentValue: matchedNode?.value_computed ?? root.current_value ?? null,
      };
        sectionMap.get(compositeNode.id)?.params.push(param);
      });
      return { sections: Array.from(sectionMap.values()), compositeRootNodeIds };
    }

    const sectionMap = new Map<string, CompositeSection>();
    nodes
      .filter(
        (node) =>
          !!node.composite_id &&
          ((node.composite_roots?.length || 0) > 0 ||
            (node.composite_root_ids?.length || 0) > 0)
      )
      .forEach((compositeNode) => {
        if (!sectionMap.has(compositeNode.id)) {
          sectionMap.set(compositeNode.id, { composite: compositeNode, params: [] });
        }
        const rootMeta =
          compositeNode.composite_roots?.length
            ? compositeNode.composite_roots
            : (compositeNode.composite_root_ids || []).map(
                (id) =>
                  ({
                    id,
                    slug: id,
                    label: id,
                    raw_internal_id: id,
                  }) as CompositeRootInfo
              );
        rootMeta.forEach((root) => {
          const slug = root.slug || root.id;
          const rawInternalId = root.raw_internal_id || root.id || slug;
          if (!rawInternalId) {
            return;
          }
          const overrideKey = makeCompositeOverrideKey(
            compositeNode.id,
            rawInternalId
          );
          const matchedNode =
            (slug && (nodesById.get(slug) || nodesBySlug.get(slug))) ||
            nodesById.get(rawInternalId) ||
            nodesBySlug.get(rawInternalId) ||
            (root.id && nodesById.get(root.id)) ||
            null;
          if (matchedNode) {
            compositeRootNodeIds.add(matchedNode.id);
          }
          sectionMap.get(compositeNode.id)?.params.push({
            key: overrideKey,
            rawId: rawInternalId,
            node: matchedNode,
            meta: { ...root, raw_internal_id: root.raw_internal_id || rawInternalId },
            overrideKey,
            compositeNodeId: compositeNode.id,
            currentValue: matchedNode?.value_computed ?? null,
          });
        });
      });
    return { sections: Array.from(sectionMap.values()), compositeRootNodeIds };
  }, [exposedRoots?.composite_roots, nodes, nodesById, nodesBySlug]);

  const compositeSections = compositeMetadata.sections;
  const compositeRootNodeIds = compositeMetadata.compositeRootNodeIds;

  const filteredRootNodes = useMemo(
    () => projectRootNodes.filter((node) => !compositeRootNodeIds.has(node.id)),
    [projectRootNodes, compositeRootNodeIds]
  );

  return {
    nodesById,
    nodesBySlug,
    projectRootNodes,
    compositeSections,
    compositeRootNodeIds,
    filteredRootNodes,
  };
}
