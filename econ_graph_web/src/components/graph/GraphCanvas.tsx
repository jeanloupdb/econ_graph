'use client';


import { useGraphData } from '@/graph/context/GraphDataContext';
import { useInsertCompositeNode } from '@/graph/hooks/useInsertCompositeNode';
import { useTheme } from '@/lib/api/hooks';
import { computeBottomUpLayout } from '@/lib/layout/custom';
import { deriveEdgesFromCompute } from '@/lib/layout/graph';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphState';
import { useUIStore } from '@/store/uiState';
import { Loader2 } from 'lucide-react';
import { useTheme as useNextTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Edge,
    MiniMap,
    Node as ReactFlowNode,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomEdge } from './CustomEdge';
import { CustomNode } from './CustomNode';

function GraphCanvasInner({ readOnly }: { readOnly?: boolean }) {
  const { resolvedTheme } = useNextTheme();
  const maskColor = resolvedTheme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.15)';
  const { nodes: nodesData, edges: explicitEdges, isLoading: nodesLoading, persistNodePositions } = useGraphData();
  const { data: theme } = useTheme();
  const reactFlowInstance = useReactFlow();

  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    default: CustomEdge,
    dependency: CustomEdge,
    influence: CustomEdge,
    correlation: CustomEdge,
  }), []);

  const mode = useUIStore((state) => state.mode);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);
  const selectNodeWithoutInspector = useUIStore((state) => state.selectNodeWithoutInspector);
  const selectedEdgeId = useUIStore((state) => state.selectedEdgeId);
  const selectedEdgeIds = useUIStore((state) => state.selectedEdgeIds);
  const setSelectedEdgeId = useUIStore((state) => state.setSelectedEdgeId);
  const setSelectedEdgeIds = useUIStore((state) => state.setSelectedEdgeIds);
  const selectedNodeIds = useUIStore((state) => state.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((state) => state.setSelectedNodeIds);
  const setInspectorOpen = useUIStore((state) => state.setInspectorOpen);
  const setScenarioPanelOpen = useUIStore((state) => state.setScenarioPanelOpen);
  const connectionSource = useUIStore((state) => state.connectionSource);
  const setConnectionSource = useUIStore((state) => state.setConnectionSource);
  const isComputing = useUIStore((state) => state.isComputing);
  const aiAssistantOpen = useUIStore((state) => state.aiAssistantOpen);

  // Node editor state - when open, this node should stay selected
  const nodeEditorMode = useUIStore((state) => state.nodeEditorMode);
  const nodeEditorNodeId = useUIStore((state) => state.nodeEditorNodeId);

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
    // If explicit edges are provided (e.g. viewer mode), use them. Otherwise derive from compute.
    const derivedEdges = explicitEdges || nodesData.flatMap((n) =>
      deriveEdgesFromCompute(
        { id: n.id, computation_definition: (n as any).computation_definition || undefined },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );

    // No automatic ancestor selection - simple direct selection only

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

      // Determine selection status
      // When node editor is open, force the edited node to be selected
      const isBeingEdited = nodeEditorMode && nodeEditorNodeId === node.id;

      // A node is selected if it is in selectedNodeIds OR if being edited
      const isExplicitlySelected = isBeingEdited || selectedNodeIds?.includes(node.id);

      // Simple selection - no dimming of other nodes
      const dimOthers = false;

      return {
        id: node.id,
        type: 'custom',
        position,
        selected: isExplicitlySelected || isBeingEdited,
        style: undefined, // No dimming
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

    // Apply selection styles: only for explicitly selected edges
    const styledEdges = newEdges.map(edge => {
      const isSelectedByEdge = selectedEdgeIds.includes(edge.id);
      const highlight = isSelectedByEdge;
      const stroke = ((theme as any)?.edge_types?.dependency?.stroke || '#3b82f6');
      return {
        ...edge,
        style: highlight
          ? { stroke, strokeWidth: 3 }
          : (selectedNodeId ? { stroke: '#9ca3af', strokeWidth: 1, opacity: 0.2 } : edge.style),
        animated: highlight,
      };
    });

    setReactFlowEdges(styledEdges);
  }, [nodesData, explicitEdges, nodePositions, selectedEdgeIds, selectedNodeId, selectedNodeIds, nodeEditorMode, nodeEditorNodeId, setReactFlowNodes, setReactFlowEdges, computeHierarchicalPositions, setNodePositions, slugToId, (theme as any)?.edge_types?.dependency?.stroke]);

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
        const derived = explicitEdges || nodesData.flatMap((n) =>
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
  }, [layoutInProgress, nodesData, explicitEdges, reactFlowNodes, pushPositionsSnapshot, setNodePositions, setReactFlowNodes, setLayoutInProgress, slugToId]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: ReactFlowNode) => {
      // If a node is being edited, prevent clicking on other nodes
      if (nodeEditorMode && nodeEditorNodeId && node.id !== nodeEditorNodeId) {
        // Ignore click - user cannot select another node while editing
        return;
      }

      // In ai-select mode with AI assistant open, allow multi-selection
      if (mode === 'ai-select' && aiAssistantOpen) {
        const currentIds = selectedNodeIds || [];
        if (currentIds.includes(node.id)) {
          // Deselect if already selected
          setSelectedNodeIds(currentIds.filter(id => id !== node.id));
        } else {
          // Add to selection
          setSelectedNodeIds([...currentIds, node.id]);
        }
        return;
      }

      // In normal select mode, same behavior as menu selection
      // Simple click: select only this node
      setSelectedNodeIds([node.id]);
      // Don't open inspector
      setSelectedNodeId(null);
    },
    [setSelectedNodeIds, setSelectedNodeId, mode, nodeEditorMode, nodeEditorNodeId, selectedNodeIds, aiAssistantOpen]
  );

  // Helper to get all ancestors of a node
  const getAncestors = useCallback((nodeId: string) => {
    const derived = explicitEdges || nodesData.flatMap((n) =>
      deriveEdgesFromCompute(
        { id: n.id, computation_definition: (n as any).computation_definition || undefined },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );
    const inMap = new Map<string, string[]>();
    nodesData.forEach((n) => inMap.set(n.id, []));
    derived.forEach((e) => {
      if (!inMap.has(e.target)) inMap.set(e.target, []);
      inMap.get(e.target)!.push(e.source);
    });
    
    const ancestors = new Set<string>();
    const stack = [...(inMap.get(nodeId) || [])];
    while (stack.length) {
      const cur = stack.pop()!;
      if (ancestors.has(cur)) continue;
      ancestors.add(cur);
      (inMap.get(cur) || []).forEach((p) => {
        if (!ancestors.has(p)) stack.push(p);
      });
    }
    return Array.from(ancestors);
  }, [explicitEdges, nodesData, slugToId]);

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: ReactFlowNode) => {
      const draggedId = node.id;
      // Determine if we were dragging a group (selected node) or single node
      const isSelected = selectedNodeIds?.includes(draggedId);
      let persistIds = [draggedId];
      
      if (isSelected) {
        const ancestors = getAncestors(draggedId);
        persistIds = [draggedId, ...ancestors];
      }

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
    [persistNodePositions, reactFlowNodes, selectedNodeIds, setNodePosition, getAncestors]
  );

  // Group-drag: move ancestors and/or selection visually while dragging
  const dragStateRef = useRef<{ startPos: { x: number; y: number }; startMap: Map<string, { x: number; y: number }>; groupIds: string[] } | null>(null);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: ReactFlowNode) => {
    const draggedId = node.id;
    const isSelected = selectedNodeIds?.includes(draggedId);
    
    let groupIds = [draggedId];
    if (isSelected) {
      // If selected, move node AND all ancestors
      const ancestors = getAncestors(draggedId);
      groupIds = [draggedId, ...ancestors];
    }
    
    const startMap = new Map<string, { x: number; y: number }>();
    (reactFlowNodes || []).forEach((n) => { if (groupIds.includes(n.id)) startMap.set(n.id, { x: n.position.x, y: n.position.y }); });
    dragStateRef.current = { startPos: { x: node.position.x, y: node.position.y }, startMap, groupIds };
  }, [selectedNodeIds, reactFlowNodes, getAncestors]);

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
      // If a node is being edited, prevent clicking on edges
      if (nodeEditorMode && nodeEditorNodeId) {
        return;
      }

      if (mode === 'select') {
        setSelectedEdgeId(edge.id);
      }
    },
    [mode, setSelectedEdgeId, nodeEditorMode, nodeEditorNodeId]
  );

  const onPaneClick = useCallback(() => {
    // If a node is being edited, prevent deselection via pane click
    if (nodeEditorMode && nodeEditorNodeId) {
      return;
    }

    if (mode === 'select' || mode === 'ai-select') {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      // Clear multi-selection to allow next drags to be independent
      setSelectedNodeIds([]);
    }
    setConnectionSource(null);
    setScenarioPanelOpen(false);
  }, [mode, setSelectedNodeId, setSelectedEdgeId, setSelectedNodeIds, setConnectionSource, setScenarioPanelOpen, nodeEditorMode, nodeEditorNodeId]);

  const insertCompositeNode = useInsertCompositeNode();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      const compositeId = event.dataTransfer.getData('application/reactflow/composite');

      if (compositeId && reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        try {
          await insertCompositeNode(compositeId, { position });
        } catch (error) {
          console.error('Failed to drop composite:', error);
        }
      }
    },
    [insertCompositeNode, reactFlowInstance]
  );

  // Get node color based on status/tone
  const getNodeStyle = useCallback((node: ReactFlowNode) => {
    // Replicate CustomNode logic for tone
    const data = node.data;
    const hasError = (!!data.computation_error) || (!!(data as any).provider_last_error);
    
    // Determine topology
    const edges = reactFlowEdges || [];
    const hasOutputs = edges.some((e) => e.source === node.id);
    const isLeaf = !hasOutputs;
    const inputs = edges.filter((e) => e.target === node.id);
    const isRoot = inputs.length === 0;

    const tone: 'error' | 'root' | 'leaf' | 'intermediate' = hasError ? 'error' : (isRoot ? 'root' : (isLeaf ? 'leaf' : 'intermediate'));
    
    // Get color from theme
    const toneColors = (theme as any)?.node_tone?.[tone];
    // Use border color for MiniMap as it's more opaque/visible than the background tint
    const backgroundColor = toneColors?.border || toneColors?.bg || '#f4f4f5';
    
    return { backgroundColor };
  }, [theme, reactFlowEdges]);

  const interactiveMode = mode === 'select' || mode === 'connect';

  const lastSelectionRef = useRef<{ nodes: string[]; edges: string[] }>({ nodes: [], edges: [] });
  const selectedNodeIdRef = useRef(selectedNodeId);
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);

  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: ReactFlowNode[]; edges: Edge[] }) => {
      // CRITICAL: If node editor is open, block ALL selection changes
      if (nodeEditorMode && nodeEditorNodeId) {
        // Completely ignore any selection changes while editing
        return;
      }

      if (mode === 'select' || mode === 'lasso') {
        const nodeIds = nodes.map((n) => n.id).sort();
        const edgeIds = edges.map((e) => e.id).sort();

        const last = lastSelectionRef.current;
        const nodesChanged =
          nodeIds.length !== last.nodes.length ||
          !nodeIds.every((id, i) => id === last.nodes[i]);

        const edgesChanged =
          edgeIds.length !== last.edges.length ||
          !edgeIds.every((id, i) => id === last.edges[i]);

        if (!nodesChanged && !edgesChanged) return;

        // CRITICAL: Check if the new selection matches the current store state.
        // If it does, we MUST NOT call setSelectedNodeIds, otherwise we trigger an infinite loop
        // (Store update -> useEffect -> ReactFlow nodes update -> onSelectionChange -> Store update)
        if (nodesChanged) {
           const currentStoreIds = selectedNodeIds || [];
           if (nodeIds.length === currentStoreIds.length) {
             const sortedStore = [...currentStoreIds].sort();
             const isSame = nodeIds.every((id, i) => id === sortedStore[i]);
             if (isSame) {
               // Update ref to match current state but skip store update
               lastSelectionRef.current = { nodes: nodeIds, edges: edgeIds };
               return; 
             }
           }
        }

        lastSelectionRef.current = { nodes: nodeIds, edges: edgeIds };

        if (edgesChanged) {
          setSelectedEdgeIds(edgeIds);
        }

        if (nodesChanged) {
          // If selection is empty, clear everything
          if (nodeIds.length === 0) {
            const currentStoreIds = selectedNodeIds || [];
            if (currentStoreIds.length > 0) {
              setSelectedNodeIds([]);
            }
            // Only clear if currently set (avoid redundant updates)
            if (selectedNodeIdRef.current) setSelectedNodeId(null);
            return;
          }

          // Update selectedNodeIds (this works for both normal and ai-select modes)
          setSelectedNodeIds(nodeIds);

          // Handle primary selection (selectedNodeId)
          const currentPrimary = selectedNodeIdRef.current;
          
          // We do NOT automatically set selectedNodeId (which opens inspector) for single selections here.
          // Explicit clicks are handled in onNodeClick.
          // This allows "visual selection" without "inspection".
          
          /* 
          if (nodeIds.length === 1) {
            // If it's a new single selection (e.g. Lasso), set it as primary
            if (nodeIds[0] !== currentPrimary) {
              setSelectedNodeId(nodeIds[0]);
            }
          } else {
          */
            // Multi-selection: if the primary node is no longer in the selection, clear it
            if (currentPrimary && !nodeIds.includes(currentPrimary)) {
              setSelectedNodeId(null);
            }
            // If no primary node but we have selection, maybe pick the first one? 
            // if (!currentPrimary && nodeIds.length > 0) {
            //    setSelectedNodeId(nodeIds[0]);
            // }
          /* } */
        }
      }
    },
    [mode, setSelectedNodeIds, setSelectedEdgeIds, setSelectedNodeId, nodeEditorMode, nodeEditorNodeId]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }



// ... (inside GraphCanvasInner)


  return (
    <div className="h-full w-full relative bg-white dark:bg-zinc-900">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
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
        selectNodesOnDrag={false}
        nodesDraggable={!readOnly && interactiveMode}
        nodesConnectable={false}
        elementsSelectable={!readOnly && (mode === 'select' || mode === 'lasso' || mode === 'ai-select')}
        multiSelectionKeyCode={mode === 'ai-select' ? null : 'Control'}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={cn(
          "bg-transparent",
          mode === 'ai-select' && "!cursor-crosshair"
        )}
      >
        <Background 
          variant={BackgroundVariant.Lines} 
          gap={48} 
          size={1} 
          color="#808080" 
          style={{ opacity: 0.15 }}
        />

        <MiniMap
          nodeColor={(node) => getNodeStyle(node).backgroundColor}
          maskColor={maskColor}
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

export function GraphCanvas({ readOnly }: { readOnly?: boolean }) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner readOnly={readOnly} />
    </ReactFlowProvider>
  );
}
