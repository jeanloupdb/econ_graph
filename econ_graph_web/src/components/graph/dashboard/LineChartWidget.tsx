"use client";

import type { LineChartWidget as LineChartWidgetType } from "@/types/dashboard";
import type { Node } from "@/lib/types/index";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DashboardCard } from "./DashboardCard";

interface Scenario {
  id: string;
  name: string;
}

interface Props {
  widget: LineChartWidgetType;
  nodeBySlug: Map<string, Node>;
  scenarioValues: Record<string, number | null>;
  scenarios: Scenario[];
  isScenarioActive: boolean;
  activeScenarioId: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs shadow-2xl">
      <p className="text-zinc-500 font-bold uppercase tracking-tighter mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="text-zinc-400 font-medium">{p.name}:</span>
          <span style={{ color: p.color }} className="font-bold tabular-nums">
            {p.value?.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
          </span>
        </div>
      ))}
    </div>
  );
};

export function LineChartWidget({ widget, nodeBySlug, scenarioValues, scenarios, isScenarioActive, activeScenarioId }: Props) {
  const node = nodeBySlug.get(widget.node_slug);
  const baseline = node?.value_computed ?? null;
  const scenarioVal = isScenarioActive && node ? (scenarioValues[node.id] ?? baseline) : null;
  const activeScenario = scenarios.find(s => s.id === activeScenarioId);

  // Build chart data
  const data = [
    { name: "Baseline", baseline: baseline ?? 0, scenario: baseline ?? 0 },
    ...(isScenarioActive && activeScenario
      ? [{ name: activeScenario.name, baseline: baseline ?? 0, scenario: scenarioVal ?? baseline ?? 0 }]
      : []),
  ];

  return (
    <DashboardCard className="flex flex-col min-h-[200px]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{widget.title}</p>
          {node?.label && (
            <p className="text-[10px] text-zinc-600 mt-0.5">{node.label}{node.unit ? ` (${node.unit})` : ""}</p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[150px] -ml-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#52525b", fontSize: 10, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fill: "#52525b", fontSize: 10, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#27272a', strokeWidth: 1 }} />
            {data.length > 1 && (
              <Legend 
                verticalAlign="top" 
                align="right"
                wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', paddingBottom: '20px' }} 
              />
            )}
            <Line
              type="monotone"
              dataKey="baseline"
              name="Baseline"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ fill: "#6366f1", r: 4, strokeWidth: 2, stroke: '#0e0e11' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            {isScenarioActive && activeScenario && (
              <Line
                type="monotone"
                dataKey="scenario"
                name={activeScenario.name}
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={{ fill: "#10b981", r: 4, strokeWidth: 2, stroke: '#0e0e11' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
}
