"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiState";
import { formatNumber } from "@/utils/format";
import {
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useComputeWithScenario,
  useDeleteScenario,
  useUpdateOverrides,
  useValidateOverride,
} from "@/lib/api/hooks";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useQueryClient } from "@tanstack/react-query";
import { Code2, FunctionSquare, Loader2, Pencil, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { SidebarItem } from "./SidebarItem";

function ParameterItem({
  node,
  override,
  isActive,
  scenarioId,
  canEdit = true,
}: {
  node: any;
  override: any;
  isActive: boolean;
  scenarioId: string;
  canEdit?: boolean;
}) {
  const { isLightMode } = useGraphTheme();
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((s) => s.setSelectedNodeIds);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const addSelectedNode = useUIStore((s) => s.addSelectedNode);
  const removeSelectedNode = useUIStore((s) => s.removeSelectedNode);
  const setIsComputing = useUIStore((s) => s.setIsComputing);
  const developerMode = useUIStore((s) => s.developerMode);
  const [menuOpen, setMenuOpen] = useState(false);

  const isSelected = selectedNodeIds.includes(node.id);

  const queryClient = useQueryClient();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setScenarioComputedValues = useScenarioStore(
    (s) => s.setScenarioComputedValues
  );
  const scenarioComputedValues = useScenarioStore(
    (s) => s.scenarioComputedValues
  );

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [formulaCode, setFormulaCode] = useState("");
  const [mode, setMode] = useState<"value" | "formula">("value");
  const inputRef = useRef<HTMLInputElement>(null);

  const updateOverrides = useUpdateOverrides();
  const validateOverride = useValidateOverride();
  const computeWithScenario = useComputeWithScenario();
  const [isValidating, setIsValidating] = useState(false);

  const isModified = !!override;

  // Calculate Dot Color
  const baselineValue = node.value_computed;
  let effectiveValue: number | null | undefined = undefined;

  if (override?.mode === "value") {
    effectiveValue = override.override_value;
  } else if (
    scenarioComputedValues?.[scenarioId]?.[node.id]?.scenario_value !==
    undefined
  ) {
    effectiveValue = scenarioComputedValues[scenarioId][node.id].scenario_value;
  } else {
    effectiveValue = baselineValue;
  }

  let dotClass = isLightMode ? "bg-zinc-400" : "bg-zinc-700"; // Default Gray

  if (
    effectiveValue !== undefined &&
    effectiveValue !== null &&
    baselineValue !== undefined &&
    baselineValue !== null
  ) {
    const diff = effectiveValue - baselineValue;
    if (Math.abs(diff) > 1e-9) {
      dotClass = diff > 0 ? "bg-green-500" : "bg-red-500";
    }
  }

  // Initialize mode and values from override
  useEffect(() => {
    if (override) {
      setMode(override.mode || "value");
      if (override.mode === "formula") {
        setFormulaCode(override.override_code || "return real_value * 0.8");
      }
    } else {
      // Reset to default when override is removed
      setMode("value");
      setFormulaCode("");
    }
  }, [override]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!canEdit) {
      return; // Don't allow editing if user can't edit
    }

    if (!isActive) {
      toast.info("Activez ce scénario pour le modifier");
      return;
    }

    setIsEditing(true);
    // Use override value if exists, otherwise base value (computed or default)
    // Note: node.value_computed might be the baseline value if we are looking at the node object from graph data
    const val = override?.override_value ?? node.value_computed ?? "";
    setInputValue(String(val));
  };

  const handleSave = async () => {
    try {
      if (mode === "value") {
        const numValue = parseFloat(inputValue);
        if (isNaN(numValue)) {
          setIsEditing(false);
          return;
        }

        await updateOverrides.mutateAsync({
          scenarioId: scenarioId,
          data: {
            overrides: [
              {
                node_id: node.id,
                mode: "value",
                override_value: numValue,
                override_code: null,
              },
            ],
          },
        });
      } else {
        // mode === 'formula'
        await updateOverrides.mutateAsync({
          scenarioId: scenarioId,
          data: {
            overrides: [
              {
                node_id: node.id,
                mode: "formula",
                override_value: null,
                override_code: formulaCode || "return real_value * 0.8",
              },
            ],
          },
        });
      }

      // Trigger recomputation to update all values
      setIsComputing(true);
      try {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: scenarioId,
        });
        setScenarioComputedValues(scenarioId, result.results);

        // Invalidate and refetch scenarios query to refresh the sidebar
        await queryClient.invalidateQueries({
          queryKey: ["scenarios", "project", currentProjectId],
        });
        await queryClient.refetchQueries({
          queryKey: ["scenarios", "project", currentProjectId],
        });
      } catch (computeError) {
        console.error("Failed to recompute:", computeError);
      } finally {
        setIsComputing(false);
      }

      toast.success("Modification enregistrée");
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to save override", e);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleValidateFormula = async () => {
    if (
      !node.value_computed ||
      node.value_computed === null ||
      node.value_computed === undefined
    ) {
      toast.error("Aucune valeur de base disponible");
      return;
    }

    try {
      setIsValidating(true);
      const result = await validateOverride.mutateAsync({
        scenarioId: scenarioId,
        nodeId: node.id,
        code: formulaCode || "return real_value * 0.8",
        realValue: node.value_computed,
      });

      if (result.ok) {
        toast.success(
          `Résultat: ${result.result}${node.unit ? ` ${node.unit}` : ""}`
        );
      } else {
        toast.error(result.error || "Erreur de validation");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la validation");
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Sending null to remove the override (assuming backend handles null as deletion or reset)
      // If the backend requires a specific delete endpoint, this might need adjustment.
      // Based on types, override_value can be null.
      await updateOverrides.mutateAsync({
        scenarioId: scenarioId,
        data: {
          overrides: [
            {
              node_id: node.id,
              mode: "value",
              override_value: null,
            },
          ],
        },
      });

      // Trigger recomputation to update all values
      setIsComputing(true);
      try {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: scenarioId,
        });
        setScenarioComputedValues(scenarioId, result.results);

        // Invalidate and refetch scenarios query to refresh the sidebar
        await queryClient.invalidateQueries({
          queryKey: ["scenarios", "project", currentProjectId],
        });
        await queryClient.refetchQueries({
          queryKey: ["scenarios", "project", currentProjectId],
        });

        toast.success("Valeur réinitialisée");
      } catch (computeError) {
        console.error("Failed to recompute:", computeError);
      } finally {
        setIsComputing(false);
      }
    } catch (e) {
      console.error("Failed to reset override", e);
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      handleSave();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setIsEditing(false);
    }
  };

  const handleClickParameter = (e: React.MouseEvent) => {
    if (isEditing) return;

    if (e.ctrlKey || e.metaKey) {
      // Multi-selection with Ctrl/Cmd
      if (isSelected) {
        removeSelectedNode(node.id);
      } else {
        addSelectedNode(node.id);
      }
    } else if (e.shiftKey) {
      // Add to selection with Shift
      if (!isSelected) {
        addSelectedNode(node.id);
      }
    } else {
      // Single selection - select node and open inspector
      setSelectedNodeIds([node.id]);
      setSelectedNodeId(node.id);
      setInspectorOpen(true);
    }
  };

  return (
    <div className="relative">
      {!isEditing ? (
        <SidebarItem
          icon={
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
              <Box
                className={cn(
                  "h-3.5 w-3.5",
                  isLightMode ? "text-orange-700" : "text-orange-400"
                )}
              />
            </div>
          }
          label={
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "truncate select-none font-medium",
                  isLightMode ? "text-zinc-900" : "text-zinc-100"
                )}
                title={node.label}
              >
                {node.label}
              </span>
              {override?.mode === "formula" && (
                <Code2
                  className={cn(
                    "h-3 w-3 shrink-0",
                    isLightMode ? "text-blue-600" : "text-blue-300"
                  )}
                />
              )}
            </div>
          }
          isSelected={isSelected}
          isActive={isActive}
          onClick={handleClickParameter}
          rightContent={
            <>
              {isModified && (
                <button
                  onClick={handleReset}
                  className={cn(
                    "p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100",
                    isLightMode
                      ? "hover:bg-zinc-300 text-zinc-600 hover:text-zinc-900"
                      : "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  )}
                  title="Réinitialiser"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}

              <div
                className={cn(
                  "ml-2 shrink-0 text-xs font-mono flex items-center justify-end transition-all",
                  isActive
                    ? cn(
                        "min-w-[3rem] px-1.5 py-0.5 rounded border border-transparent cursor-pointer group/value",
                        isLightMode
                          ? "bg-white hover:border-zinc-400"
                          : "bg-zinc-900 hover:border-zinc-600"
                      )
                    : isLightMode
                    ? "text-zinc-600"
                    : "text-zinc-500",
                  isModified
                    ? isLightMode
                      ? "font-semibold text-zinc-900"
                      : "font-semibold text-zinc-100"
                    : isLightMode
                    ? "text-zinc-700"
                    : "text-zinc-400"
                )}
                onDoubleClick={handleDoubleClick}
                title={isActive ? "Double-cliquer pour modifier" : undefined}
              >
                {isModified
                  ? override.mode === "formula"
                    ? "ƒ(x)"
                    : formatNumber(override.override_value)
                  : formatNumber(node.value_computed)}
              </div>

              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger
                  className={cn(
                    "p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100",
                    isLightMode ? "hover:bg-zinc-300" : "hover:bg-zinc-800"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical
                    className={cn(
                      "h-3 w-3",
                      isLightMode ? "text-zinc-600" : "text-zinc-400"
                    )}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode("value");
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil
                      className={cn(
                        "h-3.5 w-3.5 mr-2",
                        isLightMode ? "text-zinc-600" : "text-zinc-500"
                      )}
                    />
                    Modifier la valeur
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode("formula");
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    <FunctionSquare
                      className={cn(
                        "h-3.5 w-3.5 mr-2",
                        isLightMode ? "text-zinc-600" : "text-zinc-500"
                      )}
                    />
                    Fonction
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />
      ) : null}

      {isEditing && mode === "value" && (
        <div
          className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "h-7 flex-1 text-xs px-2 border-blue-500 ring-1 ring-blue-500/20",
              isLightMode
                ? "bg-white text-zinc-900"
                : "bg-zinc-950 text-zinc-100"
            )}
            placeholder="Valeur numérique"
          />
          <button
            onClick={handleSave}
            className="px-2.5 py-1 rounded text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            OK
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className={cn(
              "px-2 py-1 rounded text-[10px] transition-colors",
              isLightMode
                ? "text-zinc-600 hover:text-zinc-900"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            ✕
          </button>
        </div>
      )}

      {isEditing && mode === "formula" && (
        <div
          className={cn(
            "flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200 rounded p-2 border",
            isLightMode
              ? "bg-white border-zinc-300"
              : "bg-zinc-900/40 border-zinc-800"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              "text-[10px] flex items-center justify-between",
              isLightMode ? "text-zinc-700" : "text-zinc-400"
            )}
          >
            <span>Formule Python</span>
            <code
              className={cn(
                "px-1.5 py-0.5 rounded text-[9px]",
                isLightMode ? "bg-zinc-200" : "bg-zinc-800"
              )}
            >
              real_value
            </code>
          </div>
          <CodeEditor
            value={`def compute(real_value):\n    ${
              formulaCode || "return real_value * 0.8"
            }`}
            onChange={(val) => {
              const lines = val.split("\n");
              const bodyLines = lines.slice(1);
              const body = bodyLines
                .map((line) => (line.startsWith("    ") ? line.slice(4) : line))
                .join("\n");
              setFormulaCode(body);
            }}
            language="python"
            height="70px"
            showVariablePalette={false}
            availableConstants={[]}
            enableCompletion={false}
            showSnippets={false}
          />
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={handleValidateFormula}
              disabled={isValidating}
              className={cn(
                "px-2 py-1 rounded text-[10px] transition-colors disabled:opacity-50",
                isLightMode
                  ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                  : "bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
              )}
            >
              {isValidating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Tester"
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={updateOverrides.isPending}
              className="px-2 py-1 rounded text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {updateOverrides.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "OK"
              )}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className={cn(
                "px-2 py-1 rounded text-[10px] transition-colors",
                isLightMode
                  ? "text-zinc-600 hover:text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ScenarioItem({
  scenario,
  isActive,
  onSelect,
  canEdit = true,
}: {
  scenario: any;
  isActive: boolean;
  onSelect: () => void;
  canEdit?: boolean;
}) {
  const { isLightMode } = useGraphTheme();
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { nodes = [] } = useGraphData();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const resetToBaseline = useScenarioStore((s) => s.resetToBaseline);
  const deleteScenarioMutation = useDeleteScenario();

  // Auto-expand when active
  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  // Identify parameters (roots)
  const parameters = useMemo(() => {
    const slugToId = new Map<string, string>();
    nodes.forEach((n) => {
      if (n.slug) slugToId.set(n.slug, n.id);
      slugToId.set(n.id, n.id);
    });

    const edges = nodes.flatMap((n) =>
      deriveEdgesFromCompute(
        { id: n.id, computation_definition: n.computation_definition },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );

    const incomingIds = new Set(edges.map((e) => e.target));
    return nodes.filter((n) => !incomingIds.has(n.id));
  }, [nodes]);

  const overridesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (scenario.overrides) {
      scenario.overrides.forEach((o: any) => map.set(o.node_id, o));
    }
    return map;
  }, [scenario.overrides]);

  const handleDelete = async () => {
    if (!currentProjectId) return;
    try {
      await deleteScenarioMutation.mutateAsync({
        scenarioId: scenario.id,
        projectId: currentProjectId,
      });
      if (activeScenarioId === scenario.id) {
        resetToBaseline();
      }
      toast.success("Scénario supprimé");
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete scenario:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col rounded-lg transition-all border",
          isActive
            ? "border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]"
            : cn(
                "border-transparent",
                isLightMode ? "hover:bg-zinc-300/50" : "hover:bg-white/5"
              )
        )}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer select-none group"
          onClick={onSelect}
        >
          {/* Selection Checkbox (Left) */}
          <div
            className={cn(
              "flex items-center justify-center w-4 h-4 rounded border-2 transition-colors shrink-0",
              isActive
                ? "bg-blue-500 border-blue-500"
                : isLightMode
                ? "border-zinc-400"
                : "border-zinc-600"
            )}
          >
            {isActive && (
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </div>

          {/* Title & Color (Middle) */}
          <div
            className={cn(
              "flex-1 flex items-center gap-3 min-w-0",
              isActive
                ? isLightMode
                  ? "text-zinc-900 font-semibold"
                  : "text-zinc-100 font-semibold"
                : isLightMode
                ? "text-zinc-800"
                : "text-zinc-300"
            )}
          >
            <span className="truncate">{scenario.name}</span>
          </div>

          {/* Delete Button (appears on hover if canEdit) */}
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialogOpen(true);
              }}
              className={cn(
                "p-0.5 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100",
                isLightMode
                  ? "text-zinc-600 hover:bg-zinc-200"
                  : "text-zinc-400 hover:bg-zinc-700"
              )}
              title="Supprimer le scénario"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Expand Chevron (Right) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={cn(
              "p-0.5 rounded transition-colors shrink-0",
              isActive
                ? "text-blue-600 hover:bg-blue-500/20"
                : isLightMode
                ? "text-zinc-600 hover:bg-zinc-300"
                : "text-zinc-400 hover:bg-white/10"
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="pl-5 pr-2 pb-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
            {parameters.map((node) => {
              const override = overridesMap.get(node.id);
              return (
                <ParameterItem
                  key={node.id}
                  node={node}
                  override={override}
                  isActive={isActive}
                  scenarioId={scenario.id}
                  canEdit={canEdit}
                />
              );
            })}
            {parameters.length === 0 && (
              <div
                className={cn(
                  "text-xs italic px-2",
                  isActive
                    ? isLightMode
                      ? "text-zinc-600"
                      : "text-zinc-400"
                    : isLightMode
                    ? "text-zinc-500"
                    : "text-zinc-500"
                )}
              >
                Aucun paramètre
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          className={cn(
            isLightMode
              ? "bg-white border-zinc-300"
              : "bg-zinc-900 border-zinc-800 text-zinc-100"
          )}
        >
          <DialogHeader>
            <DialogTitle
              className={cn(isLightMode ? "text-zinc-900" : "text-zinc-100")}
            >
              Supprimer le scénario ?
            </DialogTitle>
            <DialogDescription
              className={cn(isLightMode ? "text-zinc-600" : "text-zinc-400")}
            >
              Êtes-vous sûr de vouloir supprimer le scénario{" "}
              <strong>{scenario.name}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className={cn(
                isLightMode
                  ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              )}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteScenarioMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteScenarioMutation.isPending
                ? "Suppression..."
                : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
