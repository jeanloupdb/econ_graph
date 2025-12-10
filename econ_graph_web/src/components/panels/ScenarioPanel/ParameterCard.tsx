"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { IconSwitch } from "@/components/ui/icon-switch";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ComputeNodeResponse, Node, ScenarioCompositeOverride, ScenarioNodeOverride } from "@/lib/types";
import {
    Check,
    ChevronDown,
    ChevronRight,
    Code2,
    Hash,
    Info,
    Loader2,
    RefreshCw,
} from "lucide-react";
import React from "react";
import type { OverrideTarget } from "./types";
import { formatDisplayNumber } from "./utils";

type ValidationMap = Record<string, { ok: boolean; message: string }>;

export interface ParameterCardProps {
  node: Node;
  targetKey: string;
  overrideTarget: OverrideTarget;
  parentCompositeLabel?: string;
  parameterLabel?: string;
  isVirtual?: boolean;
  scenarioEditable: boolean;
  scenarioValuesScenarioId: string | null;
  scenarioComputedValues: Record<string, ComputeNodeResponse | undefined>;
  activeScenarioId: string | null;
  overrideModes: Record<string, "value" | "formula">;
  overrideValues: Record<string, string>;
  overrideCodes: Record<string, string>;
  existingOverrides: Record<string, string>;
  scenarioNodeOverridesMap: Record<string, ScenarioNodeOverride>;
  scenarioCompositeOverridesMap: Record<string, ScenarioCompositeOverride>;
  pendingChanges: Record<string, boolean>;
  setPendingChanges: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  validationResults: ValidationMap;
  tones: any;
  theme: any;
  localHighlightId: string | null;
  highlightRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  expandedRows: Record<string, boolean>;
  toggleRowExpansion: (key: string) => void;
  setPendingModeChange: React.Dispatch<
    React.SetStateAction<{
      targetKey: string;
      newMode: "value" | "formula";
      target: OverrideTarget;
    } | null>
  >;
  setConfirmModeChangeOpen: (open: boolean) => void;
  handleOverrideChange: (key: string, value: string) => void;
  handleSaveOverride: (key: string, target: OverrideTarget) => Promise<void>;
  setOverrideCodes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setValidationResults: React.Dispatch<React.SetStateAction<ValidationMap>>;
  setSelectedNodeId: (id: string) => void;
  isSavingOverride: boolean;
  isValidatingOverride: boolean;
  onValidateOverride: (params: {
    nodeId: string;
    code: string;
    realValue: number;
  }) => Promise<{ ok: boolean; result?: number | null; error?: string | null }>;
}

