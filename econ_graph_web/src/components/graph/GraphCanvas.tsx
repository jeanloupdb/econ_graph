'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node as ReactFlowNode,
  Edge,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from '@/lib/api/hooks';
import { deriveEdgesFromCompute } from '@/lib/layout/graph';
import { useUIStore } from '@/store/uiState';
import { useGraphStore } from '@/store/graphState';
import { useGraphData } from '@/graph/context/GraphDataContext';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { Loader2 } from 'lucide-react';
import { computeElkLayout } from '@/lib/layout/elk';
import { computeBottomUpLayout } from '@/lib/layout/custom';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  default: CustomEdge,
  dependency: CustomEdge,
  influence: CustomEdge,
  correlation: CustomEdge,
};

function GraphCanvasInner() {
  const { nodes: nodesData, isLoading: nodesLoading, persistNodePositions } = useGraphData();
  const { data: theme } = useTheme();
  const reactFlowInstance = useReactFlow();

  const mode = useUIStore((state) => state.mode);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);
  const selectedEdgeId = useUIStore((state) => state.selectedEdgeId);
  const selectedEdgeIds = useUIStore((state) => state.selectedEdgeIds);
  const setSelectedEdgeId = useUIStore((state) => state.setSelectedEdgeId);
  const selectedNodeIds = useUIStore((state) => state.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((state) => state.setSelectedNodeIds);
  const setScenarioPanelOpen = useUIStore((state) => state.setScenarioPanelOpen);
  const connectionSource = useUIStore((state) => state.connectionSource);
  const setConnectionSource = useUIStore((state) => state.setConnectionSource);
  const isComputing = useUIStore((state) => state.isComputing);

  const nodePositions = useGraphStore((state) => state.nodePositions);
  const setNodePosition = useGraphStore((state) => state.setNodePosition);
  const setNodePositions = useGraphStore((state) => state.setNodePositions);
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const setFocusNodeId = useGraphStore((s) => s.setFocusNodeId);

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);

  const isLoading = nodesLoading;
  const slugToId = useMemo(() => {
    const map = new Map<string, string>();
    nodesData.forEach((node) => {
      if (node.slug) map.set(node.slug, node.id);
      map.set(node.id, node.id);
    });
    return map;
  }, [nodesData]);

  // Compute a simple hierarchical layout (parents above children) if no positions stored
  const computeHierarchicalPositions = useCallback((nodes: any[], edges: Edge[]) => {
    const incoming = new Map<string, number>();
    nodes.forEach(n => incoming.set(n.id, 0));
    edges.forEach(e => incoming.set(e.target, (incoming.get(e.target) || 0) + 1));

    // Kahn-like layering
    const layers: string[][] = [];
    let layer0 = nodes.filter(n => (incoming.get(n.id) || 0) === 0).map(n => n.id);
    const seen = new Set<string>(layer0);
    if (layer0.length === 0) layer0 = nodes.map(n => n.id); // fallback
    layers.push(layer0);

    let frontier = new Set(layer0);
    const childrenMap = new Map<string, string[]>();
    edges.forEach(e => {
      const arr = childrenMap.get(e.source) || [];
      arr.push(e.target);
      childrenMap.set(e.source, arr);
    });

    while (frontier.size > 0) {
      const next = new Set<string>();
      frontier.forEach(src => {
        (childrenMap.get(src) || []).forEach(t => {
          if (!seen.has(t)) {
            next.add(t);
            seen.add(t);
          }
        });
      });
      if (next.size > 0) layers.push(Array.from(next));
      frontier = next;
    }

    const positions: { id: string; x: number; y: number }[] = [];
    const xSpacing = 240;
    const ySpacing = 160;
    layers.forEach((layerIds, layerIndex) => {
      layerIds.forEach((id, i) => {
        positions.push({ id, x: i * xSpacing, y: layerIndex * ySpacing });
      });
    });
    return positions;
  }, []);

  // Convert API nodes and edges to ReactFlow format
  useEffect(() => {
    if (!nodesData || nodesData.length === 0) {
      setReactFlowNodes([]);
      setReactFlowEdges([]);
      return;
    }

    // Derive edges from compute() to drive highlights and layout
    const derivedEdges = nodesData.flatMap((n) =>
      deriveEdgesFromCompute(
        { id: n.id, computation_definition: (n as any).computation_definition || undefined },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );

    // Build ancestors set for the currently selected node (all parents recursively)
    const ancestorSet = new Set<string>();
    if (selectedNodeId) {
      const inMap = new Map<string, string[]>(); // target -> [sources]
      nodesData.forEach((n) => inMap.set(n.id, []));
      derivedEdges.forEach((e) => {
        if (!inMap.has(e.target)) inMap.set(e.target, []);
        inMap.get(e.target)!.push(e.source);
      });
      const stack = [...(inMap.get(selectedNodeId) || [])];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (ancestorSet.has(cur)) continue;
        ancestorSet.add(cur);
        const parents = inMap.get(cur) || [];
        parents.forEach((p) => {
          if (!ancestorSet.has(p)) stack.push(p);
        });
      }
    }

    // Create nodes
    const nodes: ReactFlowNode[] = nodesData.map((node, index) => {
      const persisted = (node as any).pos_x != null && (node as any).pos_y != null
        ? { x: (node as any).pos_x as number, y: (node as any).pos_y as number }
        : undefined;
      const cached = nodePositions.get(node.id);
      const position = cached || persisted || {
        x: (index % 8) * 220,
        y: Math.floor(index / 8) * 140,
      };

      const isRelevant = !!selectedNodeId && (selectedNodeId === node.id || ancestorSet.has(node.id));
      const dimOthers = !!selectedNodeId;

      return {
        id: node.id,
        type: 'custom',
        position,
        selected: selectedNodeId === node.id || ancestorSet.has(node.id),
        style: dimOthers ? (isRelevant ? { opacity: 1 } : { opacity: 0.25 }) : undefined,
        data: {
          ...node,
          isSelected: false,
        },
      };
    });

    // Do not auto-layout; rely on persisted positions or user drag

    setReactFlowNodes(nodes);

    // Create edges derived from compute signature params
    const edgeIdCounts = new Map<string, number>();
    const newEdges: Edge[] = derivedEdges.map((e, index) => {
      const baseId = e.id || `${e.source}->${e.target}`;
      const count = (edgeIdCounts.get(baseId) || 0) + 1;
      edgeIdCounts.set(baseId, count);
      const uniqueId = count === 1 ? baseId : `${baseId}#${count}`;
      return {
        id: uniqueId,
        source: e.source,
        target: e.target,
        label: undefined as any,
        type: 'default',
        style: {},
        data: { ...e, baseId, index },
      };
    });

    // Apply selection styles: selected edges OR edges incoming to selected node and its ancestors
    const selectedNode = nodesData.find(n => n.id === selectedNodeId);
    const incomingStroke = theme?.edge_types?.dependency?.stroke || '#3b82f6';
    const highlightTargets = new Set<string>();
    if (selectedNodeId) highlightTargets.add(selectedNodeId);
    ancestorSet.forEach(id => highlightTargets.add(id));

    const styledEdges = newEdges.map(edge => {
      const isSelectedByEdge = selectedEdgeIds.includes(edge.id);
      const isIncomingToHighlighted = highlightTargets.size > 0 && highlightTargets.has(edge.target);
      const highlight = isSelectedByEdge || isIncomingToHighlighted;
      const stroke = isIncomingToHighlighted ? incomingStroke : (theme?.edge_types?.dependency?.stroke || '#3b82f6');
      return {
        ...edge,
        style: highlight
          ? { stroke, strokeWidth: 3 }
          : (selectedNodeId ? { stroke: '#9ca3af', strokeWidth: 1, opacity: 0.2 } : edge.style),
        animated: highlight,
      };
    });

    setReactFlowEdges(styledEdges);
  }, [nodesData, nodePositions, selectedEdgeIds, selectedNodeId, setReactFlowNodes, setReactFlowEdges, computeHierarchicalPositions, setNodePositions, slugToId, theme?.edge_types?.dependency?.stroke]);

  // ELK layout on demand
  const layoutInProgress = useGraphStore((s) => s.layoutInProgress);
  const setLayoutInProgress = useGraphStore((s) => s.setLayoutInProgress);
  const pushPositionsSnapshot = useGraphStore((s) => s.pushPositionsSnapshot);

  useEffect(() => {
    (async () => {
      if (!layoutInProgress) return;
      if (!nodesData || nodesData.length === 0) {
        setLayoutInProgress(false);
        return;
      }
      try {
        // Snapshot current positions for undo
        const current = (reactFlowNodes || []).map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
        if (current.length > 0) pushPositionsSnapshot(current as any);
        // Custom bottom-up layout: sinks at bottom, parents centered above
        const derived = nodesData.flatMap((n) =>
          deriveEdgesFromCompute(
            { id: n.id, computation_definition: (n as any).computation_definition || undefined },
            { resolveSlug: (slug) => slugToId.get(slug) }
          )
        );
        const pos = computeBottomUpLayout(
          nodesData.map((n) => ({ id: n.id })),
          derived.map((e) => ({ source: e.source, target: e.target })),
          { nodeSpacing: 260, layerSpacing: 180 }
        );
        const positions = Array.from(pos.entries()).map(([id, p]) => ({ id, x: p.x, y: p.y }));
        if (positions.length > 0) {
          setNodePositions(positions as any);
          // also update current RF nodes immediately
          setReactFlowNodes((prev) => prev.map((n) => ({ ...n, position: pos.get(n.id) ? pos.get(n.id)! : n.position })));
        }
      } catch (e) {
        console.error('ELK layout failed', e);
      } finally {
        setLayoutInProgress(false);
      }
    })();
  }, [layoutInProgress, nodesData, reactFlowNodes, pushPositionsSnapshot, setNodePositions, setReactFlowNodes, setLayoutInProgress, slugToId]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: ReactFlowNode) => {
      // Select node and auto-select all its parents (ancestors)
      setSelectedNodeId(node.id);
      const derived = nodesData.flatMap((n) =>
        deriveEdgesFromCompute(
          { id: n.id, computation_definition: (n as any).computation_definition || undefined },
          { resolveSlug: (slug) => slugToId.get(slug) }
        )
      );
      const inMap = new Map<string, string[]>();
      nodesData.forEach((n) => inMap.set(n.id, []));
      derived.forEach((e) => {
        (inMap.get(e.target) || []).push(e.source);
      });
      const ancestors: string[] = [];
      const seen = new Set<string>();
      const stack = [...(inMap.get(node.id) || [])];
      while (stack.length) {
        const cur = stack.pop()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        ancestors.push(cur);
        (inMap.get(cur) || []).forEach((p) => {
          if (!seen.has(p)) stack.push(p);
        });
      }
      setSelectedNodeIds([node.id, ...ancestors]);
    },
    [setSelectedNodeId, setSelectedNodeIds, nodesData, slugToId]
  );

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: ReactFlowNode) => {
      const draggedId = node.id;
      const isGroup =
        Array.isArray(selectedNodeIds) &&
        selectedNodeIds.length > 0 &&
        selectedNodeIds.includes(draggedId);
      const persistIds = isGroup ? Array.from(new Set(selectedNodeIds)) : [draggedId];

      const updates: { id: string; x: number; y: number }[] = [];
      persistIds.forEach((id) => {
        const position = reactFlowNodes.find((n) => n.id === id)?.position || node.position;
        setNodePosition(id, position.x, position.y);
        updates.push({ id, x: position.x, y: position.y });
      });

      if (updates.length > 0) {
        try {
          await persistNodePositions(updates);
        } catch {
          // noop – already optimistic locally
        }
      }
    },
    [persistNodePositions, reactFlowNodes, selectedNodeIds, setNodePosition]
  );

  // Group-drag: move ancestors and/or selection visually while dragging
  const dragStateRef = useRef<{ startPos: { x: number; y: number }; startMap: Map<string, { x: number; y: number }>; groupIds: string[] } | null>(null);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: ReactFlowNode) => {
    const draggedId = node.id;
    // Only group-drag when selection exists AND the dragged node is part of the selection
    if (!selectedNodeIds || selectedNodeIds.length === 0 || !selectedNodeIds.includes(draggedId)) { dragStateRef.current = null; return; }
    const groupIds = Array.from(new Set(selectedNodeIds));
    const startMap = new Map<string, { x: number; y: number }>();
    (reactFlowNodes || []).forEach((n) => { if (groupIds.includes(n.id)) startMap.set(n.id, { x: n.position.x, y: n.position.y }); });
    dragStateRef.current = { startPos: { x: node.position.x, y: node.position.y }, startMap, groupIds };
  }, [selectedNodeIds, reactFlowNodes]);

  const onNodeDrag = useCallback((_: React.MouseEvent, node: ReactFlowNode) => {
    const st = dragStateRef.current;
    if (!st) return;
    const dx = node.position.x - st.startPos.x;
    const dy = node.position.y - st.startPos.y;
    setReactFlowNodes((prev) => prev.map((n) => {
      if (!st.groupIds.includes(n.id)) return n;
      const start = st.startMap.get(n.id) || n.position;
      return { ...n, position: { x: start.x + dx, y: start.y + dy } } as any;
    }));
  }, [setReactFlowNodes]);

  // When positions are restored from snapshot, reflect them to ReactFlow (and persist best-effort)
  useEffect(() => {
    setReactFlowNodes((prev) =>
      prev.map((n) => {
        const p = nodePositions.get(n.id);
        return p ? { ...n, position: { x: p.x, y: p.y } } : n;
      })
    );
  }, [nodePositions, setReactFlowNodes]);

  useEffect(() => {
    if (!focusNodeId) return;
    const node = reactFlowInstance.getNode(focusNodeId);
    if (!node) return;
    const width = node.width ?? 240;
    const height = node.height ?? 120;
    const x = node.position.x + width / 2;
    const y = node.position.y + height / 2;
    const currentViewport = reactFlowInstance.getViewport();
    const targetZoom = Math.min(Math.max(currentViewport?.zoom ?? 1, 0.9), 1.25);
    reactFlowInstance.setCenter(x, y, { zoom: targetZoom, duration: 600 });
    const timeout = window.setTimeout(() => setFocusNodeId(null), 800);
    return () => window.clearTimeout(timeout);
  }, [focusNodeId, reactFlowInstance, setFocusNodeId, reactFlowNodes]);

  // Connections disabled: edges are derived from compute() definitions
  const onConnect = undefined as any;

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (mode === 'select') {
        setSelectedEdgeId(edge.id);
      }
    },
    [mode, setSelectedEdgeId]
  );

  const onPaneClick = useCallback(() => {
    if (mode === 'select') {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      // Clear multi-selection to allow next drags to be independent
      setSelectedNodeIds([]);
    }
    setConnectionSource(null);
    setScenarioPanelOpen(false);
  }, [mode, setSelectedNodeId, setSelectedEdgeId, setSelectedNodeIds, setConnectionSource, setScenarioPanelOpen]);

  // Get node color based on status
  const getNodeStyle = useCallback((node: ReactFlowNode) => {
    const status = node.data.status;
    const backgroundColor = (theme && theme.node_status && theme.node_status[status]?.bg) || '#f4f4f5';
    return { backgroundColor };
  }, [theme]);

  const interactiveMode = mode === 'select' || mode === 'connect';

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.05}
        maxZoom={2.5}
        nodesDraggable={interactiveMode}
        nodesConnectable={false}
        elementsSelectable={mode === 'select' || mode === 'lasso'}
        className="bg-zinc-50 dark:bg-zinc-900"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => getNodeStyle(node).backgroundColor}
          maskColor="rgba(0, 0, 0, 0.05)"
          className="!bg-zinc-100 dark:!bg-zinc-800 !border !border-zinc-200 dark:!border-zinc-700"
        />
      </ReactFlow>

      {isComputing && (
        <div className="absolute inset-0 bg-zinc-900/20 dark:bg-zinc-950/40 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Calcul en cours...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
