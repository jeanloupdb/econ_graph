"use client";

import { Button } from "@/components/ui/button";
import type { Node } from "@/lib/types";
import { formatNumber } from "@/utils/format";
import { AlertCircle, Layers, Settings2, Sparkles } from "lucide-react";
import type React from "react";

type TonePalette = { bg: string; border: string; text: string };

interface ValueCardProps {
  node: Node;
  color?: TonePalette | null;
  isComposite: boolean;
  isComputed: boolean;
  realValue: number | null;
  scenarioValue: number | null;
  compareData?: {
    value_a: number | null;
    value_b: number | null;
    real_value: number | null;
  } | null;
  scenarioAName?: string | null;
  scenarioBName?: string | null;
  displayIdentifier: string;
  scenarioEnabled: boolean;
  comparisonEnabled: boolean;
  hasError: boolean;
  onOpenScenarioPanel: () => void;
  valueStyle?: React.CSSProperties;
  activeScenarioName?: string | null;
  activeScenarioColor?: string | null;
  onSmartFix?: () => void;
}

export function ValueCard({
  node,
  color,
  isComposite,
  realValue,
  scenarioValue,
  compareData,
  scenarioAName,
  scenarioBName,
  scenarioEnabled,
  comparisonEnabled,
  hasError,
  onOpenScenarioPanel,
  valueStyle,
  activeScenarioName,
  activeScenarioColor,
  onSmartFix,
}: ValueCardProps) {
  const containerStyle: React.CSSProperties = color
    ? {
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 6,
        padding: 12,
      }
    : {};

  const valueBlock = (() => {
    if (comparisonEnabled && compareData) {
      return (
        <div className="space-y-2 text-sm">
          <ComparisonRow
            label={
              scenarioAName === "baseline"
                ? "Baseline (valeurs de base)"
                : scenarioAName || "Scénario"
            }
            value={compareData.value_a}
            colorClass="bg-blue-500"
            unit={node.unit}
          />
          <ComparisonRow
            label={
              scenarioBName === "baseline"
                ? "Baseline (valeurs de base)"
                : scenarioBName || "Scénario"
            }
            value={compareData.value_b}
            colorClass="bg-emerald-500"
            unit={node.unit}
          />
          <div className="pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="font-medium mb-0.5">
              Valeur réelle (données API)
            </div>
            <div className="font-mono">
              {compareData.real_value == null
                ? "—"
                : `${formatNumber(compareData.real_value)}${node.unit ? ` ${node.unit}` : ""}`}
            </div>
          </div>
        </div>
      );
    }

    if (scenarioEnabled) {
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 font-semibold">
              Scénario
            </div>
            <div className="text-3xl font-bold" style={valueStyle}>
              {scenarioValue === null || scenarioValue === undefined ? "—" : formatNumber(scenarioValue)}
              {node.unit && scenarioValue !== null && scenarioValue !== undefined && (
                <span className="text-base ml-2 text-zinc-500 dark:text-zinc-400">{node.unit}</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 font-semibold">
              Réel (baseline)
            </div>
            <div className="text-lg font-semibold text-zinc-600 dark:text-zinc-400">
              {realValue === null || realValue === undefined ? "—" : formatNumber(realValue)}
              {node.unit && realValue !== null && realValue !== undefined && (
                <span className="text-sm ml-1.5 text-zinc-500 dark:text-zinc-400">{node.unit}</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-3xl font-bold" style={valueStyle}>
        {realValue === null || realValue === undefined ? "—" : formatNumber(realValue)}
        {node.unit && realValue !== null && realValue !== undefined && (
          <span className="text-base ml-2 text-zinc-500 dark:text-zinc-400">{node.unit}</span>
        )}
      </div>
    );
  })();

  return (
    <div
      className={`rounded-md ${
        !color ? "border border-zinc-200 dark:border-zinc-800" : ""
      }`}
      style={containerStyle}
    >
      {scenarioEnabled && activeScenarioName && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800"
          style={{ backgroundColor: activeScenarioColor ? `${activeScenarioColor}15` : undefined }}
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeScenarioColor || '#3b82f6' }}
          />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {activeScenarioName}
          </span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            {valueBlock}
          </div>
          {isComposite && (
            <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
          )}
        </div>

        {hasError && (
          <div className="mt-2 text-xs text-red-700 dark:text-red-300 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{node.computation_error}</div>
            </div>
            {onSmartFix && (
              <Button
                variant="outline"
                size="sm"
                className="self-start h-6 px-2 text-xs gap-1.5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900 ml-6"
                onClick={onSmartFix}
              >
                <Sparkles className="h-3 w-3" />
                Fix with AI
              </Button>
            )}
          </div>
        )}

        {!comparisonEnabled && (
          <button
            onClick={onOpenScenarioPanel}
            className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            <span className="underline">Modifier dans un scénario</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface ComparisonRowProps {
  label: string;
  value: number | null;
  colorClass: string;
  unit?: string;
}

function ComparisonRow({ label, value, colorClass, unit }: ComparisonRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <div className="inline-flex items-center gap-1">
          <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
          <span className="font-medium text-xs text-zinc-700 dark:text-zinc-200">
            {label}
          </span>
        </div>
        <span className="font-mono">
          {value == null ? "—" : formatNumber(value)}
          {unit && value !== null && (
            <span className="text-xs ml-1 text-zinc-500 dark:text-zinc-400">{unit}</span>
          )}
        </span>
      </div>
    </div>
  );
}

