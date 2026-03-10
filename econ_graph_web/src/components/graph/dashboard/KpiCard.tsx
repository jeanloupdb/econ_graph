"use client";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import type { KpiVisualization } from "@/types/dashboard";
import type { Node } from "@/lib/types/index";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

interface Props {
  kpi: KpiVisualization;
  nodeBySlug: Map<string, Node>;
  scenarioValues: Record<string, number | null>;
  isScenarioActive: boolean;
}

const COLOR_MAP = {
  blue:    { stroke: "#3b82f6", text: "text-blue-600",    fill: "rgba(59,130,246,0.08)"   },
  emerald: { stroke: "#10b981", text: "text-emerald-600", fill: "rgba(16,185,129,0.08)"   },
  violet:  { stroke: "#8b5cf6", text: "text-violet-600",  fill: "rgba(139,92,246,0.08)"   },
  amber:   { stroke: "#f59e0b", text: "text-amber-600",   fill: "rgba(245,158,11,0.08)"   },
  rose:    { stroke: "#f43f5e", text: "text-rose-600",    fill: "rgba(244,63,94,0.08)"    },
};
const BREAKDOWN_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e"];

const DELTA_POSITIVE = { stroke: "#10b981", text: "text-emerald-600", bg: "rgba(16,185,129,0.06)", badge: "bg-emerald-50 text-emerald-600 border-emerald-200" };
const DELTA_NEGATIVE = { stroke: "#f43f5e", text: "text-red-500",    bg: "rgba(244,63,94,0.06)",  badge: "bg-red-50 text-red-500 border-red-200" };

