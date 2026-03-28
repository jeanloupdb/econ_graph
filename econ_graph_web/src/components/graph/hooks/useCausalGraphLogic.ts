
import { useGraphData } from "@/graph/context/GraphDataContext";
import { apiClient } from "@/lib/api/client";
import {
    useComputeAll,
    useComputeWithScenario,
    useCreateScenario,
    useDeleteScenario,
    useScenarios,
    useUpdateOverrides
} from "@/lib/api/hooks";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import type { Node } from "@/lib/types";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function useCausalGraphLogic() {
  const { nodes = [], isLoading: isDataLoading } = useGraphData();
  const { isLightMode } = useGraphTheme();
  
  // Store actions
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setIsComputing = useUIStore((s) => s.setIsComputing);
  const isComputing = useUIStore((s) => s.isComputing);
  const aiFocusTarget = useUIStore((s) => s.aiFocusTarget);
  
  // Scenario state
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  const setComparisonMode = useScenarioStore((s) => s.setComparisonMode);
  const scenarioComputedValues = useScenarioStore((s) => s.scenarioComputedValues);
  const scenarioValuesScenarioId = useScenarioStore((s) => s.scenarioValuesScenarioId);
  const setScenarioComputedValues = useScenarioStore((s) => s.setScenarioComputedValues);
  
  // API hooks
  const updateOverrides = useUpdateOverrides();
  const computeWithScenario = useComputeWithScenario();
  const computeAll = useComputeAll();
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();

  // Local UI state
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [viewFullResultDetailId, setViewFullResultDetailId] = useState<string | null>(null);
  const [selectedCenterNodeId, setSelectedCenterNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [flashHighlightId, setFlashHighlightId] = useState<string | null>(null);
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [creatingScenario, setCreatingScenario] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [scenarioToDelete, setScenarioToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scenariosContainerRef = useRef<HTMLDivElement>(null);
  const fetchingScenarioRef = useRef<string | null>(null);

  // Scroll to start of scenarios list when active scenario changes
  useEffect(() => {
    if (scenariosContainerRef.current) {
      scenariosContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [activeScenarioId]);

  // Auto-load scenario values when activeScenarioId changes (e.g., from notification)
  // Only trigger if scenario values haven't been loaded yet for this scenario
  useEffect(() => {
    if (activeScenarioId && scenarioValuesScenarioId !== activeScenarioId && currentProjectId) {
      // Skip if already fetching this scenario to prevent double requests
      if (fetchingScenarioRef.current === activeScenarioId) return;

      fetchingScenarioRef.current = activeScenarioId;
      setIsComputing(true);
      computeWithScenario
        .mutateAsync({
          projectId: currentProjectId,
          scenarioId: activeScenarioId,
        })
        .then((result) => {
          setScenarioComputedValues(activeScenarioId, result.results);
        })
        .catch((e) => {
          console.error("Failed to load scenario values", e);
        })
        .finally(() => {
          fetchingScenarioRef.current = null;
          setIsComputing(false);
        });
    }
  }, [activeScenarioId, scenarioValuesScenarioId, currentProjectId, computeWithScenario, setScenarioComputedValues, setIsComputing]);

  // Focus input when editing starts
   useEffect(() => {
    if (editingParamId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingParamId]);

  // Build graph structure
  const { adj, revAdj, settings, results, intermediates, nodeById } = useMemo(() => {
    const slugToId = new Map<string, string>();
    const byId = new Map<string, Node>();
    nodes.forEach((n) => {
      if (n.slug) slugToId.set(n.slug, n.id);
      slugToId.set(n.id, n.id);
      byId.set(n.id, n);
    });

    const allEdges = nodes.flatMap((n) =>
      deriveEdgesFromCompute(
        { id: n.id, computation_definition: n.computation_definition },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );

    const adjMap = new Map<string, string[]>();
    const revAdjMap = new Map<string, string[]>();
    const inCount = new Map<string, number>();
    const outCount = new Map<string, number>();

    nodes.forEach((n) => {
      adjMap.set(n.id, []);
      revAdjMap.set(n.id, []);
      inCount.set(n.id, 0);
      outCount.set(n.id, 0);
    });

    allEdges.forEach((e) => {
      if (adjMap.has(e.source) && adjMap.has(e.target)) {
        adjMap.get(e.source)!.push(e.target);
        revAdjMap.get(e.target)!.push(e.source);
        inCount.set(e.target, (inCount.get(e.target) || 0) + 1);
        outCount.set(e.source, (outCount.get(e.source) || 0) + 1);
      }
    });

    const settingsNodes: Node[] = [];
    const resultsNodes: Node[] = [];
    const intermediateNodes: Node[] = [];

    nodes.forEach(node => {
      const hasIn = (inCount.get(node.id) || 0) > 0;
      const hasOut = (outCount.get(node.id) || 0) > 0;
      if (!hasIn) settingsNodes.push(node);
      else if (!hasOut) resultsNodes.push(node);
      else intermediateNodes.push(node);
    });

    return {
      adj: adjMap,
      revAdj: revAdjMap,
      settings: settingsNodes.sort((a, b) => (a.label || '').localeCompare(b.label || '')),
      results: resultsNodes.sort((a, b) => (a.label || '').localeCompare(b.label || '')),
      intermediates: intermediateNodes.sort((a, b) => (a.label || '').localeCompare(b.label || '')),
      nodeById: byId,
    };
  }, [nodes]);

  // Compute highlighted nodes (from selection or hover)
  const highlightedNodeIds = useMemo(() => {
    // For hover: only highlight the specific hovered node (not recursive)
    if (hoveredNodeId) {
      return new Set<string>([hoveredNodeId]);
    }

    // When viewing node details, only highlight the selected node itself (no recursive highlighting)
    if (viewFullResultDetailId || selectedCenterNodeId) {
      const rootId = viewFullResultDetailId || selectedCenterNodeId;
      return rootId ? new Set<string>([rootId]) : new Set<string>();
    }

    // For result selection (not full detail view): recursive traversal up the dependency chain
    if (selectedResultId) {
      const highlighted = new Set<string>();
      const queue = [selectedResultId];
      const visited = new Set<string>([selectedResultId]);

      // Traverse up (parents)
      while (queue.length > 0) {
        const current = queue.shift()!;
        highlighted.add(current);
        for (const parent of (revAdj.get(current) || [])) {
          if (!visited.has(parent)) {
            visited.add(parent);
            queue.push(parent);
          }
        }
      }

      return highlighted;
    }

    return new Set<string>();
  }, [selectedResultId, viewFullResultDetailId, selectedCenterNodeId, hoveredNodeId, revAdj]);

  // Helpers
  const getNodeDependencies = useCallback((nodeId: string) => {
    const parents = (revAdj.get(nodeId) || []).map(id => nodeById.get(id)).filter(Boolean) as Node[];
    const children = (adj.get(nodeId) || []).map(id => nodeById.get(id)).filter(Boolean) as Node[];
    return { parents, children };
  }, [adj, revAdj, nodeById]);

  const getNodeValues = useCallback((nodeId: string) => {
    const node = nodeById.get(nodeId);
    const baseline = node?.value_computed ?? null;
    
    let scenario: number | null = null;
    if (activeScenarioId && scenarioValuesScenarioId === activeScenarioId) {
      scenario = scenarioComputedValues[nodeId]?.scenario_value ?? baseline;
    }
    
    const diff = (scenario !== null && baseline !== null) ? scenario - baseline : null;
    
    return { baseline, scenario, diff };
  }, [activeScenarioId, scenarioValuesScenarioId, scenarioComputedValues, nodeById]);

  const getNodeType = useCallback((nodeId: string): 'parameter' | 'calculation' | 'result' | null => {
    if (settings.some(n => n.id === nodeId)) return 'parameter';
    if (intermediates.some(n => n.id === nodeId)) return 'calculation';
    if (results.some(n => n.id === nodeId)) return 'result';
    return null;
  }, [settings, intermediates, results]);

  useEffect(() => {
    if (!aiFocusTarget) return;
    const { target } = aiFocusTarget;
    if (target.kind !== "node" && target.kind !== "node-field") return;
    const nodeId = target.id;
    const nodeType = getNodeType(nodeId);
    if (!nodeType) return;

    if (nodeType === "result") {
      if (viewFullResultDetailId !== nodeId) {
        setViewFullResultDetailId(nodeId);
      }
      return;
    }

    if (selectedCenterNodeId !== nodeId) {
      setSelectedCenterNodeId(nodeId);
    }
  }, [aiFocusTarget, getNodeType, selectedCenterNodeId, setSelectedCenterNodeId, setViewFullResultDetailId, viewFullResultDetailId]);

  // Actions
  const clearResultSelection = useCallback(() => setSelectedResultId(null), []);
  const clearCenterSelection = useCallback(() => setSelectedCenterNodeId(null), []);
  
  const handleOpenInspector = useCallback((nodeId: string) => {
      setSelectedNodeId(nodeId);
      setInspectorOpen(true);
  }, [setSelectedNodeId, setInspectorOpen]);

  const handleScenarioChange = useCallback(async (scenarioId: string | null) => {
    setActiveScenario(scenarioId);
    if (scenarioId && currentProjectId) {
      setIsComputing(true);
      try {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId,
          scenarioId: scenarioId,
        });
        setScenarioComputedValues(scenarioId, result.results);
      } catch (e) {
        console.error(e);
        toast.error("Erreur lors du calcul du scénario");
      } finally {
        setIsComputing(false);
      }
    }
  }, [setActiveScenario, currentProjectId, setIsComputing, computeWithScenario, setScenarioComputedValues]);

  const handleCreateScenario = useCallback(async () => {
    if (!newScenarioName.trim() || !currentProjectId) return;
    try {
      const created = await createScenario.mutateAsync({
        projectId: currentProjectId,
        data: { name: newScenarioName.trim() }
      });
      handleScenarioChange(created.id);
      toast.success("Scénario créé");
      setCreatingScenario(false);
      setNewScenarioName("");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la création");
    }
  }, [newScenarioName, currentProjectId, createScenario, handleScenarioChange]);

  const handleStartEdit = useCallback((node: Node) => {
    setEditingParamId(node.id);
    const { scenario, baseline } = getNodeValues(node.id);
    // In scenario mode use scenario value, otherwise use baseline
    setEditValue(String(activeScenarioId ? (scenario ?? baseline ?? "") : (baseline ?? "")));
  }, [activeScenarioId, getNodeValues]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingParamId) return;

    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) {
      setEditingParamId(null);
      return;
    }

    try {
      setIsComputing(true);

      if (activeScenarioId) {
        // Scenario mode: use overrides
        await updateOverrides.mutateAsync({
          scenarioId: activeScenarioId,
          data: {
            overrides: [{
              node_id: editingParamId,
              mode: "value",
              override_value: numValue,
            }]
          }
        });

        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: activeScenarioId,
        });
        setScenarioComputedValues(activeScenarioId, result.results);
      } else {
        // Baseline mode: update computation_definition directly
        const newDefinition = `def compute():\n    return ${numValue}`;
        await apiClient.patch(`/nodes/${editingParamId}`, {
          computation_definition: newDefinition
        });

        // Recompute all values
        await computeAll.mutateAsync();
      }

      toast.success("Valeur modifiée");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la modification");
    } finally {
      setIsComputing(false);
    }

    setEditingParamId(null);
  }, [editingParamId, activeScenarioId, editValue, updateOverrides, computeWithScenario, computeAll, currentProjectId, setScenarioComputedValues, setIsComputing]);

  // Direct value change (used by sliders) — saves immediately without entering edit mode
  const handleDirectValueChange = useCallback(async (nodeId: string, numValue: number) => {
    try {
      setIsComputing(true);

      if (activeScenarioId) {
        await updateOverrides.mutateAsync({
          scenarioId: activeScenarioId,
          data: {
            overrides: [{
              node_id: nodeId,
              mode: "value",
              override_value: numValue,
            }]
          }
        });

        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: activeScenarioId,
        });
        setScenarioComputedValues(activeScenarioId, result.results);
      } else {
        const newDefinition = `def compute():\n    return ${numValue}`;
        await apiClient.patch(`/nodes/${nodeId}`, {
          computation_definition: newDefinition
        });
        await computeAll.mutateAsync();
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la modification");
    } finally {
      setIsComputing(false);
    }
  }, [activeScenarioId, updateOverrides, computeWithScenario, computeAll, currentProjectId, setScenarioComputedValues, setIsComputing]);

    const handleDeleteScenario = useCallback(async () => {
        if (scenarioToDelete && currentProjectId) {
        const toDelete = scenarioToDelete;
        try {
            await deleteScenario.mutateAsync({
            projectId: currentProjectId,
            scenarioId: toDelete.id
            });
            if (activeScenarioId === toDelete.id) {
            setActiveScenario(null);
            }
            toast.success('Scénario supprimé');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
        setScenarioToDelete(null);
        }
    }, [scenarioToDelete, currentProjectId, deleteScenario, activeScenarioId, setActiveScenario]);

  // Navigate to a dependency node: scroll to it and flash highlight
  const navigateToDependency = useCallback((nodeId: string) => {
    const nodeType = getNodeType(nodeId);
    if (!nodeType) return;

    // Determine the DOM id prefix based on node type
    const prefix = nodeType === 'parameter' ? 'node-param' : nodeType === 'calculation' ? 'node-calc' : 'node-res';
    const element = document.getElementById(`${prefix}-${nodeId}`);

    if (element) {
      // Scroll the element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Flash highlight
      setFlashHighlightId(nodeId);
      setTimeout(() => setFlashHighlightId(null), 500);
    }
  }, [getNodeType]);

  // Listen for global navigation requests (e.g. from AI chat tag clicks)
  const pendingNavigationNodeId = useUIStore((s) => s.pendingNavigationNodeId);
  const requestNodeNavigation = useUIStore((s) => s.requestNodeNavigation);

  useEffect(() => {
    if (!pendingNavigationNodeId) return;
    // Clear the request immediately to avoid re-triggering
    requestNodeNavigation(null);
    // Use the same scroll + flash as "dépend de" clicks
    navigateToDependency(pendingNavigationNodeId);
  }, [pendingNavigationNodeId, navigateToDependency, requestNodeNavigation]);

  return {
    nodes,
    isLightMode,
    currentProjectId,
    scenarios,
    activeScenarioId,
    comparisonEnabled,
    setComparisonMode,
    
    // Graph
    settings,
    results,
    intermediates,
    nodeById,
    highlightedNodeIds,
    
    // UI State
    selectedResultId,
    setSelectedResultId,
    viewFullResultDetailId,
    setViewFullResultDetailId,
    selectedCenterNodeId,
    setSelectedCenterNodeId,
    editingParamId,
    setEditingParamId,
    editValue,
    setEditValue,
    creatingScenario,
    setCreatingScenario,
    newScenarioName,
    setNewScenarioName,
    scenarioToDelete,
    setScenarioToDelete,
    
    // Refs
    inputRef,
    scenariosContainerRef,
    
    // Actions & Helpers
    getNodeValues,
    getNodeDependencies,
    getNodeType,
    clearResultSelection,
    clearCenterSelection,
    handleScenarioChange,
    handleCreateScenario,
    handleStartEdit,
    handleSaveEdit,
    handleDirectValueChange,
    handleDeleteScenario,
    handleOpenInspector,
    
    // Hover & Flash highlight
    hoveredNodeId,
    setHoveredNodeId,
    flashHighlightId,
    navigateToDependency,
    
    // Computed props - hover doesn't trigger fading, only selection does
    hasActiveInteraction: selectedResultId !== null,
    isScenarioActive: !!(activeScenarioId && scenarioValuesScenarioId === activeScenarioId),
    isLoading: isDataLoading || isComputing,
  };
}
