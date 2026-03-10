"use client";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import type { KpiWidget as KpiWidgetType } from "@/types/dashboard";
import type { Node } from "@/lib/types/index";
import { Circle, Triangle, TrendingUp, TrendingDown } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface Props {
  widget: KpiWidgetType;
  nodeBySlug: Map<string, Node>;
  scenarioValues: Record<string, number | null>;
  isScenarioActive: boolean;
}

function getNodeStyle(node: Node | undefined) {
  if (!node) return {
    icon: <Circle className="w-3 h-3" />,
    color: "text-zinc-500",
    bar: "bg-zinc-600",
    accent: undefined as string | undefined,
  };
  if (node.type === "parameter") return {
    icon: <Circle className="w-3 h-3 fill-current" />,
    color: "text-blue-400",
    bar: "bg-blue-500",
    accent: "border-l-blue-500",
  };
  if (node.type === "calculation") return {
    icon: <Triangle className="w-3 h-3 fill-current rotate-90" />,
    color: "text-violet-400",
    bar: "bg-violet-500",
    accent: "border-l-violet-500",
  };
  return {
    icon: <Circle className="w-3 h-3 fill-current" />,
    color: "text-emerald-400",
    bar: "bg-emerald-500",
    accent: "border-l-emerald-500",
  };
}

export function KpiWidget({ widget, nodeBySlug, scenarioValues, isScenarioActive }: Props) {
  const node = nodeBySlug.get(widget.node_slug);
  const baseline = node?.value_computed ?? null;
  const scenarioVal = isScenarioActive && node ? (scenarioValues[node.id] ?? baseline) : null;
  const displayed = scenarioVal ?? baseline;
  const diff = scenarioVal !== null && baseline !== null && scenarioVal !== baseline
    ? scenarioVal - baseline
    : null;
  const diffPct = diff !== null && baseline !== null && baseline !== 0
    ? (diff / Math.abs(baseline)) * 100
    : null;

  const isPercent = !!node?.unit && (node.unit.includes("%") || node.unit.toLowerCase() === "pct");
  const fillPct = isPercent && displayed !== null
    ? Math.min(Math.max(displayed, 0), 100)
    : null;

  const { icon, color, bar, accent } = getNodeStyle(node);

  const valueColor = diff === null
    ? (displayed !== null && displayed < 0 ? "text-rose-400" : "text-white")
    : diff > 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <DashboardCard accent={accent} className="flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("shrink-0", color)}>{icon}</span>
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 truncate">
            {widget.title}
          </span>
        </div>
        {diffPct !== null && (
          <span className={cn(
            "shrink-0 flex items-center gap-0.5 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded",
            diff! > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          )}>
            {diff! > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {diff! > 0 ? "+" : ""}{diffPct.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Value body */}
      <div className="px-5 py-4">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-3xl font-mono font-bold tabular-nums tracking-tight",
            valueColor
          )}>
            {displayed !== null ? formatNumber(displayed) : "—"}
          </span>
          {node?.unit && (
            <span className="text-sm text-zinc-500">{node.unit}</span>
          )}
        </div>

        {isScenarioActive && baseline !== null && diff !== null && (
          <p className="text-[10px] text-zinc-500 tabular-nums mt-1.5">
            Base : {formatNumber(baseline)}{node?.unit ? ` ${node.unit}` : ""}
          </p>
        )}

        {fillPct !== null && (
          <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", bar)}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
