"use client";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import type { ComparisonWidget as ComparisonWidgetType } from "@/types/dashboard";
import type { Node } from "@/lib/types/index";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface ScenarioItem {
  id: string;
  name: string;
}

interface Props {
  widget: ComparisonWidgetType;
  nodeBySlug: Map<string, Node>;
  scenarioValues: Record<string, number | null>;
  isScenarioActive: boolean;
  activeScenario: ScenarioItem | null;
}

export function ComparisonWidget({ widget, nodeBySlug, scenarioValues, isScenarioActive, activeScenario }: Props) {
  const node = nodeBySlug.get(widget.node_slug);
  const baseline = node?.value_computed ?? null;
  const scenarioVal = isScenarioActive && node ? (scenarioValues[node.id] ?? baseline) : null;
  const diff = scenarioVal !== null && baseline !== null && scenarioVal !== baseline
    ? scenarioVal - baseline
    : null;
  const diffPct = diff !== null && baseline !== null && baseline !== 0
    ? (diff / Math.abs(baseline)) * 100
    : null;

  const diffAccent = diff === null ? undefined : diff >= 0 ? "border-l-emerald-500" : "border-l-rose-500";

  const rows = [
    { label: "Base", value: baseline, bar: "bg-zinc-600", text: "text-zinc-400" },
    ...(isScenarioActive && activeScenario && scenarioVal !== null
      ? [{
          label: activeScenario.name,
          value: scenarioVal,
          bar: diff !== null && diff >= 0 ? "bg-emerald-500" : "bg-rose-500",
          text: diff !== null && diff >= 0 ? "text-emerald-400" : "text-rose-400",
        }]
      : []),
  ];
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.value ?? 0)), 1);

  return (
    <DashboardCard accent={diffAccent} className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
        <span className="text-sm font-semibold text-zinc-200 truncate">{widget.title}</span>
        {diffPct !== null && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded shrink-0",
            diff! >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          )}>
            {diff! >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {diff! >= 0 ? "+" : ""}{diffPct.toFixed(1)}%
          </div>
        )}
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Values comparison */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Base</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold tabular-nums text-zinc-300">
                {baseline !== null ? formatNumber(baseline) : "—"}
              </span>
              {node?.unit && <span className="text-xs text-zinc-500">{node.unit}</span>}
            </div>
          </div>

          {isScenarioActive && (
            <>
              <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0 mt-4" />
              <div className="flex flex-col items-end text-right">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1 truncate max-w-[120px]">
                  {activeScenario?.name}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn(
                    "text-3xl font-mono font-bold tabular-nums",
                    diff && diff > 0 ? "text-emerald-400" : diff && diff < 0 ? "text-rose-400" : "text-white"
                  )}>
                    {scenarioVal !== null ? formatNumber(scenarioVal) : "—"}
                  </span>
                  {node?.unit && <span className="text-xs text-zinc-500">{node.unit}</span>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bars or inactive hint */}
        {isScenarioActive ? (
          <div className="space-y-2.5">
            {rows.map((row, i) => {
              const pct = Math.max((Math.abs(row.value ?? 0) / maxAbs) * 100, 1.5);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-medium text-zinc-500 w-[56px] shrink-0 text-right truncate">
                    {row.label}
                  </span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700 ease-out", row.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn("text-[11px] font-mono font-bold w-[48px] shrink-0 tabular-nums text-right", row.text)}>
                    {row.value !== null ? formatNumber(row.value) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Sélectionnez un scénario pour voir l'impact
          </p>
        )}
      </div>
    </DashboardCard>
  );
}
