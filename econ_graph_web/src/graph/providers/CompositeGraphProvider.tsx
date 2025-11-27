import { GraphEnvironment } from "@/components/graph/GraphEnvironment";
import type { NodePositionUpdate } from "@/graph/context/GraphDataContext";
import { apiClient } from "@/lib/api/client";
import {
  ensureCompositeNodeDefaults,
  serializeCompositeGraph,
} from "@/lib/composites/graph";
import type {
  CompositeComputeResponse,
  Node,
  NodeCreate,
  NodeUpdate,
} from "@/lib/types";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface CompositeGraphProviderProps {
  initialNodes?: Node[];
  children: ReactNode;
  onGraphMutated?: () => void;
}

export function CompositeGraphProvider({
  initialNodes = [],
  children,
  onGraphMutated,
}: CompositeGraphProviderProps) {
  const [nodes, setNodes] = useState<Node[]>(() =>
    initialNodes.map((node) => ensureCompositeNodeDefaults(node))
  );
  const nodesRef = useRef<Node[]>(nodes);

  const setNodesWithRef = useCallback((updater: (prev: Node[]) => Node[]) => {
    setNodes((prev) => {
      const next = updater(prev);
      nodesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!initialNodes) return;
    const normalized = initialNodes.map((node) =>
      ensureCompositeNodeDefaults(node)
    );
    let frame = requestAnimationFrame(() => {
      setNodesWithRef((prev) => {
        if (
          prev.length === normalized.length &&
          prev.every((node, idx) => node.id === normalized[idx].id)
        ) {
          return prev;
        }
        return normalized;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialNodes, setNodesWithRef]);

  const persistNodePositions = useCallback(
    async (updates: NodePositionUpdate[]) => {
      if (!updates.length) return;
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      setNodesWithRef((prev) =>
        prev.map((node) => {
          const update = updateMap.get(node.id);
          return update ? { ...node, pos_x: update.x, pos_y: update.y } : node;
        })
      );
      onGraphMutated?.();
    },
    [onGraphMutated, setNodesWithRef]
  );

  const createNode = useCallback(
    async (payload: NodeCreate) => {
      const normalized = ensureCompositeNodeDefaults({
        ...payload,
        project_id: null,
      });
      setNodesWithRef((prev) => [...prev, normalized]);
      onGraphMutated?.();
      return normalized;
    },
    [onGraphMutated, setNodesWithRef]
  );

  const updateNode = useCallback(
    async (id: string, payload: NodeUpdate) => {
      let updated: Node | undefined;
      setNodesWithRef((prev) =>
        prev.map((node) => {
          if (node.id !== id) return node;
          updated = ensureCompositeNodeDefaults({
            ...node,
            ...payload,
          });
          return updated!;
        })
      );
      if (!updated) {
        throw new Error("Node not found");
      }
      onGraphMutated?.();
      return updated;
    },
    [onGraphMutated, setNodesWithRef]
  );

  const deleteNode = useCallback(
    async (id: string) => {
      setNodesWithRef((prev) => prev.filter((node) => node.id !== id));
      onGraphMutated?.();
    },
    [onGraphMutated, setNodesWithRef]
  );

  const computeNode = useCallback(async (targetId: string) => {
    const snapshot = nodesRef.current;
    if (!snapshot.some((node) => node.id === targetId)) {
      throw new Error(`Node ${targetId} not found`);
    }
    const graphData = serializeCompositeGraph(snapshot);
    const response = await apiClient.post<
      CompositeComputeResponse,
      { graph_data: typeof graphData }
    >("/composites/compute", { graph_data: graphData });

    setNodesWithRef((prev) =>
      prev.map((node) => {
        const update = response.results[node.id];
        if (!update) return node;
        return ensureCompositeNodeDefaults({
          ...node,
          value_computed: update.value ?? null,
          computation_error: update.error ?? null,
          last_computed_at: update.last_computed_at ?? null,
        });
      })
    );
  }, []);

  const dataValue = useMemo(
    () => ({
      nodes,
      isLoading: false,
      refresh: () => {},
      persistNodePositions,
    }),
    [nodes, persistNodePositions]
  );

  const actionsValue = useMemo(
    () => ({
      mode: "composite" as const,
      getNodeById: (id: string) => nodes.find((n) => n.id === id),
      createNode,
      updateNode,
      deleteNode,
      computeNode,
      refreshNodes: () => {},
    }),
    [nodes, createNode, updateNode, deleteNode, computeNode]
  );

  return (
    <GraphEnvironment data={dataValue} actions={actionsValue}>
      {children}
    </GraphEnvironment>
  );
}
