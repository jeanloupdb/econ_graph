"use client";

import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useGraphRelationships } from "@/graph/hooks/useGraphRelationships";
import { useInsertCompositeNode } from "@/graph/hooks/useInsertCompositeNode";
import { apiClient } from "@/lib/api/client";
import { type NodeToneKey, queryKeys, useNode, useNodeTones, useScenarios, useTheme } from "@/lib/api/hooks";
import { serializeCompositeGraph } from "@/lib/composites/graph";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import type { TonePalette } from "@/lib/nodeStyles";
import {
    DEFAULT_TONE_COLORS,
    FALLBACK_TONE_PALETTE,
} from "@/lib/nodeStyles";
import type { Composite, CompositeCreateInput, CompositeGraphEdge, Node } from "@/lib/types";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlgorithmBlock } from "./AlgorithmBlock";
import { CompositeInputs } from "./CompositeInputs";
import { DependenciesList } from "./DependenciesList";
import { InspectorBreadcrumbs } from "./InspectorBreadcrumbs";
import { InspectorHeader } from "./InspectorHeader";
import { ProviderBlock } from "./ProviderBlock";
import { ValueCard } from "./ValueCard";

export function useInspectorData() {
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const selectedEdgeId = useUIStore((state) => state.selectedEdgeId);
  const selectedEdgeIds = useUIStore((state) => state.selectedEdgeIds);
  const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);
  const setSelectedEdgeId = useUIStore((state) => state.setSelectedEdgeId);
  const inspectorOpen = useUIStore((state) => state.inspectorOpen);
  const panelStack = useUIStore((s) => s.panelStack);
  const popPanel = useUIStore((s) => s.popPanel);
  const sidePanelWidth = useUIStore((s) => s.sidePanelWidth);
  const setSidePanelWidth = useUIStore((s) => s.setSidePanelWidth);
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const setScenarioPanelOpen = useUIStore((s) => s.setScenarioPanelOpen);
  const setScenarioPanelHighlight = useUIStore(
    (s) => s.setScenarioPanelHighlight
  );
  const setLibraryPanelOpen = useUIStore((s) => s.setLibraryPanelOpen);
  const queryClient = useQueryClient();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const graphActions = useGraphActions();
  const insertCompositeNode = useInsertCompositeNode();
  const computeFn = graphActions.computeNode;
  const canCompute = typeof computeFn === "function";
  const { nodes: allNodesData, isLoading: nodesLoading } = useGraphData();
  const {
    dependencies: depsIds,
    dependents: dependentsIds,
    ancestors: ancestorsIds,
  } = useGraphRelationships(selectedNodeId);

  const errorInputNodes = useMemo(() => {
    if (!depsIds || depsIds.length === 0) return [];
    return allNodesData.filter(
      (n) => depsIds.includes(n.id) && !!n.computation_error
    );
  }, [depsIds, allNodesData]);
  const baseNode = useMemo(
    () => allNodesData.find((n) => n.id === selectedNodeId),
    [allNodesData, selectedNodeId]
  );
  const {
    data: fetchedNode,
    isFetching: fetchedNodeLoading,
    refetch: refetchNode,
  } = useNode(selectedNodeId || "", {
    enabled: graphActions.mode === "project" && !!selectedNodeId,
  });
  const nodeRecord = fetchedNode || baseNode;
  const isLoading =
    !!selectedNodeId && !nodeRecord
      ? nodesLoading || fetchedNodeLoading
      : false;
  const isError = !!selectedNodeId && !isLoading && !nodeRecord;
  const error = isError ? new Error("Node not found") : null;
  const refreshNodes = useMemo(() => {
    if (graphActions.mode !== "project") {
      return graphActions.refreshNodes;
    }
    return async () => {
      if (!selectedNodeId) return;
      try {
        await refetchNode();
      } catch {}
    };
  }, [graphActions.mode, graphActions.refreshNodes, selectedNodeId, refetchNode]);

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: tones } = useNodeTones(currentProjectId);
  const toneEntries = useMemo(() => {
    if (!tones) return {} as Record<string, { tone?: NodeToneKey }>;
    return tones as Record<string, { tone?: NodeToneKey }>;
  }, [tones]);
  const { data: theme } = useTheme();
  const graphMode = graphActions.mode;
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const resetToBaseline = useScenarioStore((s) => s.resetToBaseline);
  const scenarioComputedValues = useScenarioStore(
    (s) => s.scenarioComputedValues
  );
  const scenarioValuesScenarioId = useScenarioStore(
    (s) => s.scenarioValuesScenarioId
  );
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  const comparisonValues = useScenarioStore((s) => s.comparisonValues);
  const scenarioAId = useScenarioStore((s) => s.scenarioAId);
  const scenarioBId = useScenarioStore((s) => s.scenarioBId);
  const { data: scenarios = [] } = useScenarios(currentProjectId);

  const showEditModal = useUIStore((s) => s.editNodeModalOpen);
  const setShowEditModal = useUIStore((s) => s.setEditNodeModalOpen);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showEditApiModal, setShowEditApiModal] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [computePending, setComputePending] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [smartFixOpen, setSmartFixOpen] = useState(false);

  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState<number>(-1);
  const suppressNextSelectionPush = useRef(false);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (suppressNextSelectionPush.current) {
      suppressNextSelectionPush.current = false;
      return;
    }
    setNavHistory((history) => {
      if (history.length === 0) {
        setNavIndex(0);
        return [selectedNodeId];
      }
      if (history[history.length - 1] === selectedNodeId) return history;
      const next = history.slice(0, navIndex + 1).concat(selectedNodeId);
      setNavIndex(next.length - 1);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  const navigateToNode = (id: string) => {
    setNavHistory((history) => {
      const base = history.slice(0, navIndex + 1).concat(id);
      setNavIndex(base.length - 1);
      return base;
    });
    setSelectedNodeId(id);
  };

  const goBackOne = () => {
    if (navIndex <= 0) return;
    const prevIdx = navIndex - 1;
    const prevId = navHistory[prevIdx];
    suppressNextSelectionPush.current = true;
    setNavIndex(prevIdx);
    setSelectedNodeId(prevId);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const node = nodeRecord;
    if (!canCompute || computePending || !node || !selectedNodeId) {
      return;
    }
    const needsCompute =
      (node as any).value_computed === null ||
      (node as any).value_computed === undefined;
    if (!needsCompute) return;
    let cancelled = false;
    setComputePending(true);
    computeFn!(selectedNodeId)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setComputePending(false);
          refreshNodes?.();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canCompute, computeFn, nodeRecord, selectedNodeId, computePending, refreshNodes]);

  const handleClose = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedEdgeId, setSelectedNodeId]);

  const handleDelete = useCallback(async () => {
    if (!selectedNodeId) return;
    setDeletePending(true);
    try {
      await graphActions.deleteNode(selectedNodeId);
      setSelectedNodeId(null);
      setConfirmDeleteOpen(false);
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletePending(false);
    }
  }, [graphActions, selectedNodeId, setSelectedNodeId]);

  const handleManualCompute = useCallback(
    async (id: string) => {
      if (!computeFn || computePending) return;
      setComputePending(true);
      try {
        await computeFn(id);
      } catch (error) {
        console.error("Compute error:", error);
      } finally {
        setComputePending(false);
      }
    },
    [computeFn, computePending]
  );

  const typedNode = nodeRecord as unknown as Node | undefined;
  const isCompositeNode = !!typedNode?.composite_id;
  const canTransformToComposite =
    graphActions.mode === "project" &&
    !!typedNode &&
    !isCompositeNode &&
    !!currentProjectId &&
    ancestorsIds.length > 0;
  const displayIdentifier = typedNode
    ? isCompositeNode
      ? typedNode.slug || typedNode.label || "Composite"
      : typedNode.slug || typedNode.id
    : "";
  const compositeEditorUrl =
    typedNode && typedNode.composite_id
      ? `/composites/${typedNode.composite_id}?return=graph${
          currentProjectId ? `&project=${currentProjectId}` : ""
        }`
      : null;

  const nodeConnectionStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        incoming: number;
        outgoing: number;
      }
    >();
    allNodesData.forEach((node) => {
      stats.set(node.id, { incoming: 0, outgoing: 0 });
    });
    const slugToId = new Map<string, string>();
    allNodesData.forEach((node) => {
      if (node.slug) slugToId.set(node.slug, node.id);
      slugToId.set(node.id, node.id);
    });
    allNodesData.forEach((node) => {
      const derived = deriveEdgesFromCompute(
        {
          id: node.id,
          computation_definition: node.computation_definition || undefined,
        },
        { resolveSlug: (slug) => slugToId.get(slug) }
      );
      derived.forEach((edge) => {
        const sourceStats = stats.get(edge.source);
        if (sourceStats) {
          sourceStats.outgoing += 1;
        } else {
          stats.set(edge.source, { incoming: 0, outgoing: 1 });
        }
        const targetStats = stats.get(edge.target);
        if (targetStats) {
          targetStats.incoming += 1;
        } else {
          stats.set(edge.target, { incoming: 1, outgoing: 0 });
        }
      });
    });
    return stats;
  }, [allNodesData]);

  const toneColorMap = useMemo(() => {
    const palette = (theme as any)?.node_tone as
      | Record<string, TonePalette>
      | undefined;
    return palette ?? undefined;
  }, [theme]);

  const getToneForNode = useCallback(
    (id: string): NodeToneKey | null => {
      const toneFromStore = toneEntries[id]?.tone as NodeToneKey | undefined;
      if (toneFromStore) return toneFromStore;
      const node = allNodesData.find((n) => n.id === id);
      if (!node) return null;
      const nodeHasError =
        !!node.computation_error || !!(node as any).provider_last_error;
      if (nodeHasError) return "error";
      const stats = nodeConnectionStats.get(id);
      const incoming = stats?.incoming ?? 0;
      const outgoing = stats?.outgoing ?? 0;
      if (incoming === 0) return "root";
      if (outgoing === 0) return "leaf";
      return "intermediate";
    },
    [toneEntries, allNodesData, nodeConnectionStats]
  );

  const getPaletteForNode = useCallback(
    (id: string): TonePalette => {
      const tone = getToneForNode(id);
      if (!tone) return FALLBACK_TONE_PALETTE;
      if (toneColorMap && toneColorMap[tone]) {
        return toneColorMap[tone]!;
      }
      return DEFAULT_TONE_COLORS[tone] || FALLBACK_TONE_PALETTE;
    },
    [getToneForNode, toneColorMap]
  );

  const compositeToneKey = useMemo(() => {
    if (graphMode !== "composite" || !typedNode) return null;
    const nodeHasError =
      !!typedNode.computation_error || !!(typedNode as any).provider_last_error;
    if (nodeHasError) return "error";
    const isRoot = depsIds.length === 0;
    const isLeaf = dependentsIds.length === 0;
    if (isRoot) return "root";
    if (isLeaf) return "leaf";
    return "intermediate";
  }, [graphMode, typedNode, depsIds, dependentsIds]);

  const rootMotherIds = useMemo(() => {
    if (!typedNode?.computation_definition) return [];
    return ancestorsIds.filter((id) => getToneForNode(id) === "root");
  }, [ancestorsIds, getToneForNode, typedNode?.computation_definition]);

  const algorithmCode = useMemo(() => {
    if (!typedNode) return null;
    const direct = typedNode.computation_definition;
    if (direct && direct.trim().length > 0) return direct;
    const fallback = allNodesData.find((node) => node.id === typedNode.id);
    return (fallback as any)?.computation_definition ?? null;
  }, [typedNode, allNodesData]);

  const algorithmVariables = useMemo(
    () =>
      allNodesData.map((node) => ({
        id: node.id,
        label: node.label,
        tone: toneEntries[node.id]?.tone,
        isComposite: Boolean(node.composite_id),
      })),
    [allNodesData, toneEntries]
  );

  const selectedNodeIds = useUIStore((state) => state.selectedNodeIds);

  const handleTransformToComposite = useCallback(async () => {
    if (!currentProjectId) return;
    
    // Determine which nodes to transform
    let nodesToTransformIds: Set<string>;
    
    if (selectedNodeIds && selectedNodeIds.length > 1) {
      // Multi-selection mode: use explicitly selected nodes
      nodesToTransformIds = new Set(selectedNodeIds);
    } else if (selectedNodeId) {
      // Single selection mode: use node + ancestors (existing behavior)
      if (!canTransformToComposite || !typedNode) return;
      
      const [dependencies, ancestors] = await Promise.all([
        apiClient.get<string[]>(`/nodes/${selectedNodeId}/dependencies`),
        apiClient.get<string[]>(`/nodes/${selectedNodeId}/ancestors`),
      ]);
      
      nodesToTransformIds = new Set([
        selectedNodeId,
        ...((ancestors as string[]) || []),
      ]);
      
      if (nodesToTransformIds.size <= 1 && (dependencies || []).length === 0) {
        toast.error("Ce nœud n'a aucune dépendance à transformer.");
        return;
      }
    } else {
      return;
    }

    setTransforming(true);
    try {
      // Find external dependents (nodes NOT in the selection that depend on nodes IN the selection)
      // We do this client-side using allNodesData to avoid multiple API calls
      const externalDependents = new Set<string>();
      
      // Helper to check dependencies of a node
      const checkNodeDependencies = (node: Node) => {
        // We need to parse dependencies from computation_definition or use a helper
        // Since we don't have a direct dependency list in Node, we rely on the graph structure
        // But we can use deriveEdgesFromCompute which is available
        const edges = deriveEdgesFromCompute(
           { id: node.id, computation_definition: node.computation_definition || undefined },
           { resolveSlug: (slug) => allNodesData.find(n => n.slug === slug)?.id }
        );
        
        // If any edge source is in nodesToTransformIds, this node is a dependent
        const dependsOnSelection = edges.some(e => nodesToTransformIds.has(e.source));
        if (dependsOnSelection && !nodesToTransformIds.has(node.id)) {
          externalDependents.add(node.id);
        }
      };

      allNodesData.forEach(checkNodeDependencies);

      const nodesToClone = allNodesData.filter((node) =>
        nodesToTransformIds.has(node.id)
      );
      
      if (nodesToClone.length !== nodesToTransformIds.size) {
        toast.error(
          "Impossible de récupérer tous les nœuds nécessaires pour la transformation."
        );
        setTransforming(false);
        return;
      }
      
      const dependencyMap = new Map<string, string[]>();
      await Promise.all(
        Array.from(nodesToTransformIds).map(async (nodeId) => {
          try {
            const deps = await apiClient.get<string[]>(`/nodes/${nodeId}/dependencies`);
            dependencyMap.set(nodeId, deps);
          } catch (error) {
            console.warn("Failed to load dependencies for node", nodeId, error);
            dependencyMap.set(nodeId, []);
          }
        })
      );
      
      const explicitEdges: CompositeGraphEdge[] = [];
      dependencyMap.forEach((sources, targetId) => {
        sources
          .filter((sourceId) => nodesToTransformIds.has(sourceId))
          .forEach((sourceId) => {
            explicitEdges.push({ source: sourceId, target: targetId });
          });
      });
      
      const graphData = serializeCompositeGraph(nodesToClone as Node[], {
        edges: explicitEdges,
      });
      
      // Determine label and slug for the new composite
      const primaryNode = typedNode || nodesToClone[nodesToClone.length - 1];
      // Use the primary selected node's label if available, otherwise default
      const initialName = selectedNodeId && typedNode 
        ? typedNode.label 
        : "Nouveau Composite";
        
      // 1. Create Composite
      const payload: CompositeCreateInput = {
        name: initialName,
        graph_data: {
          ...graphData,
          exposed_roots: {},
        } as any,
      };

      await apiClient.post<Composite, CompositeCreateInput>(
        "/composites",
        payload
      );

      // We do NOT modify the current graph (no deletion, no insertion) as per user request.
      // The composite is just added to the library.

      queryClient.invalidateQueries({ queryKey: queryKeys.composites });
      setLibraryPanelOpen(true);
      toast.success("Composite créé avec succès", {
        description: `"${initialName}" a été ajouté à votre bibliothèque.`,
        duration: 5000,
      });

    } catch (error: any) {
      console.error("Failed to transform to composite", error);
      toast.error(error?.message || "Impossible de créer le composite.");
    } finally {
      setTransforming(false);
    }
  }, [
    allNodesData,
    canTransformToComposite,
    currentProjectId,
    selectedNodeId,
    selectedNodeIds,
    typedNode,
    queryClient,
    setLibraryPanelOpen
  ]);

  const handleOpenCompositeEditor = useCallback(() => {
    if (!compositeEditorUrl) return;
    // Reset to baseline when navigating to composite editor (scenarios don't exist in composites)
    if (activeScenarioId) {
      resetToBaseline();
    }
    resetDetailPanels();
    router.push(compositeEditorUrl);
  }, [compositeEditorUrl, resetDetailPanels, router, activeScenarioId, resetToBaseline]);

  const handleOpenEditNode = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleOpenEditApiNode = useCallback(() => {
    setShowEditApiModal(true);
  }, []);

  const handleRequestDelete = useCallback(() => {
    setConfirmDeleteOpen(true);
  }, []);

  const handleOpenSmartFix = useCallback(() => {
    setSmartFixOpen(true);
  }, []);

  const handleApplySmartFix = useCallback(
    async (newCode: string) => {
      if (!selectedNodeId) return;
      try {
        await graphActions.updateNode(selectedNodeId, {
          computation_definition: newCode,
        });
        // Optionally recompute immediately
        if (canCompute) {
          computeFn!(selectedNodeId);
        }
      } catch (error) {
        toast.error("Failed to apply fix");
      }
    },
    [graphActions, selectedNodeId, canCompute, computeFn]
  );

  const handleBreadcrumbNavigate = useCallback(
    (index: number, nodeId: string) => {
      suppressNextSelectionPush.current = true;
      setNavHistory((history) => history.slice(0, index + 1));
      setNavIndex(index);
      setSelectedNodeId(nodeId);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setNavHistory, setNavIndex, setSelectedNodeId]
  );

  const openScenarioPanel = useCallback(
    (nodeId: string) => {
      setScenarioPanelOpen(true);
      setScenarioPanelHighlight(nodeId);
    },
    [setScenarioPanelHighlight, setScenarioPanelOpen]
  );

  const containerStyle = useMemo(
    () => ({ width: `${sidePanelWidth}px` }),
    [sidePanelWidth]
  );

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidePanelWidth;
      const onMove = (ev: MouseEvent) => {
        const dx = startX - ev.clientX;
        setSidePanelWidth(startWidth + dx);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidePanelWidth, setSidePanelWidth]
  );

  const valueCardProps = useMemo(() => {
    if (!typedNode || panelStack.length > 0) return null;
    const isComputed = !!typedNode.computation_definition;
    const hasError = !!typedNode.computation_error;
    const defaultToneKey = hasError
      ? "error"
      : isComputed
        ? "intermediate"
        : "root";
    const toneKey =
      graphMode === "composite"
        ? compositeToneKey || defaultToneKey
        : toneEntries[typedNode.id]?.tone || defaultToneKey;
    const color = toneColorMap ? toneColorMap[toneKey as NodeToneKey] : null;
    const realValue = typedNode.value_computed ?? null;
    const scenarioData =
      activeScenarioId &&
      scenarioValuesScenarioId === activeScenarioId
        ? (scenarioComputedValues as any)?.[typedNode.id]
        : null;
    const scenarioValue = scenarioData
      ? scenarioData?.scenario_value ?? null
      : null;
    const compareData = comparisonEnabled
      ? (comparisonValues as any)?.[typedNode.id]
      : null;
    const scenarioA = scenarios.find((s) => s.id === scenarioAId);
    const scenarioB = scenarios.find((s) => s.id === scenarioBId);
    const activeScenario = scenarios.find((s) => s.id === activeScenarioId);
    return {
      node: typedNode as Node,
      color,
      isComposite: isCompositeNode,
      isComputed,
      realValue,
      scenarioValue,
      compareData,
      scenarioAName:
        scenarioAId === "baseline" ? "baseline" : scenarioA?.name || null,
      scenarioBName:
        scenarioBId === "baseline" ? "baseline" : scenarioB?.name || null,
      displayIdentifier,
      scenarioEnabled: !!activeScenarioId,
      comparisonEnabled,
      hasError,
      onOpenScenarioPanel: () => openScenarioPanel(typedNode.id),
      valueStyle: color ? { color: color.text } : undefined,
      activeScenarioName: activeScenario?.name || null,
      activeScenarioColor: activeScenario?.color || null,
      onSmartFix: handleOpenSmartFix,
    } satisfies React.ComponentProps<typeof ValueCard>;
  }, [
    typedNode,
    panelStack.length,
    graphMode,
    compositeToneKey,
    toneEntries,
    toneColorMap,
    activeScenarioId,
    scenarioValuesScenarioId,
    scenarioComputedValues,
    comparisonEnabled,
    comparisonValues,
    scenarios,
    scenarioAId,
    scenarioBId,
    isCompositeNode,
    displayIdentifier,
    openScenarioPanel,
    handleOpenSmartFix,
  ]);

  const algorithmProps = algorithmCode
    ? ({
        code: algorithmCode,
        variables: algorithmVariables,
        onEdit: !isCompositeNode ? handleOpenEditNode : undefined,
      } satisfies React.ComponentProps<typeof AlgorithmBlock>)
    : null;

  const providerProps = typedNode && (typedNode as any).provider_enabled
    ? ({
        node: typedNode,
        providerUrl: (typedNode as any).provider_url,
        providerJsonPath: (typedNode as any).provider_json_path,
        providerLastFetchedAt: (typedNode as any).provider_last_fetched_at,
        providerLastError: (typedNode as any).provider_last_error,
        canCompute,
        computePending,
        onManualCompute: () => handleManualCompute(typedNode.id),
        onEdit: handleOpenEditApiNode,
      } satisfies React.ComponentProps<typeof ProviderBlock>)
    : null;

  const directDependenciesProps = panelStack.length === 0 && depsIds.length > 0
    ? ({
        title: "Dépendances directes",
        nodes: allNodesData as Node[],
        ids: depsIds,
        onNavigate: navigateToNode,
        getPaletteForNode,
      } satisfies React.ComponentProps<typeof DependenciesList>)
    : null;

  const rootDependenciesProps = panelStack.length === 0 && rootMotherIds.length > 0
    ? ({
        title: "Dépendances mères (racines amont)",
        nodes: allNodesData as Node[],
        ids: rootMotherIds,
        onNavigate: navigateToNode,
        getPaletteForNode,
      } satisfies React.ComponentProps<typeof DependenciesList>)
    : null;

  const compositeInputsProps = typedNode?.composite_id
    ? ({
        compositeRoots: typedNode.composite_roots,
        compositeRootIds: typedNode.composite_root_ids,
      } satisfies React.ComponentProps<typeof CompositeInputs>)
    : null;

  const notesNodeId = panelStack.length === 0 ? typedNode?.id : undefined;
  const stackPlaceholder =
    !selectedNodeId && !selectedEdgeId && panelStack.length > 0;

  const edgeViewProps = selectedEdgeId
    ? {
        selectedEdgeId,
        selectedEdgeIds,
        edges: [] as any[],
        nodes: allNodesData,
        onClose: handleClose,
        onOpenNode: (nodeId: string) => {
          setSelectedEdgeId(null);
          setSelectedNodeId(nodeId);
        },
      }
    : null;

  const headerProps = {
    node: typedNode,
    isCompositeNode,
    canTransformToComposite,
    transforming,
    canOpenCompositeEditor: !!compositeEditorUrl,
    onOpenCompositeEditor: handleOpenCompositeEditor,
    onEditNode: handleOpenEditNode,
    onEditApiNode: handleOpenEditApiNode,
    onTransformToComposite: handleTransformToComposite,
    onDelete: handleRequestDelete,
    onClose: handleClose,
    selectedNodeIds: useUIStore((s) => s.selectedNodeIds),
  } satisfies React.ComponentProps<typeof InspectorHeader>;

  const breadcrumbProps = {
    navHistory,
    navIndex,
    nodes: allNodesData as Node[],
    canGoBack: navIndex > 0,
    onBack: goBackOne,
    onNavigate: handleBreadcrumbNavigate,
  } satisfies React.ComponentProps<typeof InspectorBreadcrumbs>;

  return {
    inspectorOpen,
    edgeViewProps,
    containerStyle,
    startResize,
    headerProps,
    breadcrumbProps,
    panelStack,
    popPanel,
    stackPlaceholder,
    isLoading,
    isError,
    error,
    refreshNodes,
    valueCardProps,
    algorithmProps,
    providerProps,
    directDependenciesProps,
    rootDependenciesProps,
    compositeInputsProps,
    notesNodeId,
    typedNode,
    isCompositeNode,
    showEditModal,
    setShowEditModal,
    showEditApiModal,
    setShowEditApiModal,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    handleDelete,
    deletePending,
    selectedNodeId,
    scrollRef,
    smartFixOpen,
    setSmartFixOpen,
    handleApplySmartFix,
    errorInputNodes,
    onNavigate: navigateToNode,
  };
}