export function ParameterCard({
  node,
  targetKey,
  overrideTarget,
  parentCompositeLabel,
  parameterLabel,
  isVirtual,
  scenarioEditable,
  scenarioValuesScenarioId,
  scenarioComputedValues,
  activeScenarioId,
  overrideModes,
  overrideValues,
  overrideCodes,
  existingOverrides,
  scenarioNodeOverridesMap,
  scenarioCompositeOverridesMap,
  pendingChanges,
  setPendingChanges,
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
  isSavingOverride,
  isValidatingOverride,
  onValidateOverride,
}: ParameterCardProps) {
  const persistedOverride =
    overrideTarget.type === "node"
      ? scenarioNodeOverridesMap[overrideTarget.nodeId]
      : scenarioCompositeOverridesMap[targetKey];

  const mode =
    overrideModes[targetKey] || persistedOverride?.mode || "value";

  const currentValue = scenarioEditable
    ? overrideValues[targetKey] ?? existingOverrides[targetKey] ?? ""
    : node.value_computed !== null && node.value_computed !== undefined
    ? String(node.value_computed)
    : "";

  const currentCode =
    overrideCodes[targetKey] ?? persistedOverride?.override_code ?? "";

  const scenarioValue =
    activeScenarioId &&
    scenarioValuesScenarioId === activeScenarioId &&
    scenarioComputedValues?.[targetKey]
      ? scenarioComputedValues[targetKey]?.scenario_value ?? null
      : null;

  const hasPendingChange = pendingChanges[targetKey] || false;

  if (
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "production" &&
    activeScenarioId &&
    scenarioValuesScenarioId === activeScenarioId
  ) {
    console.debug("[ScenarioPanel] ParameterCard", {
      targetKey,
      scenarioValue,
      rawEntry: scenarioComputedValues?.[targetKey],
      hasPendingChange,
    });
  }

  const scenarioValueDisplay = formatDisplayNumber(scenarioValue);
  const baselineDisplay = formatDisplayNumber(node.value_computed);
  const appliedDisplay =
    scenarioEditable && scenarioValueDisplay !== "—"
      ? scenarioValueDisplay
      : baselineDisplay;

  const validation = validationResults[targetKey];
  const validationResult =
    validation?.ok && validation.message.includes("Résultat:")
      ? validation.message.replace("Résultat: ", "")
      : null;
  const formulaDisplayValue = validationResult ?? appliedDisplay;
  const hasError = !!(node as any).computation_error;
  const resolvedTone =
    overrideTarget.type === "node"
      ? (tones && (tones as any)[node.id]?.tone)
      : null;
  const toneKey =
    resolvedTone ||
    (hasError
      ? "error"
      : parentCompositeLabel
      ? "root"
      : "intermediate");
  const color = (theme as any)?.node_tone?.[toneKey as any];
  const cardStyle: React.CSSProperties | undefined = color
    ? {
        backgroundColor: color.bg,
        borderColor: color.border,
      }
    : undefined;
  const isDisabled = !scenarioEditable;
  const isHighlighted = localHighlightId === node.id;
  const isExpanded = expandedRows[targetKey] ?? false;
  const elementKey = parentCompositeLabel
    ? `${parentCompositeLabel}-${targetKey}`
    : targetKey;
  const displayLabel = parameterLabel || node.label;
  const summaryValue = scenarioEditable ? appliedDisplay : baselineDisplay;

  const handleValidateFormula = async () => {
    if (
      node.value_computed === null ||
      node.value_computed === undefined ||
      !activeScenarioId ||
      overrideTarget.type !== "node"
    ) {
      return;
    }
    try {
      const res = await onValidateOverride({
        nodeId: overrideTarget.nodeId,
        code: currentCode || "return real_value * 0.8",
        realValue: node.value_computed,
      });
      setValidationResults((prev) => ({
        ...prev,
        [targetKey]: {
          ok: res?.ok ?? false,
          message: res?.ok
            ? `Résultat: ${res?.result ?? "—"}${
                node.unit ? ` ${node.unit}` : ""
              }`
            : res?.error || "Erreur inconnue",
        },
      }));
    } catch (err: any) {
      setValidationResults((prev) => ({
        ...prev,
        [targetKey]: {
          ok: false,
          message: err?.message || "Erreur lors de la validation",
        },
      }));
    }
  };

  const hasDeviation =
    scenarioEditable &&
    scenarioValue !== null &&
    scenarioValue !== undefined &&
    node.value_computed !== null &&
    node.value_computed !== undefined &&
    Math.abs(scenarioValue - node.value_computed) > 0.000001;

  let diffPercent: number | null = null;
  let isPositive = false;
  let isNegative = false;

  if (hasDeviation && node.value_computed != null && scenarioValue != null) {
      const refValue = node.value_computed;
      const newValue = scenarioValue;
      if (refValue !== 0) {
          diffPercent = ((newValue - refValue) / Math.abs(refValue)) * 100;
      }
      isPositive = diffPercent !== null && diffPercent > 0;
      isNegative = diffPercent !== null && diffPercent < 0;
  }

  let badgeColorClass = "bg-amber-500"; // Default/Neutral
  let borderColorClass = "border-amber-500/50";
  let textColorClass = "text-amber-400";

  if (isPositive) {
    badgeColorClass = "bg-emerald-500"; // Positive -> Green
    borderColorClass = "border-emerald-500/50";
    textColorClass = "text-emerald-400";
  }
  if (isNegative) {
    badgeColorClass = "bg-red-500"; // Negative -> Red
    borderColorClass = "border-red-500/50";
    textColorClass = "text-red-400";
  }

  return (
    <div
      key={elementKey}
      className={`relative border rounded-lg bg-white dark:bg-zinc-950/40 shadow-sm transition-shadow ${
        isHighlighted ? "ring-2 ring-amber-400" : ""
      } ${!scenarioEditable ? "opacity-75 grayscale-[0.5]" : ""}`}
      style={cardStyle}
      ref={(el) => {
        highlightRefs.current[targetKey] = el;
      }}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
        onClick={() => toggleRowExpansion(targetKey)}
      >
        <div className="flex-1 min-w-0">
          {parentCompositeLabel && (
            <div className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-300 mb-0.5">
              {parentCompositeLabel}
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            {/* Deviation Badge & Tooltip (Inline) */}
            {hasDeviation && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative flex items-center justify-center mr-1.5 cursor-help shrink-0">
                      <div className={`w-4 h-4 rounded-full ${badgeColorClass} shadow-sm animate-pulse`} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className={`bg-zinc-950 text-white text-base rounded-xl p-4 shadow-[0_0_30px_-5px_rgba(0,0,0,0.6)] border ${borderColorClass} flex flex-col items-center gap-1 min-w-[200px] z-[9999]`}
                  >
                    <div className="font-bold whitespace-nowrap flex items-center gap-2 text-lg">
                      {diffPercent != null ? (
                        <>
                          <span className={textColorClass}>
                            {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                          </span>
                          <span className="text-zinc-300 font-medium text-base">d&apos;écart</span>
                        </>
                      ) : (
                        'Valeur différente'
                      )}
                    </div>
                    <div className="text-sm text-zinc-400 whitespace-nowrap font-medium">
                      Par rapport à la baseline
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className={`font-medium text-sm text-zinc-900 dark:text-zinc-100 ${isExpanded ? "" : "truncate"}`}>
              {displayLabel}
            </span>
            {/* Removed "Modifié" badge */}
            {mode === "formula" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-300">
                <Code2 className="h-3 w-3" />
                Formule
              </span>
            )}
            {hasPendingChange && (
              <span className="text-[10px] text-blue-600 uppercase tracking-wide">
                Brouillon
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
            {node.slug || node.id}
          </div>
        </div>
        <div className="text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <span className={hasDeviation ? "text-amber-700 dark:text-amber-300 font-extrabold text-base" : ""}>
            {summaryValue}
          </span>
          {node.unit && summaryValue !== "—" && (
            <span className={`text-[11px] font-normal ml-1 ${hasDeviation ? "text-amber-700/80 dark:text-amber-300/80 font-medium" : "text-zinc-500 dark:text-zinc-400"}`}>
              {node.unit}
            </span>
          )}
          <div className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
            Baseline: {baselineDisplay}
            {node.unit && baselineDisplay !== "—" ? ` ${node.unit}` : ""}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-[max-height,padding] duration-200 ${
          isExpanded ? "max-h-[700px] px-3 pb-3" : "max-h-0 px-3 pb-0"
        }`}
      >
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Mode de saisie
            </div>
            <IconSwitch
              options={[
                {
                  value: "value",
                  label: "Valeur directe",
                  icon: <Hash className="h-3.5 w-3.5" />,
                },
                {
                  value: "formula",
                  label: "Formule Python",
                  icon: <Code2 className="h-3.5 w-3.5" />,
                },
              ]}
              value={mode}
              disabled={!scenarioEditable}
              onChange={(newMode) => {
                setPendingModeChange({
                  targetKey,
                  newMode,
                  target: overrideTarget,
                });
                setConfirmModeChangeOpen(true);
              }}
            />
          </div>

          {mode === "value" ? (
            <>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  placeholder="Valeur baseline par défaut"
                  value={currentValue}
                  onChange={(e) =>
                    handleOverrideChange(targetKey, e.target.value)
                  }
                  className="text-sm pr-10"
                  readOnly={!scenarioEditable}
                  disabled={!scenarioEditable}
                />
                <button
                  type="button"
                  onClick={() => handleSaveOverride(targetKey, overrideTarget)}
                  disabled={isSavingOverride || !scenarioEditable}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded flex items-center justify-center transition-all ${
                    hasPendingChange
                      ? "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                  title="Valider la modification"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                <div className="font-medium">
                  Valeur appliquée :{" "}
                  <span className="font-semibold">
                    {appliedDisplay}
                    {node.unit && appliedDisplay !== "—"
                      ? ` ${node.unit}`
                      : ""}
                  </span>
                </div>
                <div>
                  Baseline : {baselineDisplay}
                  {node.unit && baselineDisplay !== "—"
                    ? ` ${node.unit}`
                    : ""}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={formulaDisplayValue}
                    className="text-sm pr-10 cursor-default focus:ring-0 focus:ring-offset-0"
                    placeholder="Calculé par formule"
                  />
                  <button
                    type="button"
                    onClick={handleValidateFormula}
                    disabled={
                      overrideTarget.type !== "node" ||
                      isValidatingOverride ||
                      node.value_computed === null ||
                      node.value_computed === undefined ||
                      !scenarioEditable
                    }
                    className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded flex items-center justify-center transition-all ${
                      isValidatingOverride
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                    title="Recalculer avec la formule"
                  >
                    {isValidatingOverride ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <Accordion type="single" collapsible className="w-full -mt-1">
                  <AccordionItem value="algorithm" className="border-0">
                    <AccordionTrigger className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 ring-offset-white transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-300 [&[data-state=open]]:rounded-b-none hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-3.5 w-3.5" />
                        <span>Modifier l&apos;algo</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0">
                      <div className="p-3 border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b bg-white dark:bg-zinc-950">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                              Fonction de calcul
                            </span>
                            <div className="relative group">
                              <Info className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                              <div className="absolute left-0 bottom-full mb-2 w-64 px-3 py-2 bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded whitespace-normal opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9999] shadow-lg">
                                <div className="font-semibold mb-1">
                                  Fonction de calcul
                                </div>
                                <div className="mb-2">
                                  La fonction{" "}
                                  <code className="bg-zinc-800 dark:bg-zinc-600 px-1 py-0.5 rounded">
                                    compute(real_value)
                                  </code>{" "}
                                  retourne la valeur modifiée du paramètre
                                  pour le scénario sélectionné.
                                </div>
                                <div className="text-zinc-300 dark:text-zinc-400">
                                  La variable{" "}
                                  <code className="bg-zinc-800 dark:bg-zinc-600 px-1 py-0.5 rounded">
                                    real_value
                                  </code>{" "}
                                  contient la valeur baseline du paramètre.
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={hasPendingChange ? "default" : "ghost"}
                            disabled={isSavingOverride || !scenarioEditable}
                            onClick={() =>
                              handleSaveOverride(targetKey, overrideTarget)
                            }
                            title="Enregistrer la formule pour ce scénario"
                          >
                            {isSavingOverride ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Enregistrer"
                            )}
                          </Button>
                        </div>

                        <CodeEditor
                          value={`def compute(real_value):\n    ${
                            currentCode || "return real_value * 0.8"
                          }`}
                          onChange={(val) => {
                            const lines = val.split("\n");
                            const bodyLines = lines.slice(1);
                            const body = bodyLines
                              .map((line) =>
                                line.startsWith("    ") ? line.slice(4) : line
                              )
                              .join("\n");
                            setOverrideCodes((prev) => ({
                              ...prev,
                              [targetKey]: body,
                            }));
                            setPendingChanges((prev) => ({
                              ...prev,
                              [targetKey]: true,
                            }));
                          }}
                          language="python"
                          height="100px"
                          readOnly={isDisabled}
                          placeholder="def compute(real_value):\n    return real_value * 0.8"
                          showVariablePalette={false}
                          availableConstants={[]}
                          enableCompletion={false}
                          showSnippets={false}
                        />

                        {validation && !validation.ok && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
                            {validation.message}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                <div className="font-medium">
                  Valeur appliquée :{" "}
                  <span className="font-semibold">
                    {formulaDisplayValue}
                    {node.unit && formulaDisplayValue !== "—"
                      ? ` ${node.unit}`
                      : ""}
                  </span>
                </div>
                <div>
                  Baseline : {baselineDisplay}
                  {node.unit && baselineDisplay !== "—"
                    ? ` ${node.unit}`
                    : ""}
                </div>
              </div>
            </>
          )}

          {!scenarioEditable && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
              {overrideTarget.type === "node" && !isVirtual && (
                <button
                  type="button"
                  className="group inline-flex items-center gap-1 font-medium text-grey-600 underline hover:text-blue-300 transition-colors"
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  Voir dans l’inspector
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
              <span>Activez un scénario pour modifier ce paramètre.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