export function KpiCard({ kpi, nodeBySlug, scenarioValues, isScenarioActive }: Props) {
  const node = nodeBySlug.get(kpi.node_slug);
  const baseline = node?.value_computed ?? null;
  const scenarioVal = isScenarioActive && node ? (scenarioValues[node.id] ?? baseline) : null;
  const displayed = scenarioVal ?? baseline;
  const diff = scenarioVal !== null && baseline !== null && scenarioVal !== baseline
    ? scenarioVal - baseline : null;
  const diffPct = diff !== null && baseline !== null && baseline !== 0
    ? (diff / Math.abs(baseline)) * 100 : null;

  const colorKey = (kpi.color ?? "blue") as keyof typeof COLOR_MAP;
  const colors = COLOR_MAP[colorKey] ?? COLOR_MAP.blue;
  const unit = kpi.unit ?? node?.unit ?? "";

  // Delta direction
  const deltaDir = diff === null ? null : diff > 0 ? "up" : "down";
  const deltaStyle = deltaDir === "up" ? DELTA_POSITIVE : deltaDir === "down" ? DELTA_NEGATIVE : null;
  // Effective stroke/fill when scenario active
  const activeStroke = (isScenarioActive && deltaStyle) ? deltaStyle.stroke : colors.stroke;
  // Negative base value always renders in red regardless of the configured color
  const negativeOverride = displayed !== null && displayed < 0 ? "text-red-500" : null;

  // Breakdown nodes (donut, pie, bar_breakdown)
  const breakdownNodes = (kpi.breakdown_slugs ?? []).map((slug, i) => {
    const n = nodeBySlug.get(slug);
    const val = isScenarioActive && n ? (scenarioValues[n.id] ?? n?.value_computed ?? 0) : (n?.value_computed ?? 0);
    return { label: kpi.breakdown_labels?.[i] ?? n?.label ?? slug, value: val as number, color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] };
  }).filter(b => b.value !== null && b.value !== undefined);

  // Multi-node data (grouped_bar, horizontal_bar, radar) — color by individual delta
  const multiNodes = (kpi.node_slugs ?? []).map((slug, i) => {
    const n = nodeBySlug.get(slug);
    const baseVal = n?.value_computed ?? 0;
    const val = isScenarioActive && n ? (scenarioValues[n.id] ?? baseVal) : baseVal;
    const nodeDiff = isScenarioActive && n ? ((val as number) - (baseVal as number)) : 0;
    const nodeColor = isScenarioActive
      ? nodeDiff > 0 ? "#10b981" : nodeDiff < 0 ? "#f43f5e" : BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]
      : BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length];
    return { label: kpi.node_labels?.[i] ?? n?.label ?? slug, value: val as number, color: nodeColor };
  }).filter(b => b.value !== null && b.value !== undefined);

  // Top gradient color line based on delta or original color
  const topGradientFrom = deltaStyle ? deltaStyle.stroke : colors.stroke;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border transition-all duration-200 group/card flex flex-col h-full",
      "bg-white border-zinc-200 hover:shadow-sm",
      "shadow-sm"
    )}>
      {/* Top accent gradient line */}
      <div
        className="h-px w-full shrink-0 transition-all duration-500"
        style={{ background: `linear-gradient(to right, ${topGradientFrom}90, ${topGradientFrom}30, transparent)` }}
      />

      {/* Scenario tint overlay */}
      {isScenarioActive && deltaStyle && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500 rounded-xl"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${deltaStyle.bg} 0%, transparent 70%)` }}
        />
      )}

      {/* Header */}
      <div className="relative px-4 pt-3 pb-2 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 truncate">
          {kpi.title}
        </span>
        {diffPct !== null && deltaStyle && (
          <span className={cn(
            "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums",
            "animate-in fade-in-0 slide-in-from-right-1 duration-300",
            deltaStyle.badge
          )}>
            {diff! > 0 ? "↑" : "↓"} {Math.abs(diffPct).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Visualization */}
      <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center px-4 pb-4 gap-2">
        {kpi.viz_type === "donut" && (
          <DonutViz value={displayed} unit={unit} color={activeStroke} textColor={deltaStyle?.text ?? negativeOverride ?? colors.text} breakdown={breakdownNodes} hasDelta={!!deltaStyle} />
        )}
        {kpi.viz_type === "gauge" && (
          <GaugeViz value={displayed} unit={unit} min={kpi.min ?? 0} max={kpi.max ?? 100} color={activeStroke} textColor={deltaStyle?.text ?? negativeOverride ?? colors.text} />
        )}
        {kpi.viz_type === "progress" && (
          <ProgressViz value={displayed} unit={unit} min={kpi.min ?? 0} max={kpi.max ?? 100} color={activeStroke} textColor={deltaStyle?.text ?? negativeOverride ?? colors.text} baseline={isScenarioActive ? baseline : null} />
        )}
        {kpi.viz_type === "bar_breakdown" && (
          <BarBreakdownViz mainValue={displayed} unit={unit} textColor={deltaStyle?.text ?? negativeOverride ?? colors.text} breakdown={breakdownNodes} />
        )}
        {kpi.viz_type === "big_number" && (
          <BigNumberViz value={displayed} unit={unit} textColor={deltaStyle?.text ?? negativeOverride ?? colors.text} color={activeStroke} deltaDir={deltaDir} bgFill={deltaStyle?.bg ?? colors.fill} />
        )}
        {kpi.viz_type === "pie" && (
          <PieViz breakdown={breakdownNodes} unit={unit} hasDelta={!!deltaStyle} deltaColor={activeStroke} />
        )}
        {kpi.viz_type === "grouped_bar" && (
          <GroupedBarViz nodes={multiNodes.length > 0 ? multiNodes : breakdownNodes} unit={unit} />
        )}
        {kpi.viz_type === "horizontal_bar" && (
          <HorizontalBarViz nodes={multiNodes.length > 0 ? multiNodes : breakdownNodes} unit={unit} />
        )}
        {kpi.viz_type === "radar" && (
          <RadarViz nodes={multiNodes.length > 0 ? multiNodes : breakdownNodes} color={activeStroke} />
        )}
      </div>

      {/* Baseline comparison */}
      {isScenarioActive && baseline !== null && diff !== null && (
        <div className="relative px-4 pb-3 shrink-0">
          <p className="text-[10px] text-zinc-400 tabular-nums text-center">
            Base : {formatNumber(baseline)}{unit ? ` ${unit}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────
function DonutViz({ value, unit, color, textColor, breakdown, hasDelta }: {
  value: number | null; unit: string; color: string; textColor: string;
  breakdown: { label: string; value: number; color: string }[];
  hasDelta?: boolean;
}) {
  const R = 36; const CX = 50; const CY = 50;
  const circumference = 2 * Math.PI * R;
  const isPercent = unit.includes("%");
  const pct = isPercent && value !== null ? Math.min(Math.max(value, 0), 100) : null;
  const total = breakdown.length > 0 ? breakdown.reduce((s, b) => s + Math.abs(b.value), 0) : 0;
  const hasBreakdown = breakdown.length >= 2 && total > 0;

  let accumulated = 0;
  const segments = hasBreakdown ? breakdown.map(b => ({ pct: (Math.abs(b.value) / total) * 100, color: b.color, label: b.label, value: b.value })) : [];
  const arcs = (hasBreakdown ? segments : (pct !== null ? [{ pct, color, label: "", value: value! }] : [])).map(seg => {
    const dashLen = (seg.pct / 100) * circumference;
    const offset = -(accumulated / 100) * circumference + circumference * 0.25;
    accumulated += seg.pct;
    return { dashLen, offset, color: seg.color, label: seg.label, value: seg.value };
  });

  const displayVal = isPercent && value !== null ? `${value.toFixed(1)}${unit}` : (value !== null ? formatNumber(value) : "—");

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e4e4e7" strokeWidth={10} />
          {arcs.map((arc, i) => (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={arc.color} strokeWidth={10}
              strokeLinecap="butt" strokeDasharray={`${arc.dashLen} ${circumference - arc.dashLen}`} strokeDashoffset={arc.offset}
              style={{ transition: "stroke-dashoffset 0.7s ease, stroke 0.5s ease" }} />
          ))}
          {/* Delta ring */}
          {hasDelta && <circle cx={CX} cy={CY} r={R + 6} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="4 3" />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-lg font-mono font-bold tabular-nums leading-none transition-colors duration-300", textColor)}>{displayVal}</span>
          {!isPercent && unit && <span className="text-[9px] text-zinc-500 mt-0.5">{unit}</span>}
        </div>
      </div>
      {hasBreakdown && (
        <div className="flex flex-col gap-1 w-full">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="text-[10px] text-zinc-500 truncate">{seg.label}</span>
              </div>
              <span className="text-[10px] font-mono font-bold tabular-nums text-zinc-700 shrink-0">{formatNumber(seg.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Gauge (redesigned) ───────────────────────────────────────────────────────
function GaugeViz({ value, unit, min, max, color, textColor }: {
  value: number | null; unit: string; min: number; max: number; color: string; textColor: string;
}) {
  const pct = value !== null && max > min ? Math.min(Math.max((value - min) / (max - min), 0), 1) : 0;
  const R = 40; const CX = 50; const CY = 54;

  // Track: left (CX-R, CY) → right (CX+R, CY) going through screen-top
  // sweep=0 (CCW in SVG = going upward through top)
  const trackPath = `M ${CX - R} ${CY} A ${R} ${R} 0 1 0 ${CX + R} ${CY}`;

  // Fill endpoint: angle goes from 180° to 360° as pct goes 0→1
  const fillAngleRad = ((180 + pct * 180) * Math.PI) / 180;
  const fillEndX = (CX + R * Math.cos(fillAngleRad)).toFixed(2);
  const fillEndY = (CY + R * Math.sin(fillAngleRad)).toFixed(2);
  const fillPath = pct > 0.001
    ? `M ${CX - R} ${CY} A ${R} ${R} 0 ${pct > 0.5 ? 1 : 0} 0 ${fillEndX} ${fillEndY}`
    : "";

  // Needle tip (slightly shorter than R)
  const needleLen = R - 6;
  const nx = (CX + needleLen * Math.cos(fillAngleRad)).toFixed(2);
  const ny = (CY + needleLen * Math.sin(fillAngleRad)).toFixed(2);

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div className="relative w-48 h-28">
        <svg viewBox="0 0 100 58" className="w-full h-full">
          <path d={trackPath} fill="none" stroke="#e4e4e7" strokeWidth={9} strokeLinecap="round" />
          {fillPath && <path d={fillPath} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" />}
          <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="#3f3f46" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
          <circle cx={CX} cy={CY} r={3.5} fill={color} />
          {/* Min/max labels */}
          <text x="7" y="57" fontSize="6" fill="#52525b" textAnchor="middle">{formatNumber(min)}</text>
          <text x="93" y="57" fontSize="6" fill="#52525b" textAnchor="middle">{formatNumber(max)}</text>
        </svg>
        <div className="absolute bottom-0 inset-x-0 flex flex-col items-center pb-1">
          <span className={cn("text-2xl font-mono font-bold tabular-nums leading-none", textColor)}>
            {value !== null ? formatNumber(value) : "—"}
          </span>
          {unit && <span className="text-[9px] text-zinc-500 mt-0.5">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressViz({ value, unit, min, max, color, textColor, baseline }: {
  value: number | null; unit: string; min: number; max: number; color: string; textColor: string;
  baseline?: number | null;
}) {
  const pct = value !== null && max > min ? Math.min(Math.max((value - min) / (max - min), 0), 1) : 0;
  const baselinePct = baseline !== null && baseline !== undefined && max > min
    ? Math.min(Math.max((baseline - min) / (max - min), 0), 1) : null;

  return (
    <div className="flex flex-col items-center gap-4 w-full px-2">
      <div className="flex flex-col items-center gap-0.5">
        <span className={cn("text-4xl font-mono font-bold tabular-nums leading-none transition-colors duration-300", textColor)}>
          {value !== null ? formatNumber(value) : "—"}
        </span>
        {unit && <span className="text-xs text-zinc-500">{unit}</span>}
      </div>
      <div className="w-full flex flex-col gap-1.5">
        <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-visible relative">
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct * 100}%`, background: color }} />
          {/* Ghost marker at baseline position */}
          {baselinePct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-zinc-500/60 transition-all duration-500"
              style={{ left: `${baselinePct * 100}%` }}
              title={`Base: ${baseline}`}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
          <span>{formatNumber(min)}</span>
          <span className="text-zinc-500">{(pct * 100).toFixed(0)}%</span>
          <span>{formatNumber(max)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Bar breakdown ─────────────────────────────────────────────────────────────
function BarBreakdownViz({ mainValue, unit, textColor, breakdown }: {
  mainValue: number | null; unit: string; textColor: string;
  breakdown: { label: string; value: number; color: string }[];
}) {
  const maxVal = Math.max(...breakdown.map(b => Math.abs(b.value)), 1);
  return (
    <div className="flex flex-col gap-3 w-full">
      {mainValue !== null && (
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className={cn("text-3xl font-mono font-bold tabular-nums", textColor)}>{formatNumber(mainValue)}</span>
          {unit && <span className="text-sm text-zinc-500">{unit}</span>}
        </div>
      )}
      {breakdown.map((item, i) => {
        const pct = Math.max((Math.abs(item.value) / maxVal) * 100, 1.5);
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 truncate">{item.label}</span>
              <span className="text-xs font-mono font-bold tabular-nums text-zinc-700 shrink-0">
                {formatNumber(item.value)}{unit ? ` ${unit}` : ""}
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, background: item.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Grouped bar (recharts) ───────────────────────────────────────────────────
function GroupedBarViz({ nodes, unit }: {
  nodes: { label: string; value: number; color: string }[];
  unit: string;
}) {
  if (nodes.length === 0) return <BigNumberViz value={null} unit={unit} textColor="text-zinc-400" />;
  const data = nodes.map(n => ({ name: n.label.length > 10 ? n.label.slice(0, 9) + "…" : n.label, value: n.value, fullName: n.label }));

  return (
    <div className="w-full" style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 20, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false}
            tickFormatter={(v) => formatNumber(v)} width={38} />
          <Tooltip
            contentStyle={{ background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: 8, fontSize: 11, color: "#3f3f46" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
            formatter={(v: number) => [formatNumber(v) + (unit ? ` ${unit}` : ""), ""]}
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((_, i) => <Cell key={i} fill={nodes[i]?.color ?? BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Horizontal bar (recharts) ────────────────────────────────────────────────
function HorizontalBarViz({ nodes, unit }: {
  nodes: { label: string; value: number; color: string }[];
  unit: string;
}) {
  if (nodes.length === 0) return <BigNumberViz value={null} unit={unit} textColor="text-zinc-400" />;
  const sorted = [...nodes].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const data = sorted.map(n => ({ name: n.label, value: Math.abs(n.value), color: n.color }));
  const chartH = Math.max(80, data.length * 34);

  return (
    <div className="w-full" style={{ height: chartH }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
          <XAxis type="number" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false}
            tickFormatter={(v) => formatNumber(v)} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={80} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
            formatter={(v: number) => [formatNumber(v) + (unit ? ` ${unit}` : ""), ""]}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Radar (recharts) ─────────────────────────────────────────────────────────
function RadarViz({ nodes, color }: {
  nodes: { label: string; value: number; color: string }[];
  color: string;
}) {
  if (nodes.length < 3) return <GroupedBarViz nodes={nodes} unit="" />;
  const maxAbs = Math.max(...nodes.map(n => Math.abs(n.value)), 1);
  const data = nodes.map(n => ({
    subject: n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label,
    value: Math.round((Math.abs(n.value) / maxAbs) * 100),
  }));

  return (
    <div className="w-full" style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="#e4e4e7" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#71717a" }} />
          <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Pie chart ────────────────────────────────────────────────────────────────
function PieViz({ breakdown, unit, hasDelta, deltaColor }: {
  breakdown: { label: string; value: number; color: string }[];
  unit: string;
  hasDelta?: boolean;
  deltaColor?: string;
}) {
  const total = breakdown.reduce((s, b) => s + Math.abs(b.value), 0);
  if (total === 0 || breakdown.length < 2) {
    return <BigNumberViz value={breakdown[0]?.value ?? null} unit={unit} textColor="text-zinc-700" color="#71717a" deltaDir={null} bgFill="transparent" />;
  }

  const CX = 50, CY = 50, R = 38;
  let startAngle = -Math.PI / 2;
  const slices = breakdown.map((b) => {
    const pct = Math.abs(b.value) / total;
    const endAngle = startAngle + pct * 2 * Math.PI;
    const x1 = CX + R * Math.cos(startAngle); const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);   const y2 = CY + R * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    const d = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    startAngle = endAngle;
    return { ...b, d, pct };
  });

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} style={{ transition: "all 0.7s ease" }} />
        ))}
        {/* Delta ring */}
        {hasDelta && deltaColor && (
          <circle cx={CX} cy={CY} r={R + 5} fill="none" stroke={deltaColor} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="4 3" />
        )}
      </svg>
      <div className="flex flex-col gap-1 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[10px] text-zinc-500 truncate">{s.label}</span>
            </div>
            <span className="text-[10px] font-mono font-bold tabular-nums text-zinc-700 shrink-0">
              {(s.pct * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Big number ───────────────────────────────────────────────────────────────
function BigNumberViz({ value, unit, textColor, color, deltaDir, bgFill }: {
  value: number | null; unit: string; textColor: string; color: string;
  deltaDir: "up" | "down" | null; bgFill: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 w-full h-full rounded-lg py-4 px-2 transition-all duration-500"
      style={{ background: `radial-gradient(ellipse at 50% 30%, ${bgFill} 0%, transparent 70%)` }}
    >
      <div className="flex items-end gap-2">
        {deltaDir && (
          <span className={cn(
            "text-2xl font-bold transition-all duration-300 mb-1",
            deltaDir === "up" ? "text-emerald-600" : "text-red-500"
          )}>
            {deltaDir === "up" ? "↑" : "↓"}
          </span>
        )}
        <span className={cn("text-5xl font-mono font-black tabular-nums tracking-tight transition-colors duration-300", textColor)}>
          {value !== null ? formatNumber(value) : "—"}
        </span>
      </div>
      {unit && <span className="text-sm text-zinc-500 font-medium">{unit}</span>}
      {/* Subtle accent line */}
      <div className="w-12 h-0.5 rounded-full mt-1 transition-all duration-500" style={{ background: color, opacity: 0.4 }} />
    </div>
  );
}
