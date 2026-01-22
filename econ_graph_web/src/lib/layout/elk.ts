import ELK from 'elkjs/lib/elk.bundled.js';
import { Edge, Node } from 'reactflow';

const elk = new ELK();

// ELK Layout Options
const defaultOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '80', // Horizontal spacing
  'elk.layered.spacing.nodeNodeBetweenLayers': '150', // Vertical spacing (since rotated right)
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
};

export async function computeElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    direction?: 'RIGHT' | 'DOWN';
    nodeWidth?: number;
    nodeHeight?: number;
  } = {}
) {
  const isHorizontal = options.direction === 'RIGHT';
  
  const layoutOptions = {
    ...defaultOptions,
    'elk.direction': isHorizontal ? 'RIGHT' : 'DOWN',
    // Adjust spacing based on direction if needed
  };

  const elkNodes = nodes.map((node) => ({
    id: node.id,
    width: node.width ?? options.nodeWidth ?? 240,
    height: node.height ?? options.nodeHeight ?? 120,
  }));

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph = {
    id: 'root',
    layoutOptions: layoutOptions,
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    
    const positions = new Map<string, { x: number; y: number }>();
    
    layoutedGraph.children?.forEach((node) => {
      positions.set(node.id, { x: node.x!, y: node.y! });
    });

    return positions;
  } catch (error) {
    console.error('ELK Layout failed:', error);
    return new Map(); // Return empty map on failure to avoid crash
  }
}
