"use client";

import { useGraphData } from "@/graph/context/GraphDataContext";
import { useInsertCompositeNode } from "@/graph/hooks/useInsertCompositeNode";
import { useTheme } from "@/lib/api/hooks";
import {
    GRAPH_LIGHT_COLORS,
    useGraphTheme,
} from "@/lib/context/GraphThemeContext";
import { computeElkLayout } from "@/lib/layout/elk";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/store/graphState";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
    Background,
    BackgroundVariant,
    Edge,
    Node as ReactFlowNode,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { CustomEdge } from "./CustomEdge";
import { CustomNode } from "./CustomNode";

function GraphCanvasInner({ readOnly }: { readOnly?: boolean }) {
  const { isLightMode } = useGraphTheme();
  const canvasBg = isLightMode ? GRAPH_LIGHT_COLORS.canvasBg : "#0a0a0b";
  const gridColor = isLightMode ? GRAPH_LIGHT_COLORS.gridColor : "#27272a";
  const maskColor = isLightMode ? "rgba(0, 0, 0, 0.15)" : "rgba(0, 0, 0, 0.3)";

  const {
    nodes: nodesData,
    edges: explicitEdges,
    isLoading: nodesLoading,
    persistNodePositions,
  } = useGraphData();
  const { data: theme } = useTheme();
  const reactFlowInstance = useReactFlow();
  const canEdit = useProjectStore((s) => s.canEdit)();

  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      default: CustomEdge,
      dependency: CustomEdge,
      influence: CustomEdge,
      correlation: CustomEdge,
    }),
    []
  );

  const mode = useUIStore((state) => state.mode);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);
  const selectNodeWithoutInspector = useUIStore(
    (state) => state.selectNodeWithoutInspector
  );
  const selectedEdgeId = useUIStore((state) => state.selectedEdgeId);
  const selectedEdgeIds = useUIStore((state) => state.selectedEdgeIds);
  const setSelectedEdgeId = useUIStore((state) => state.setSelectedEdgeId);
  const setSelectedEdgeIds = useUIStore((state) => state.setSelectedEdgeIds);
  const selectedNodeIds = useUIStore((state) => state.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((state) => state.setSelectedNodeIds);
  const setInspectorOpen = useUIStore((state) => state.setInspectorOpen);
  const setScenarioPanelOpen = useUIStore(
    (state) => state.setScenarioPanelOpen
  );
  const connectionSource = useUIStore((state) => state.connectionSource);
  const setConnectionSource = useUIStore((state) => state.setConnectionSource);
  const isComputing = useUIStore((state) => state.isComputing);
  const aiAssistantOpen = useUIStore((state) => state.aiAssistantOpen);
  const setFloatingPanelOpen = useUIStore(
    (state) => state.setFloatingPanelOpen
  );

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
  const computeHierarchicalPositions = useCallback(
    (nodes: any[], edges: Edge[]) => {
      const incoming = new Map<string, number>();
      nodes.forEach((n) => incoming.set(n.id, 0));
      edges.forEach((e) =>
        incoming.set(e.target, (incoming.get(e.target) || 0) + 1)
      );

      const layers: string[][] = [];
      let layer0 = nodes
        .filter((n) => (incoming.get(n.id) || 0) === 0)
        .map((n) => n.id);
      const seen = new Set<string>(layer0);
      if (layer0.length === 0) layer0 = nodes.map((n) => n.id);
      layers.push(layer0);

      let frontier = new Set(layer0);
      const childrenMap = new Map<string, string[]>();
      edges.forEach((e) => {
        const arr = childrenMap.get(e.source) || [];
        arr.push(e.target);
        childrenMap.set(e.source, arr);
      });

      while (frontier.size > 0) {
        const next = new Set<string>();
        frontier.forEach((src) => {
          (childrenMap.get(src) || []).forEach((t) => {
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
    },
    []
  );

  // Convert API nodes and edges to ReactFlow format
  useEffect(() => {
    if (!nodesData || nodesData.length === 0) {
      setReactFlowNodes([]);
      setReactFlowEdges([]);
      return;
    }

    // Use explicit edges from API if available, otherwise derive from computation definitions
    const derivedEdges =
      (explicitEdges && explicitEdges.length > 0)
        ? explicitEdges
        : nodesData.flatMap((n) =>
            deriveEdgesFromCompute(
              {
                id: n.id,
                computation_definition:
                  (n as any).computation_definition || undefined,
              },
              { resolveSlug: (slug) => slugToId.get(slug) }
            )
          );

    const nodes: ReactFlowNode[] = nodesData.map((node, index) => {
      const persisted =
        (node as any).pos_x != null && (node as any).pos_y != null
          ? {
              x: (node as any).pos_x as number,
              y: (node as any).pos_y as number,
            }
          : undefined;
      const cached = nodePositions.get(node.id);
      const position = cached ||
        persisted || {
          x: (index % 8) * 220,
          y: Math.floor(index / 8) * 140,
        };

      const isBeingEdited = nodeEditorMode && nodeEditorNodeId === node.id;
      const isExplicitlySelected =
        isBeingEdited || selectedNodeIds?.includes(node.id);

      return {
        id: node.id,
        type: "custom",
        position,
        selected: isExplicitlySelected || isBeingEdited,
        style: undefined,
        data: {
          ...node,
          isSelected: false,
        },
      };
    });

    setReactFlowNodes(nodes);

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
        type: "default",
        style: {},
        data: { ...e, baseId, index },
      };
    });

    // Build ancestor edge set for highlighting
    const ancestorEdgeSet = new Set<string>();
    if (selectedNodeIds && selectedNodeIds.length > 0) {
      const allAncestors = new Set<string>();
      const inMap = new Map<string, string[]>();
      nodesData.forEach((n) => inMap.set(n.id, []));
      derivedEdges.forEach((e) => {
        if (!inMap.has(e.target)) inMap.set(e.target, []);
        inMap.get(e.target)!.push(e.source);
      });

      selectedNodeIds.forEach((selectedId) => {
        const stack = [...(inMap.get(selectedId) || [])];
        const visited = new Set<string>();
        while (stack.length > 0) {
          const cur = stack.pop()!;
          if (visited.has(cur)) continue;
          visited.add(cur);
          allAncestors.add(cur);
          (inMap.get(cur) || []).forEach((p) => {
            if (!visited.has(p)) stack.push(p);
          });
        }

        derivedEdges.forEach((e) => {
          if (e.target === selectedId || allAncestors.has(e.target)) {
            if (e.source === selectedId || allAncestors.has(e.source)) {
              ancestorEdgeSet.add(`${e.source}->${e.target}`);
            }
            if (e.target === selectedId && allAncestors.has(e.source)) {
              ancestorEdgeSet.add(`${e.source}->${e.target}`);
            }
          }
        });
      });
    }

    // Edge styling - darker edges for better visibility in light mode
    const defaultEdgeColor = isLightMode ? "#52525b" : "#52525b"; // zinc-600 for better visibility
    const ancestorHighlightColor = isLightMode ? "#6d28d9" : "#8b5cf6"; // deeper purple for light mode
    const styledEdges = newEdges.map((edge) => {
      const isSelectedByEdge = selectedEdgeIds.includes(edge.id);
      const baseEdgeId = edge.data?.baseId || `${edge.source}->${edge.target}`;
      const isAncestorEdge =
        ancestorEdgeSet.has(baseEdgeId) ||
        ancestorEdgeSet.has(`${edge.source}->${edge.target}`);
      const highlight = isSelectedByEdge;
      const stroke =
        (theme as any)?.edge_types?.dependency?.stroke || "#60a5fa";

      if (highlight) {
        return {
          ...edge,
          style: { stroke, strokeWidth: 3 },
          animated: true,
        };
      } else if (isAncestorEdge) {
        return {
          ...edge,
          style: {
            stroke: ancestorHighlightColor,
            strokeWidth: 2,
            opacity: 0.8,
          },
          animated: false,
        };
      } else {
        return {
          ...edge,
          style: { stroke: defaultEdgeColor, strokeWidth: 1.5 },
          animated: false,
        };
      }
    });

    setReactFlowEdges(styledEdges);
  }, [
    nodesData,
    explicitEdges,
    nodePositions,
    selectedEdgeIds,
    selectedNodeIds,
    nodeEditorMode,
    nodeEditorNodeId,
    setReactFlowNodes,
    setReactFlowEdges,
    computeHierarchicalPositions,
    setNodePositions,
    slugToId,
    (theme as any)?.edge_types?.dependency?.stroke,
    isLightMode,
  ]);

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
        const current = (reactFlowNodes || []).map((n) => ({
          id: n.id,
          x: n.position.x,
          y: n.position.y,
        }));
        if (current.length > 0) pushPositionsSnapshot(current as any);
        const derived =
          explicitEdges ||
          nodesData.flatMap((n) =>
            deriveEdgesFromCompute(
              {
                id: n.id,
                computation_definition:
                  (n as any).computation_definition || undefined,
              },
              { resolveSlug: (slug) => slugToId.get(slug) }
            )
          );
        const pos = await computeElkLayout(
          nodesData.map((n) => ({ id: n.id, width: 220, height: 120 } as any)),
          derived.map((e) => ({ id: e.id || `${e.source}-${e.target}`, source: e.source, target: e.target } as any)),
          { direction: 'RIGHT' }
        );
        const positions = Array.from(pos.entries()).map(([id, p]) => ({
          id,
          x: p.x,
          y: p.y,
        }));
        if (positions.length > 0) {
          setNodePositions(positions as any);
          setReactFlowNodes((prev) =>
            prev.map((n) => ({
              ...n,
              position: pos.get(n.id) ? pos.get(n.id)! : n.position,
            }))
          );
        }
      } catch (e) {
        console.error("ELK layout failed", e);
      } finally {
        setLayoutInProgress(false);
      }
    })();
  }, [
    layoutInProgress,
    nodesData,
    explicitEdges,
    reactFlowNodes,
    pushPositionsSnapshot,
    setNodePositions,
    setReactFlowNodes,
    setLayoutInProgress,
    slugToId,
  ]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: ReactFlowNode) => {
      if (nodeEditorMode && nodeEditorNodeId && node.id !== nodeEditorNodeId) {
        return;
      }

      if (mode === "ai-select" && aiAssistantOpen) {
        const currentIds = selectedNodeIds || [];
        if (currentIds.includes(node.id)) {
          setSelectedNodeIds(currentIds.filter((id) => id !== node.id));
        } else {
          setSelectedNodeIds([...currentIds, node.id]);
        }
        return;
      }

      setSelectedNodeIds([node.id]);
      setSelectedNodeId(node.id);
      setInspectorOpen(true);
      setScenarioPanelOpen(false);
      setFloatingPanelOpen(true);
    },
    [
      setSelectedNodeIds,
      setSelectedNodeId,
      setInspectorOpen,
      setScenarioPanelOpen,
      setFloatingPanelOpen,
      mode,
      nodeEditorMode,
      nodeEditorNodeId,
      selectedNodeIds,
      aiAssistantOpen,
    ]
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, _node: ReactFlowNode) => {},
    []
  );

  const getAncestors = useCallback(
    (nodeId: string) => {
      const derived =
        explicitEdges ||
        nodesData.flatMap((n) =>
          deriveEdgesFromCompute(
            {
              id: n.id,
              computation_definition:
                (n as any).computation_definition || undefined,
            },
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
    },
    [explicitEdges, nodesData, slugToId]
  );

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: ReactFlowNode) => {
      const position = node.position;
      setNodePosition(node.id, position.x, position.y);

      try {
        await persistNodePositions([
          { id: node.id, x: position.x, y: position.y },
        ]);
      } catch {}
    },
    [persistNodePositions, setNodePosition]
  );

  const dragStateRef = useRef<{
    startPos: { x: number; y: number };
    startMap: Map<string, { x: number; y: number }>;
    groupIds: string[];
  } | null>(null);

  const onNodeDragStart = useCallback(
    (_: React.MouseEvent, node: ReactFlowNode) => {
      const groupIds = [node.id];
      const startMap = new Map<string, { x: number; y: number }>();
      startMap.set(node.id, { x: node.position.x, y: node.position.y });
      dragStateRef.current = {
        startPos: { x: node.position.x, y: node.position.y },
        startMap,
        groupIds,
      };
    },
    []
  );

  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: ReactFlowNode) => {
      const st = dragStateRef.current;
      if (!st) return;
      const dx = node.position.x - st.startPos.x;
      const dy = node.position.y - st.startPos.y;
      setReactFlowNodes((prev) =>
        prev.map((n) => {
          if (!st.groupIds.includes(n.id)) return n;
          const start = st.startMap.get(n.id) || n.position;
          return {
            ...n,
            position: { x: start.x + dx, y: start.y + dy },
          } as any;
        })
      );
    },
    [setReactFlowNodes]
  );

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
    const targetZoom = Math.min(
      Math.max(currentViewport?.zoom ?? 1, 0.9),
      1.25
    );
    reactFlowInstance.setCenter(x, y, { zoom: targetZoom, duration: 600 });
    const timeout = window.setTimeout(() => setFocusNodeId(null), 800);
    return () => window.clearTimeout(timeout);
  }, [focusNodeId, reactFlowInstance, setFocusNodeId, reactFlowNodes]);

  const onConnect = undefined as any;

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (nodeEditorMode && nodeEditorNodeId) {
        return;
      }

      if (mode === "select") {
        setSelectedEdgeId(edge.id);
      }
    },
    [mode, setSelectedEdgeId, nodeEditorMode, nodeEditorNodeId]
  );

  const onPaneClick = useCallback(() => {
    if (nodeEditorMode && nodeEditorNodeId) {
      return;
    }

    if (mode === "select" || mode === "ai-select") {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedNodeIds([]);
    }
    setConnectionSource(null);
    setScenarioPanelOpen(false);
  }, [
    mode,
    setSelectedNodeId,
    setSelectedEdgeId,
    setSelectedNodeIds,
    setConnectionSource,
    setScenarioPanelOpen,
    nodeEditorMode,
    nodeEditorNodeId,
  ]);

  const insertCompositeNode = useInsertCompositeNode();

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!canEdit) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [canEdit]
  );

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      if (!canEdit) return;
      event.preventDefault();
      const compositeId = event.dataTransfer.getData(
        "application/reactflow/composite"
      );

      if (compositeId && reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        try {
          await insertCompositeNode(compositeId, { position });
        } catch (error) {
          console.error("Failed to drop composite:", error);
        }
      }
    },
    [insertCompositeNode, reactFlowInstance, canEdit]
  );

  const getNodeStyle = useCallback(
    (node: ReactFlowNode) => {
      const data = node.data;
      const hasError =
        !!data.computation_error || !!(data as any).provider_last_error;

      const edges = reactFlowEdges || [];
      const hasOutputs = edges.some((e) => e.source === node.id);
      const isLeaf = !hasOutputs;
      const inputs = edges.filter((e) => e.target === node.id);
      const isRoot = inputs.length === 0;

      const tone: "error" | "root" | "leaf" | "intermediate" = hasError
        ? "error"
        : isRoot
        ? "root"
        : isLeaf
        ? "leaf"
        : "intermediate";

      const toneColors = (theme as any)?.node_tone?.[tone];
      const backgroundColor = toneColors?.border || toneColors?.bg || "#f4f4f5";

      return { backgroundColor };
    },
    [theme, reactFlowEdges]
  );

  const interactiveMode = mode === "select" || mode === "connect";

  const lastSelectionRef = useRef<{ nodes: string[]; edges: string[] }>({
    nodes: [],
    edges: [],
  });
  const selectedNodeIdRef = useRef(selectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: ReactFlowNode[]; edges: Edge[] }) => {
      if (nodeEditorMode && nodeEditorNodeId) {
        return;
      }

      if (mode === "select" || mode === "lasso") {
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

        if (nodesChanged) {
          const currentStoreIds = selectedNodeIds || [];
          if (nodeIds.length === currentStoreIds.length) {
            const sortedStore = [...currentStoreIds].sort();
            const isSame = nodeIds.every((id, i) => id === sortedStore[i]);
            if (isSame) {
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
          if (nodeIds.length === 0) {
            const currentStoreIds = selectedNodeIds || [];
            if (currentStoreIds.length > 0) {
              setSelectedNodeIds([]);
            }
            if (selectedNodeIdRef.current) setSelectedNodeId(null);
            return;
          }

          setSelectedNodeIds(nodeIds);
          const currentPrimary = selectedNodeIdRef.current;
          if (currentPrimary && !nodeIds.includes(currentPrimary)) {
            setSelectedNodeId(null);
          }
        }
      }
    },
    [
      mode,
      setSelectedNodeIds,
      setSelectedEdgeIds,
      setSelectedNodeId,
      nodeEditorMode,
      nodeEditorNodeId,
    ]
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center",
          isLightMode ? "bg-zinc-100" : "bg-[#0a0a0b]"
        )}
      >
        <Loader2
          className={cn(
            "h-8 w-8 animate-spin",
            isLightMode ? "text-zinc-400" : "text-zinc-500"
          )}
        />
      </div>
    );
  }

  return (
    <div
      className="h-full w-full relative"
      style={{ backgroundColor: canvasBg }}
    >
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
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
        elementsSelectable={
          !readOnly &&
          (mode === "select" || mode === "lasso" || mode === "ai-select")
        }
        multiSelectionKeyCode={mode === "ai-select" ? null : "Control"}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={cn(
          "bg-transparent",
          mode === "ai-select" && "!cursor-crosshair"
        )}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={80}
          size={1}
          color={gridColor}
          style={{ opacity: 0.6 }}
        />
      </ReactFlow>

      {isComputing && (
        <div
          className={cn(
            "absolute inset-0 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none",
            isLightMode ? "bg-black/20" : "bg-black/40"
          )}
        >
          <div
            className={cn(
              "backdrop-blur-xl border rounded-xl shadow-2xl px-5 py-4 flex items-center gap-3",
              isLightMode
                ? "bg-white/90 border-zinc-200"
                : "bg-zinc-900/90 border-white/[0.08]"
            )}
          >
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span
              className={cn(
                "text-sm font-medium",
                isLightMode ? "text-zinc-800" : "text-zinc-100"
              )}
            >
              Calcul en cours...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function GraphCanvas({ readOnly }: { readOnly?: boolean }) {
  return <GraphCanvasInner readOnly={readOnly} />;
}
