"use client";

import {
  useComputeAll,
  useComputeWithScenario,
  useCreateScenario,
  useDeleteScenario,
  useDuplicateScenario,
  useNodeTones,
  useProjectExposedRoots,
  useProjectNodes,
  useScenarios,
  useTheme,
  useUpdateOverrides,
  useUpdateScenario,
  useValidateOverride,
} from "@/lib/api/hooks";
import type {
  Node,
  OverrideUpdate,
  Scenario,
  ScenarioCompositeOverride,
  ScenarioCreate,
  ScenarioNodeOverride,
} from "@/lib/types";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import type { ScenarioHeaderProps } from "./ScenarioHeader";
import type { ScenarioParametersProps } from "./ScenarioParameters";
import type {
  DeleteScenarioDialogProps,
  DuplicateScenarioDialogProps,
  ModeChangeDialogProps,
  NewScenarioDialogProps,
  RenameScenarioDialogProps,
} from "./ScenarioDialogs";
import { useScenarioPanelSections } from "./hooks";
import { makeCompositeOverrideKey, OverrideTarget } from "./types";

export interface ScenarioPanelLogicResult {
  panelRef: React.RefObject<HTMLDivElement | null>;
  containerStyle: React.CSSProperties;
  startResize: (event: React.MouseEvent) => void;
  headerProps: Omit<ScenarioHeaderProps, "onClose">;
  parametersProps: ScenarioParametersProps;
  renameDialogProps: RenameScenarioDialogProps;
  deleteDialogProps: DeleteScenarioDialogProps;
  duplicateDialogProps: DuplicateScenarioDialogProps;
  newScenarioDialogProps: NewScenarioDialogProps;
  modeDialogProps: ModeChangeDialogProps;
}

