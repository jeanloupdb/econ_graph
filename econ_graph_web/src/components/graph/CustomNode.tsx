"use client";

import { Badge } from "@/components/ui/badge";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useNodeTones, useTheme } from "@/lib/api/hooks";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { formatNumber } from "@/utils/format";
import { Layers } from "lucide-react";
import React from "react";
import { Handle, NodeProps, Position, useReactFlow } from "reactflow";

export function CustomNode({ data, id, selected }: NodeProps<Node>) {
  const { isLightMode } = useGraphTheme();
  const isComputed = !!data.computation_definition;
  const hasError =
    !!data.computation_error || !!(data as any).provider_last_error;
  const isCompositeNode = !!data.composite_id;

  // Determine leaf (decision) status: no outgoing edges
  const { getEdges } = useReactFlow();
  const edges = getEdges();
  const hasOutputs = edges.some((e) => e.source === id);
  const isLeaf = !hasOutputs;
  const inputs = edges.filter((e) => e.target === id).map((e) => e.source);
  const isRoot = inputs.length === 0; // no incoming edges

  // Determine unified tone based on topology
  const tone: "error" | "root" | "leaf" | "intermediate" = hasError
    ? "error"
    : isRoot
    ? "root"
    : isLeaf
    ? "leaf"
    : "intermediate";

  // Get scenario state
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const scenarioComputedValues = useScenarioStore(
    (s) => s.scenarioComputedValues
  );
  const scenarioValuesScenarioId = useScenarioStore(
    (s) => s.scenarioValuesScenarioId
  );
  const comparisonEnabledGlobal = useScenarioStore((s) => s.comparisonEnabled);
  const comparisonValues = useScenarioStore((s) => s.comparisonValues);
  const graphActions = useGraphActions();
  const isProjectGraph = graphActions.mode === "project";
  const comparisonEnabled = isProjectGraph && comparisonEnabledGlobal;

  const compareData = comparisonEnabled ? comparisonValues[id] : null;

  const scenarioData =
    !comparisonEnabled &&
    activeScenarioId &&
    scenarioValuesScenarioId === activeScenarioId
      ? scenarioComputedValues[id]
      : null;
  const displayValue = !comparisonEnabled
    ? scenarioData?.scenario_value ?? data.value_computed ?? null
    : null;

  const { data: theme } = useTheme();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: toneEntries } = useNodeTones(currentProjectId);

  // Get tone colors from theme - THIS IS KEY FOR 3-COLOR SYSTEM
  const toneColors = (theme as any)?.node_tone?.[tone];

  const highlightedNodeId = useUIStore((s) => s.highlightedNodeId);
  const isHighlighted = highlightedNodeId === id;
  const nodeEditorMode = useUIStore((s) => s.nodeEditorMode);
  const nodeEditorNodeId = useUIStore((s) => s.nodeEditorNodeId);
  const isBeingEdited = nodeEditorMode && nodeEditorNodeId === id;

  // Determine ring color based on tone
  const ringColor = isCompositeNode
    ? "#f59e0b"
    : toneColors?.border ||
      (hasError
        ? "#ef4444"
        : isRoot
        ? "#f59e0b"
        : isLeaf
        ? "#10b981"
        : "#3b82f6");

  const highlightAnimationClass = isHighlighted ? "animate-pulse" : "";
  const boxShadows: string[] = [];

  if (selected || isBeingEdited) {
    boxShadows.push(`0 0 0 4px ${ringColor}`, `0 0 0 8px ${ringColor}40`);
  }

  if (isHighlighted) {
    boxShadows.push("0 0 0 8px rgba(251, 191, 36, 0.35)");
  }
  const boxShadow = boxShadows.length > 0 ? boxShadows.join(", ") : undefined;

  const { nodes: graphNodes } = useGraphData();

  const [isHovered, setIsHovered] = React.useState(false);

  // Node colors based on TONE (root=orange, leaf=green, intermediate=blue, error=red)
  const getToneColors = () => {
    // Use same colors for both light and dark mode
    if (isCompositeNode) {
      return {
        border: "#f59e0b",
        bg: "rgba(251, 191, 36, 0.15)",
        value: "#fbbf24",
        glow: "rgba(251, 191, 36, 0.12)",
      };
    }
    if (hasError) {
      return {
        border: "rgba(239, 68, 68, 0.6)",
        bg: "rgba(239, 68, 68, 0.08)",
        value: "#f87171",
        glow: "rgba(239, 68, 68, 0.12)",
      };
    }
    if (isRoot) {
      // Orange for root nodes (no parents)
      return {
        border: "rgba(249, 115, 22, 0.6)",
        bg: "rgba(249, 115, 22, 0.08)",
        value: "#fb923c",
        glow: "rgba(249, 115, 22, 0.12)",
      };
    }
    if (isLeaf) {
      // Green for leaf nodes (no children)
      return {
        border: "rgba(16, 185, 129, 0.6)",
        bg: "rgba(16, 185, 129, 0.08)",
        value: "#34d399",
        glow: "rgba(16, 185, 129, 0.12)",
      };
    }
    // Blue for intermediate nodes
    return {
      border: "rgba(59, 130, 246, 0.6)",
      bg: "rgba(59, 130, 246, 0.08)",
      value: "#60a5fa",
      glow: "rgba(59, 130, 246, 0.12)",
    };
  };

  const nodeColors = getToneColors();

  // Use same styles for both light and dark mode
  const nodeBg = "rgba(24, 24, 27, 0.9)";
  const textColor = "#f4f4f5";
  const mutedTextColor = "#a1a1aa";

  return (
    <>
      <div
        className={cn(
          "relative rounded-xl border-2 transition-all duration-200 group min-w-[220px] p-4 !overflow-visible",
          "hover:scale-[1.02] hover:-translate-y-0.5",
          "shadow-xl backdrop-blur-xl",
          highlightAnimationClass
        )}
        style={{
          backgroundColor: nodeBg,
          borderColor: nodeColors.border,
          boxShadow: boxShadow || `0 4px 20px ${nodeColors.glow}`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Subtle tint overlay based on tone */}
        <div
          className="absolute inset-0 z-0 pointer-events-none rounded-xl"
          style={{ backgroundColor: nodeColors.bg }}
        />

        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 z-20 hover:!bg-blue-500 hover:!border-blue-400 transition-colors"
          style={{
            backgroundColor: "#52525b",
            borderColor: "#71717a",
          }}
        />

        <div className="space-y-2 relative z-10">
          <div className="flex flex-col gap-1">
            {/* Label (Name) at top */}
            <div className="flex items-center gap-2">
              {isCompositeNode && <Layers className="h-4 w-4 text-amber-500" />}
              <h3
                className="font-medium leading-tight text-base truncate max-w-[200px]"
                style={{ color: textColor }}
              >
                {data.label}
              </h3>
            </div>

            {/* Value below */}
            <div className="font-mono flex items-center gap-1.5">
              {!comparisonEnabled && (
                <>
                  <span
                    className="font-bold text-xl"
                    style={{ color: nodeColors.value }}
                  >
                    {displayValue == null ? "—" : formatNumber(displayValue)}
                  </span>
                  {data.unit && (
                    <span className="text-xs" style={{ color: mutedTextColor }}>
                      {data.unit}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Deviation Badge & Tooltip */}
          {(() => {
            let hasDeviation = false;
            let diffPercent: number | null = null;
            let refValue: number | null = null;
            let newValue: number | null = null;

            if (comparisonEnabled && compareData) {
              if (compareData.value_a != null && compareData.value_b != null) {
                const diff = Math.abs(
                  compareData.value_a - compareData.value_b
                );
                if (diff > 0.000001) {
                  hasDeviation = true;
                  refValue = compareData.value_a;
                  newValue = compareData.value_b;
                  if (refValue !== 0) {
                    diffPercent =
                      ((newValue - refValue) / Math.abs(refValue)) * 100;
                  }
                }
              }
            } else if (activeScenarioId && scenarioData) {
              const base = data.value_computed;
              const scen = scenarioData.scenario_value;
              if (base != null && scen != null) {
                const diff = Math.abs(scen - base);
                if (diff > 0.000001) {
                  hasDeviation = true;
                  refValue = base;
                  newValue = scen;
                  if (refValue !== 0) {
                    diffPercent =
                      ((newValue - refValue) / Math.abs(refValue)) * 100;
                  }
                }
              }
            }

            if (!hasDeviation) return null;

            const isPositive = diffPercent !== null && diffPercent > 0;
            const isNegative = diffPercent !== null && diffPercent < 0;

            let badgeColorClass = "bg-amber-500";
            let borderColorClass = "border-amber-500/50";
            let textColorClass = "text-amber-400";

            if (isPositive) {
              badgeColorClass = "bg-emerald-500";
              borderColorClass = "border-emerald-500/50";
              textColorClass = "text-emerald-400";
            }
            if (isNegative) {
              badgeColorClass = "bg-red-500";
              borderColorClass = "border-red-500/50";
              textColorClass = "text-red-400";
            }

            return (
              <>
                <div
                  className={cn(
                    `absolute -top-6 -right-6 w-7 h-7 rounded-full shadow-md ring-2 z-30 flex items-center justify-center animate-pulse`,
                    badgeColorClass,
                    isLightMode ? "ring-white" : "ring-zinc-900"
                  )}
                />

                {/* Tooltip on Node Hover */}
                {isHovered && (
                  <div className="absolute bottom-full right-0 mb-4 z-[100] w-max pointer-events-none">
                    <div
                      className={`bg-zinc-950 text-white text-base rounded-xl p-4 shadow-[0_0_30px_-5px_rgba(0,0,0,0.6)] border ${borderColorClass} flex flex-col items-end gap-1 animate-in fade-in zoom-in-95 duration-150 slide-in-from-bottom-2 min-w-[220px]`}
                    >
                      <div className="font-bold whitespace-nowrap flex items-center gap-2 text-lg">
                        {diffPercent != null ? (
                          <>
                            <span className={textColorClass}>
                              {diffPercent > 0 ? "+" : ""}
                              {diffPercent.toFixed(1)}%
                            </span>
                            <span className="text-zinc-300 font-medium text-base">
                              d&apos;écart
                            </span>
                          </>
                        ) : (
                          "Valeur différente"
                        )}
                      </div>
                      <div className="text-sm text-zinc-400 whitespace-nowrap font-medium">
                        {comparisonEnabled
                          ? "Entre A et B"
                          : "Par rapport à la baseline"}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 bg-zinc-950 transform rotate-45 absolute bottom-[-8px] right-6 border-r border-b ${borderColorClass}`}
                    />
                  </div>
                )}
              </>
            );
          })()}

          {/* Comparison mode: show A/B values */}
          {comparisonEnabled && compareData && (
            <div
              className="mt-1 space-y-0.5 text-[11px]"
              style={{ color: textColor }}
            >
              <div className="flex items-baseline gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                </span>
                <span className="font-mono font-semibold">
                  {compareData.value_a == null
                    ? "—"
                    : formatNumber(compareData.value_a)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-mono font-semibold">
                  {compareData.value_b == null
                    ? "—"
                    : formatNumber(compareData.value_b)}
                </span>
              </div>
            </div>
          )}

          {/* Error Badge only */}
          {hasError && (
            <div className="mt-1">
              <Badge variant="destructive" className="text-[9px]">
                Erreur
              </Badge>
            </div>
          )}
        </div>

        {/* No source handle for decision (leaf) nodes */}
        {!isLeaf && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-2.5 !h-2.5 !border-2 hover:!bg-blue-500 hover:!border-blue-400 transition-colors"
            style={{
              backgroundColor: isLightMode ? "#a1a1aa" : "#52525b",
              borderColor: isLightMode ? "#71717a" : "#71717a",
            }}
          />
        )}
      </div>
    </>
  );
}
