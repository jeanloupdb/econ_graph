"use client";

import type { Node } from "@/lib/types";
import { formatNumber } from "@/utils/format";
import { AlertCircle, Settings2, Sparkles } from "lucide-react";
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
  isRoot: boolean;
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
  isRoot,
}: ValueCardProps) {
  
  // Helper for consistent row styling
  const Row = ({ label, value, subValue, highlight }: { label: string, value: React.ReactNode, subValue?: React.ReactNode, highlight?: string }) => (
    <div className="flex items-center justify-between py-1.5 pl-3 pr-4 hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-2 min-w-0">
        {highlight && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: highlight }} />}
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
           {value}
           {node.unit && value !== "—" && <span className="text-xs text-zinc-500 ml-1">{node.unit}</span>}
        </div>
        {subValue && <div className="text-[10px] text-zinc-500">{subValue}</div>}
      </div>
    </div>
  );

  if (comparisonEnabled && compareData) {
    return (
      <div className="flex flex-col">
        <Row 
          label={scenarioAName === "baseline" ? "Baseline" : scenarioAName || "Scénario A"}
          value={compareData.value_a != null ? formatNumber(compareData.value_a) : "—"}
          highlight="#3b82f6"
        />
        <Row 
          label={scenarioBName === "baseline" ? "Baseline" : scenarioBName || "Scénario B"}
          value={compareData.value_b != null ? formatNumber(compareData.value_b) : "—"}
          highlight="#10b981"
        />
        <div className="border-t border-dashed border-white/10 my-1" />
        <Row 
          label="Valeur réelle"
          value={compareData.real_value != null ? formatNumber(compareData.real_value) : "—"}
        />
      </div>
    );
  }

  if (scenarioEnabled) {
    return (
      <div className="flex flex-col">
        <Row 
          label={activeScenarioName || "Scénario"}
          value={scenarioValue != null ? formatNumber(scenarioValue) : "—"}
          highlight={activeScenarioColor || "#3b82f6"}
        />
        <Row 
          label="Baseline"
          value={realValue != null ? formatNumber(realValue) : "—"}
        />
        
        {hasError && (
           <div className="mx-4 mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
             <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
             <div className="flex-1">
               <div className="font-medium mb-1">Erreur de calcul</div>
               <div className="opacity-90">{node.computation_error}</div>
               {onSmartFix && (
                 <button 
                   onClick={onSmartFix}
                   className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                 >
                   <Sparkles className="h-3 w-3" />
                   Réparer avec l'IA
                 </button>
               )}
             </div>
           </div>
        )}

        {!hasError && !comparisonEnabled && isRoot && (
           <div className="px-4 py-2">
             <button
               onClick={onOpenScenarioPanel}
               className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
             >
               <Settings2 className="h-3.5 w-3.5" />
               Modifier dans le scénario
             </button>
           </div>
        )}
      </div>
    );
  }

  // Default / Baseline Mode
  return (
    <div className="flex flex-col">
      <div className="py-2 pl-3 pr-4">
        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 font-mono tracking-tight" style={valueStyle}>
          {realValue != null ? formatNumber(realValue) : "—"}
          {node.unit && realValue != null && (
            <span className="text-base font-normal text-zinc-500 ml-2 align-baseline">{node.unit}</span>
          )}
        </div>
      </div>

      {hasError && (
           <div className="mx-4 mt-1 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
             <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
             <div className="flex-1">
               <div className="font-medium mb-1">Erreur de calcul</div>
               <div className="opacity-90">{node.computation_error}</div>
               {onSmartFix && (
                 <button 
                   onClick={onSmartFix}
                   className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                 >
                   <Sparkles className="h-3 w-3" />
                   Réparer avec l'IA
                 </button>
               )}
             </div>
           </div>
      )}
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
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-2">
        <div className="inline-flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${colorClass}`} />
          <span className="font-medium text-[11px] text-zinc-700 dark:text-zinc-200">
            {label}
          </span>
        </div>
        <span className="font-mono text-xs">
          {value == null ? "—" : formatNumber(value)}
          {unit && value !== null && (
            <span className="text-[10px] ml-1 text-zinc-500 dark:text-zinc-400">{unit}</span>
          )}
        </span>
      </div>
    </div>
  );
}

