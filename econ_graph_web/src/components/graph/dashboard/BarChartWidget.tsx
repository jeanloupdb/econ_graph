import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import type { BarChartWidget as BarChartWidgetType } from "@/types/dashboard";
import type { Node } from "@/lib/types/index";
import { DashboardCard } from "./DashboardCard";

interface Props {
  widget: BarChartWidgetType;
  nodeBySlug: Map<string, Node>;
  scenarioValues: Record<string, number | null>;
  isScenarioActive: boolean;
}

function getNodeColors(node: Node | undefined): { bar: string; text: string } {
  if (!node) return { bar: "bg-zinc-600", text: "text-zinc-400" };
  if (node.type === "parameter") return { bar: "bg-blue-500", text: "text-blue-400" };
  if (node.type === "calculation") return { bar: "bg-violet-500", text: "text-violet-400" };
  return { bar: "bg-emerald-500", text: "text-emerald-400" };
}

export function BarChartWidget({ widget, nodeBySlug, scenarioValues, isScenarioActive }: Props) {
  const rows = widget.node_slugs.map((slug, i) => {
    const node = nodeBySlug.get(slug);
    const baseline = node?.value_computed ?? null;
    const scenario = isScenarioActive && node ? (scenarioValues[node.id] ?? baseline) : null;
    const value = (isScenarioActive ? scenario : baseline) ?? baseline ?? 0;
    const { bar, text } = getNodeColors(node);
    return {
      node,
      label: widget.labels?.[i] ?? node?.label ?? slug,
      value,
      unit: node?.unit ?? "",
      bar,
      text,
    };
  });

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.value)), 1);

  return (
    <DashboardCard className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 shrink-0">
        <span className="text-sm font-semibold text-zinc-200">
          {widget.title}
        </span>
      </div>

      {/* Bars — fills remaining space, evenly distributed */}
      <div className="px-5 py-4 flex flex-col flex-1 justify-around gap-3">
        {rows.map((row, i) => {
          const pct = Math.max((Math.abs(row.value) / maxAbs) * 100, 1.5);
          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-zinc-300 truncate">{row.label}</span>
                <span className={cn("text-sm font-mono font-bold tabular-nums shrink-0", row.text)}>
                  {formatNumber(row.value)}{row.unit ? ` ${row.unit}` : ""}
                </span>
              </div>
              <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 ease-out", row.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
