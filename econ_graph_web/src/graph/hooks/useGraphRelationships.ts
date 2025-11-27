import { useMemo } from 'react';
import { useGraphData } from '@/graph/context/GraphDataContext';
import { deriveEdgesFromCompute } from '@/lib/layout/graph';

export interface GraphRelationships {
  dependencies: string[];
  dependents: string[];
  ancestors: string[];
}

export function useGraphRelationships(nodeId: string | null | undefined): GraphRelationships {
  const { nodes } = useGraphData();

  return useMemo(() => {
    if (!nodeId) {
      return { dependencies: [], dependents: [], ancestors: [] };
    }

    const slugToId = new Map<string, string>();
    nodes.forEach((n) => {
      if (n.slug) slugToId.set(n.slug, n.id);
      slugToId.set(n.id, n.id);
    });

    const edges = nodes.flatMap((n) =>
      deriveEdgesFromCompute(
        {
          id: n.id,
          computation_definition: (n as any).computation_definition || undefined,
        },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );

    const dependencies = edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source);

    const dependents = edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => edge.target);

    const ancestors: string[] = [];
    const seen = new Set<string>();
    const incomingMap = new Map<string, string[]>();
    nodes.forEach((n) => incomingMap.set(n.id, []));
    edges.forEach((edge) => {
      const arr = incomingMap.get(edge.target);
      if (arr) arr.push(edge.source);
    });
    const stack = [...(incomingMap.get(nodeId) || [])];
    while (stack.length) {
      const current = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      ancestors.push(current);
      (incomingMap.get(current) || []).forEach((parent) => {
        if (!seen.has(parent)) stack.push(parent);
      });
    }

    return { dependencies, dependents, ancestors };
  }, [nodeId, nodes]);
}
