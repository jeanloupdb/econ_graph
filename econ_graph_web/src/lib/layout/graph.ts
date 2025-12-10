/**
 * Graph layout utilities
 * Provides algorithms for automatic node positioning
 */

import type { Node as ReactFlowNode } from 'reactflow';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  spacing?: { x: number; y: number };
}

/**
 * Simple grid layout - arranges nodes in a grid
 */
export function gridLayout<T extends { id: string }>(
  nodes: T[],
  options: { columns?: number; spacing?: { x: number; y: number } } = {}
): Array<T & { position: { x: number; y: number } }> {
  const columns = options.columns || Math.ceil(Math.sqrt(nodes.length));
  const spacing = options.spacing || { x: 250, y: 150 };

  return nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    return {
      ...node,
      position: {
        x: col * spacing.x,
        y: row * spacing.y,
      },
    };
  });
}

/**
 * Hierarchical layout - arranges nodes in layers from top to bottom
 */
export function hierarchicalLayout<T extends { id: string }>(
  nodes: T[],
  edges: Array<{ source: string; target: string }>,
  options: LayoutOptions = {}
): Array<T & { position: { x: number; y: number } }> {
  const spacing = options.spacing || { x: 250, y: 150 };
  const direction = options.direction || 'TB';

  // Build adjacency list
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Topological sort to determine layers
  const layers: string[][] = [];
  const queue: string[] = [];

  // Start with nodes that have no incoming edges
  nodes.forEach((node) => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  });

  while (queue.length > 0) {
    const currentLayer = [...queue];
    layers.push(currentLayer);
    queue.length = 0;

    currentLayer.forEach((nodeId) => {
      const neighbors = adjList.get(nodeId) || [];
      neighbors.forEach((neighbor) => {
        const degree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, degree);
        if (degree === 0) {
          queue.push(neighbor);
        }
      });
    });
  }

  // Position nodes based on layers
  const nodePositions = new Map<string, { x: number; y: number }>();

  layers.forEach((layer, layerIndex) => {
    layer.forEach((nodeId, indexInLayer) => {
      const totalInLayer = layer.length;
      const offset = -(totalInLayer - 1) / 2;

      if (direction === 'TB' || direction === 'BT') {
        const y = direction === 'TB' ? layerIndex * spacing.y : -layerIndex * spacing.y;
        const x = (offset + indexInLayer) * spacing.x;
        nodePositions.set(nodeId, { x, y });
      } else {
        const x = direction === 'LR' ? layerIndex * spacing.x : -layerIndex * spacing.x;
        const y = (offset + indexInLayer) * spacing.y;
        nodePositions.set(nodeId, { x, y });
      }
    });
  });

  return nodes.map((node) => ({
    ...node,
    position: nodePositions.get(node.id) || { x: 0, y: 0 },
  }));
}

/**
 * Force-directed layout - uses simple spring forces
 * Note: This is a basic implementation. For production, consider using d3-force
 */
export function forceLayout<T extends { id: string }>(
  nodes: T[],
  edges: Array<{ source: string; target: string }>,
  options: { iterations?: number; spacing?: number } = {}
): Array<T & { position: { x: number; y: number } }> {
  const iterations = options.iterations || 50;
  const spacing = options.spacing || 200;

  // Initialize positions randomly
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    const radius = spacing;
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    });
  });

  // Simulation
  for (let iter = 0; iter < iterations; iter++) {
    // Repulsive forces between all nodes
    nodes.forEach((nodeA) => {
      const posA = positions.get(nodeA.id)!;
      nodes.forEach((nodeB) => {
        if (nodeA.id === nodeB.id) return;
        const posB = positions.get(nodeB.id)!;

        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distSq = dx * dx + dy * dy + 1;
        const force = spacing * spacing / distSq;

        posA.vx += (dx / Math.sqrt(distSq)) * force;
        posA.vy += (dy / Math.sqrt(distSq)) * force;
      });
    });

    // Attractive forces for edges
    edges.forEach((edge) => {
      const posA = positions.get(edge.source);
      const posB = positions.get(edge.target);
      if (!posA || !posB) return;

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist / spacing;

      posA.vx += (dx / dist) * force * 0.1;
      posA.vy += (dy / dist) * force * 0.1;
      posB.vx -= (dx / dist) * force * 0.1;
      posB.vy -= (dy / dist) * force * 0.1;
    });

    // Update positions with damping
    nodes.forEach((node) => {
      const pos = positions.get(node.id)!;
      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.vx *= 0.8;
      pos.vy *= 0.8;
    });
  }

  return nodes.map((node) => {
    const pos = positions.get(node.id)!;
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
    };
  });
}

/**
 * Fit view to bounds - calculates viewport to show all nodes
 */
export function fitViewToBounds(
  nodes: ReactFlowNode[],
  containerWidth: number,
  containerHeight: number,
  padding = 50
): { x: number; y: number; zoom: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  const minX = Math.min(...nodes.map((n) => n.position.x));
  const maxX = Math.max(...nodes.map((n) => n.position.x + (n.width || 200)));
  const minY = Math.min(...nodes.map((n) => n.position.y));
  const maxY = Math.max(...nodes.map((n) => n.position.y + (n.height || 100)));

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;

  const scaleX = (containerWidth - padding * 2) / boundsWidth;
  const scaleY = (containerHeight - padding * 2) / boundsHeight;
  const zoom = Math.min(scaleX, scaleY, 1.5);

  const x = (containerWidth - boundsWidth * zoom) / 2 - minX * zoom;
  const y = (containerHeight - boundsHeight * zoom) / 2 - minY * zoom;

  return { x, y, zoom };
}

interface DeriveEdge {
  id: string;
  source: string;
  target: string;
  sourceSlug: string;
}

// Derive dependency edges from a node's computation_definition signature.
// Looks for: def compute(p1, p2, ...): and returns edges slug -> node.id
export function deriveEdgesFromCompute(
  node: { id: string; computation_definition?: string | null },
  options?: { resolveSlug?: (slug: string) => string | undefined }
): DeriveEdge[] {
  const code = (node.computation_definition || '').toString();
  const m = /def\s+compute\s*\(([^)]*)\)\s*:/m.exec(code);
  if (!m) return [];
  const params = m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return params.map((p) => {
    const resolved = options?.resolveSlug?.(p) || p;
    return {
      id: `${p}->${node.id}`,
      source: resolved,
      target: node.id,
      sourceSlug: p,
    };
  });
}
