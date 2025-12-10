'use client';

import ELK from 'elkjs/lib/elk.bundled.js';

type NodeIn = { id: string };
type EdgeIn = { source: string; target: string };

const elk = new ELK();

export async function computeElkLayout(
  nodes: NodeIn[],
  edges: EdgeIn[],
  options?: { direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' }
): Promise<Map<string, { x: number; y: number }>> {
  const dir = options?.direction || 'DOWN';
  // Estimate sizes (keep consistent for clean spacing)
  const defaultWidth = 220;
  const defaultHeight = 90;

  const elkGraph: any = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': dir,
      // Force strict layering so every target sits below its source
      'elk.layered.layering.strategy': 'LONGEST_PATH',
      // Place parents centered over their children for straighter verticals
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'CENTER',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '160',
      'elk.layered.mergeEdges': 'true',
      'elk.layered.crossingMinimization.semiInteractive': 'true',
      'elk.layered.edgeStraightening': 'true',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.edgeNode': '50',
    },
    children: nodes.map((n) => ({ id: n.id, width: defaultWidth, height: defaultHeight })),
    edges: edges.map((e, i) => ({ id: `${e.source}->${e.target}#${i}` , sources: [e.source], targets: [e.target] })),
  };

  const out = await elk.layout(elkGraph);
  const pos = new Map<string, { x: number; y: number }>();
  if (out.children) {
    for (const c of out.children) {
      pos.set(c.id, { x: Math.round(c.x || 0), y: Math.round(c.y || 0) });
    }
  }
  return pos;
}