export function useScenarioPanelLogic(
  isOpen: boolean
): ScenarioPanelLogicResult {
  const panelRef = useRef<HTMLDivElement>(null);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const resetToBaseline = useScenarioStore((s) => s.resetToBaseline);
  const setScenarioComputedValues = useScenarioStore(
    (s) => s.setScenarioComputedValues
  );
  const clearScenarioComputedValues = useScenarioStore(
    (s) => s.clearScenarioComputedValues
  );
  const scenarioComputedValues = useScenarioStore(
    (s) => s.scenarioComputedValues
  );
  const scenarioValuesScenarioId = useScenarioStore(
    (s) => s.scenarioValuesScenarioId
  );
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const { data: nodes = [] } = useProjectNodes(currentProjectId);
  const {
    data: exposedRoots,
    refetch: refetchExposedRoots,
  } = useProjectExposedRoots(currentProjectId);
  const createScenarioMutation = useCreateScenario();
  const updateOverridesMutation = useUpdateOverrides();
  const updateScenarioMutation = useUpdateScenario();
  const deleteScenarioMutation = useDeleteScenario();
  const duplicateScenarioMutation = useDuplicateScenario();
  const computeAll = useComputeAll();
  const computeWithScenario = useComputeWithScenario();
  const validateOverride = useValidateOverride();
  const { data: theme } = useTheme();
  const { data: tones } = useNodeTones(currentProjectId);

  const [newScenarioName, setNewScenarioName] = useState("");
  const [overrideValues, setOverrideValues] = useState<Record<string, string>>(
    {}
  );
  const [overrideModes, setOverrideModes] = useState<
    Record<string, "value" | "formula">
  >({});
  const [overrideCodes, setOverrideCodes] = useState<Record<string, string>>(
    {}
  );
  const [validationResults, setValidationResults] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>(
    {}
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false);
  const [confirmRenameOpen, setConfirmRenameOpen] = useState(false);
  const [confirmNewScenarioOpen, setConfirmNewScenarioOpen] = useState(false);
  const [confirmModeChangeOpen, setConfirmModeChangeOpen] = useState(false);
  const [pendingModeChange, setPendingModeChange] = useState<{
    targetKey: string;
    newMode: "value" | "formula";
    target: OverrideTarget;
  } | null>(null);
  const [renamingScenarioId, setRenamingScenarioId] = useState<string | null>(
    null
  );
  const [editScenarioName, setEditScenarioName] = useState("");
  const [scenarioActionTargetId, setScenarioActionTargetId] = useState<
    string | null
  >(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const sidePanelWidth = useUIStore((s) => s.sidePanelWidth);
  const setSidePanelWidth = useUIStore((s) => s.setSidePanelWidth);
  const scenarioEditable = !!activeScenarioId;
  const scenarioPanelHighlightId = useUIStore(
    (s) => s.scenarioPanelHighlightId
  );
  const setScenarioPanelHighlight = useUIStore(
    (s) => s.setScenarioPanelHighlight
  );
  const highlightRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [localHighlightId, setLocalHighlightId] = useState<string | null>(null);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);

  useEffect(() => {
    let animationFrame: number | null = null;
    let timer: number | null = null;

    if (!scenarioPanelHighlightId) {
      animationFrame = requestAnimationFrame(() => {
        setLocalHighlightId(null);
      });
      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }

    animationFrame = requestAnimationFrame(() => {
      setLocalHighlightId(scenarioPanelHighlightId);
      const el = highlightRefs.current[scenarioPanelHighlightId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    timer = window.setTimeout(() => {
      setLocalHighlightId(null);
      setScenarioPanelHighlight(null);
    }, 2000);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [scenarioPanelHighlightId, setScenarioPanelHighlight]);

  useEffect(() => {
    if (!localHighlightId) return;
    const frame = requestAnimationFrame(() => {
      setExpandedRows((prev) => ({
        ...prev,
        [localHighlightId]: true,
      }));
    });
    return () => cancelAnimationFrame(frame);
  }, [localHighlightId]);

  useEffect(() => {
    if (!isOpen || !currentProjectId) return;
    void refetchExposedRoots();
  }, [isOpen, currentProjectId, refetchExposedRoots]);

  const toggleRowExpansion = (key: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const slugToNodeId = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((node) => {
      if (node.slug) {
        map.set(node.slug, node.id);
      }
      map.set(node.id, node.id);
    });
    return map;
  }, [nodes]);

  const legacyRootNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (node.composite_id) {
        return false;
      }
      if (node.provider_enabled === true) {
        return true;
      }
      if (
        !node.computation_definition ||
        node.computation_definition.trim() === ""
      ) {
        return true;
      }
      const derived = deriveEdgesFromCompute(
        {
          id: node.id,
          computation_definition: node.computation_definition || undefined,
        },
        {
          resolveSlug: (slug) => slugToNodeId.get(slug),
        }
      );
      return derived.length === 0;
    });
  }, [nodes, slugToNodeId]);

  const { compositeSections, filteredRootNodes } = useScenarioPanelSections({
    nodes,
    exposedRoots,
    legacyRootNodes,
  });

  const currentScenario = scenarios.find((s) => s.id === activeScenarioId);
  const actionScenario = scenarioActionTargetId
    ? scenarios.find((s) => s.id === scenarioActionTargetId) || null
    : null;

  const scenarioNodeOverridesMap = useMemo(() => {
    const map: Record<string, ScenarioNodeOverride> = {};
    currentScenario?.overrides?.forEach((override) => {
      map[override.node_id] = override;
    });
    return map;
  }, [currentScenario]);

  const scenarioCompositeOverridesMap = useMemo(() => {
    const map: Record<string, ScenarioCompositeOverride> = {};
    currentScenario?.composite_overrides?.forEach((override) => {
      const internalId =
        override.composite_internal_id || override.internal_id;
      if (!internalId) {
        return;
      }
      const key = makeCompositeOverrideKey(
        override.composite_node_instance_id,
        internalId
      );
      map[key] = override;
    });
    return map;
  }, [currentScenario]);

  const existingOverrides: Record<string, string> = {};
  currentScenario?.overrides?.forEach((override: ScenarioNodeOverride) => {
    if (
      override.override_value !== null &&
      override.override_value !== undefined
    ) {
      existingOverrides[override.node_id] = String(override.override_value);
    }
  });
  currentScenario?.composite_overrides?.forEach(
    (override: ScenarioCompositeOverride) => {
      if (
        override.override_value !== null &&
        override.override_value !== undefined
      ) {
        const internalId =
          override.composite_internal_id || override.internal_id;
        if (!internalId) {
          return;
        }
        const key = makeCompositeOverrideKey(
          override.composite_node_instance_id,
          internalId
        );
        existingOverrides[key] = String(override.override_value);
      }
    }
  );

  const handleCreateScenario = async () => {
    if (!currentProjectId || !newScenarioName.trim()) return;

    const scenarioData: ScenarioCreate = {
      name: newScenarioName.trim(),
      color: "#3B82F6",
    };

    try {
      await createScenarioMutation.mutateAsync({
        projectId: currentProjectId,
        data: scenarioData,
      });

      setNewScenarioName("");
      setConfirmNewScenarioOpen(false);
    } catch (error) {
      console.error("Failed to create scenario:", error);
    }
  };

  const handleConfirmModeChange = async () => {
    if (!pendingModeChange || !activeScenarioId || !currentProjectId) return;

    const { targetKey, newMode, target } = pendingModeChange;

    setOverrideModes((prev) => ({
      ...prev,
      [targetKey]: newMode,
    }));

    const fallbackCode =
      overrideCodes[targetKey] ||
      (target.type === "node"
        ? scenarioNodeOverridesMap[target.nodeId]?.override_code
        : scenarioCompositeOverridesMap[targetKey]?.override_code) ||
      "return real_value * 0.8";

    const override: OverrideUpdate =
      target.type === "node"
        ? {
            node_id: target.nodeId,
            mode: newMode,
            override_value: null,
            override_code: newMode === "formula" ? fallbackCode : null,
          }
        : {
            composite_node_instance_id: target.compositeNodeId,
            composite_internal_id: target.rawInternalId,
            mode: newMode,
            override_value: null,
            override_code: newMode === "formula" ? fallbackCode : null,
          };

    try {
      await updateOverridesMutation.mutateAsync({
        projectId: currentProjectId,
        scenarioId: activeScenarioId,
        data: {
          overrides: [override],
        },
      });

      setPendingChanges((prev) => {
        const newPending = { ...prev };
        delete newPending[targetKey];
        return newPending;
      });
      setValidationResults((prev) => {
        const copy = { ...prev };
        delete copy[targetKey];
        return copy;
      });

      await recomputeForScenario(activeScenarioId);

      toast.success("Mode de calcul modifié");
    } catch (error) {
      console.error("Failed to change mode:", error);
      toast.error("Erreur lors du changement de mode");
    }

    setConfirmModeChangeOpen(false);
    setPendingModeChange(null);
  };

  const recomputeForScenario = async (scenarioId: string | null) => {
    const setIsComputing = useUIStore.getState().setIsComputing;
    try {
      setIsComputing(true);
      if (scenarioId) {
        if (computeWithScenario.isPending) {
          return;
        }
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId,
        });
        if (process.env.NODE_ENV !== "production") {
          const resultKeys = Object.keys(result.results || {});
          console.groupCollapsed(
            "[ScenarioPanel] compute/all results",
            scenarioId,
            `(${resultKeys.length} entrées)`
          );
          console.log("Sample keys:", resultKeys.slice(0, 15));
          const interestingKeys = resultKeys.filter((key) =>
            key.includes("::")
          );
          console.log(
            "Composite entries (first 10):",
            interestingKeys.slice(0, 10)
          );
          console.groupEnd();
        }
        const shouldMerge =
          scenarioValuesScenarioId === scenarioId && scenarioId !== null;
        const mergedResults = shouldMerge
          ? {
              ...scenarioComputedValues,
              ...result.results,
            }
          : result.results;
        setScenarioComputedValues(scenarioId, mergedResults);
        // Also refetch exposed-roots to update baseline values for composite parameters
        await refetchExposedRoots();
      } else {
        await computeAll.mutateAsync();
        clearScenarioComputedValues();
      }
    } catch (error) {
      console.error("Failed to recompute after scenario change:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const handleOverrideChange = (targetKey: string, value: string) => {
    if (!activeScenarioId) return;
    setOverrideValues((prev) => ({
      ...prev,
      [targetKey]: value,
    }));
    setPendingChanges((prev) => ({
      ...prev,
      [targetKey]: true,
    }));
  };

  const handleSaveOverride = async (
    targetKey: string,
    target: OverrideTarget
  ) => {
    if (!activeScenarioId) return;

    const persistedOverride =
      target.type === "node"
        ? scenarioNodeOverridesMap[target.nodeId]
        : scenarioCompositeOverridesMap[targetKey];
    const mode =
      overrideModes[targetKey] || persistedOverride?.mode || "value";
    const code =
      overrideCodes[targetKey] ?? persistedOverride?.override_code ?? "";
    const defaultCode = code || "return real_value * 0.8";
    const rawValue = overrideValues[targetKey] || "";
    const numericValue = rawValue === "" ? null : parseFloat(rawValue);

    if (mode === "value") {
      if (rawValue !== "" && isNaN(numericValue as number)) {
        return;
      }
    }

    const overrideUpdate: OverrideUpdate =
      target.type === "node"
        ? {
            node_id: target.nodeId,
            mode,
            override_value: mode === "value" ? numericValue : null,
            override_code: mode === "formula" ? defaultCode : null,
          }
        : {
            composite_node_instance_id: target.compositeNodeId,
            composite_internal_id: target.rawInternalId,
            mode,
            override_value: mode === "value" ? numericValue : null,
            override_code: mode === "formula" ? defaultCode : null,
          };

    try {
      await updateOverridesMutation.mutateAsync({
        projectId: currentProjectId || undefined,
        scenarioId: activeScenarioId,
        data: { overrides: [overrideUpdate] },
      });

      await recomputeForScenario(activeScenarioId);

      setPendingChanges((prev) => {
        const newPending = { ...prev };
        delete newPending[targetKey];
        return newPending;
      });
      setValidationResults((prev) => {
        const copy = { ...prev };
        delete copy[targetKey];
        return copy;
      });

      toast.success("Modification enregistrée");
    } catch (error) {
      console.error("Failed to update override:", error);
    }
  };

  const handleValidateOverrideRequest = async ({
    nodeId,
    code,
    realValue,
  }: {
    nodeId: string;
    code: string;
    realValue: number;
  }) => {
    if (!activeScenarioId) {
      return { ok: false, error: "Aucun scénario actif" };
    }
    try {
      return await validateOverride.mutateAsync({
        scenarioId: activeScenarioId,
        nodeId,
        code,
        realValue,
      });
    } catch (error: any) {
      return {
        ok: false,
        error: error?.message || "Erreur lors de la validation",
      };
    }
  };

  const handleScenarioSelect = async (scenarioId: string | null) => {
    if (scenarioId === null) {
      resetToBaseline();
    } else {
      setActiveScenario(scenarioId);
    }
    setOverrideValues({});
    setOverrideModes({});
    setOverrideCodes({});
    setValidationResults({});

    await recomputeForScenario(scenarioId);
  };

  const handleRequestRenameScenario = (scenario: Scenario) => {
    setRenamingScenarioId(scenario.id);
    setEditScenarioName(scenario.name);
    setConfirmRenameOpen(true);
  };

  const handleRequestDuplicateScenario = (scenarioId: string) => {
    setScenarioActionTargetId(scenarioId);
    setConfirmDuplicateOpen(true);
  };

  const handleRequestDeleteScenario = (scenarioId: string) => {
    setScenarioActionTargetId(scenarioId);
    setConfirmDeleteOpen(true);
  };

  const handleRenameScenario = async () => {
    if (!renamingScenarioId) return;
    const name = editScenarioName.trim();
    if (!name) return;
    try {
      await updateScenarioMutation.mutateAsync({
        scenarioId: renamingScenarioId,
        data: { name },
      });
      setRenamingScenarioId(null);
      setConfirmRenameOpen(false);
    } catch (error) {
      console.error("Failed to rename scenario:", error);
    }
  };

  const handleConfirmDeleteScenario = async () => {
    if (!scenarioActionTargetId || !currentProjectId) return;
    try {
      await deleteScenarioMutation.mutateAsync({
        scenarioId: scenarioActionTargetId,
        projectId: currentProjectId,
      });
      setConfirmDeleteOpen(false);
      if (activeScenarioId === scenarioActionTargetId) {
        await handleScenarioSelect(null);
      }
      setScenarioActionTargetId(null);
    } catch (error) {
      console.error("Failed to delete scenario:", error);
    }
  };

  const handleConfirmDuplicateScenario = async () => {
    if (!scenarioActionTargetId) return;
    try {
      const result = await duplicateScenarioMutation.mutateAsync({
        scenarioId: scenarioActionTargetId,
      });
      setConfirmDuplicateOpen(false);
      setScenarioActionTargetId(null);
      await handleScenarioSelect(result.id);
    } catch (error) {
      console.error("Failed to duplicate scenario:", error);
    }
  };

  const startResize = (event: React.MouseEvent) => {
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
  };

  const headerProps: Omit<ScenarioHeaderProps, "onClose"> = {
    isOpen,
    scenarios,
    activeScenarioId,
    onSelectScenario: (scenarioId) => {
      void handleScenarioSelect(scenarioId);
    },
    onRequestCreateScenario: () => setConfirmNewScenarioOpen(true),
    onRequestRenameScenario: handleRequestRenameScenario,
    onRequestDuplicateScenario: handleRequestDuplicateScenario,
    onRequestDeleteScenario: handleRequestDeleteScenario,
  };

  const parametersProps: ScenarioParametersProps = {
    projectId: currentProjectId || null,
    filteredRootNodes,
    compositeSections,
    scenarioEditable,
    currentScenario,
    activeScenarioId,
    scenarioValuesScenarioId,
    scenarioComputedValues,
    overrideModes,
    overrideValues,
    overrideCodes,
    existingOverrides,
    scenarioNodeOverridesMap,
    scenarioCompositeOverridesMap,
    pendingChanges,
    validationResults,
    tones,
    theme,
    localHighlightId,
    highlightRefs,
    expandedRows,
    toggleRowExpansion,
    setPendingModeChange,
    setConfirmModeChangeOpen,
    handleOverrideChange,
    handleSaveOverride,
    setOverrideCodes,
    setValidationResults,
    setSelectedNodeId,
    isSavingOverride: updateOverridesMutation.isPending,
    isValidatingOverride: validateOverride.isPending,
    onValidateOverride: handleValidateOverrideRequest,
  };

  const renameDialogProps: RenameScenarioDialogProps = {
    open: confirmRenameOpen,
    value: editScenarioName,
    onValueChange: setEditScenarioName,
    onOpenChange: (open) => {
      setConfirmRenameOpen(open);
      if (!open) {
        setRenamingScenarioId(null);
      }
    },
    onConfirm: () => {
      void handleRenameScenario();
    },
    isSubmitting: updateScenarioMutation.isPending,
  };

  const deleteDialogProps: DeleteScenarioDialogProps = {
    open: confirmDeleteOpen,
    scenario: actionScenario,
    onOpenChange: (open) => {
      setConfirmDeleteOpen(open);
      if (!open) {
        setScenarioActionTargetId(null);
      }
    },
    onConfirm: () => {
      void handleConfirmDeleteScenario();
    },
    isSubmitting: deleteScenarioMutation.isPending,
  };

  const duplicateDialogProps: DuplicateScenarioDialogProps = {
    open: confirmDuplicateOpen,
    scenario: actionScenario,
    onOpenChange: (open) => {
      setConfirmDuplicateOpen(open);
      if (!open) {
        setScenarioActionTargetId(null);
      }
    },
    onConfirm: () => {
      void handleConfirmDuplicateScenario();
    },
    isSubmitting: duplicateScenarioMutation.isPending,
  };

  const newScenarioDialogProps: NewScenarioDialogProps = {
    open: confirmNewScenarioOpen,
    value: newScenarioName,
    onValueChange: setNewScenarioName,
    onOpenChange: (open) => {
      setConfirmNewScenarioOpen(open);
      if (!open) {
        setNewScenarioName("");
      }
    },
    onConfirm: () => {
      void handleCreateScenario();
    },
    isSubmitting: createScenarioMutation.isPending,
  };

  const modeDialogProps: ModeChangeDialogProps = {
    open: confirmModeChangeOpen,
    pendingChange: pendingModeChange,
    onOpenChange: (open) => {
      setConfirmModeChangeOpen(open);
      if (!open) {
        setPendingModeChange(null);
      }
    },
    onConfirm: () => {
      void handleConfirmModeChange();
    },
  };

  const containerStyle = useMemo(
    () =>
      ({
        width: `${sidePanelWidth}px`,
      }) as React.CSSProperties,
    [sidePanelWidth]
  );

  return {
    panelRef,
    containerStyle,
    startResize,
    headerProps,
    parametersProps,
    renameDialogProps,
    deleteDialogProps,
    duplicateDialogProps,
    newScenarioDialogProps,
    modeDialogProps,
  };
}
