"use client";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import type { ParameterGroup, ParameterControl } from "@/types/dashboard";
import type { Node } from "@/lib/types/index";
import { Minus, Plus } from "lucide-react";
import { useCallback, useRef } from "react";
import { DashboardCard } from "./DashboardCard";

interface Props {
  group: ParameterGroup;
  nodeBySlug: Map<string, Node>;
  onValueChange: (nodeSlug: string, value: number) => void;
}

export function ParameterGroupCard({ group, nodeBySlug, onValueChange }: Props) {
  return (
    <DashboardCard className="flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {group.title}
        </span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-4">
        {group.controls.map((ctrl) => {
          const node = nodeBySlug.get(ctrl.node_slug);
          const value = node?.value_computed ?? node?.value ?? 0;
          return (
            <ControlRow
              key={ctrl.node_slug}
              control={ctrl}
              value={value as number}
              onChange={(v) => onValueChange(ctrl.node_slug, v)}
            />
          );
        })}
      </div>
    </DashboardCard>
  );
}

function ControlRow({
  control,
  value,
  onChange,
}: {
  control: ParameterControl;
  value: number;
  onChange: (v: number) => void;
}) {
  const unit = control.unit ?? "";

  switch (control.control_type) {
    case "slider":
      return <SliderControl control={control} value={value} unit={unit} onChange={onChange} />;
    case "toggle":
      return <ToggleControl control={control} value={value} onChange={onChange} />;
    case "stepper":
      return <StepperControl control={control} value={value} unit={unit} onChange={onChange} />;
    default:
      return <TextControl control={control} value={value} unit={unit} onChange={onChange} />;
  }
}

// ── Slider ────────────────────────────────────────────────────────────────────
function SliderControl({
  control,
  value,
  unit,
  onChange,
}: {
  control: ParameterControl;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const min = control.min ?? 0;
  const max = control.max ?? 100;
  const step = control.step ?? 1;
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 truncate pr-2">{control.label}</span>
        <span className="text-xs font-mono font-bold text-zinc-800 shrink-0 tabular-nums">
          {formatNumber(value)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div className="relative h-4 flex items-center">
        <div className="absolute inset-x-0 h-1 bg-zinc-200 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-4"
        />
        {/* Custom thumb */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md shadow-black/50 ring-2 ring-blue-500 pointer-events-none transition-all duration-100"
          style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 7px)` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
        <span>{formatNumber(min)}</span>
        <span>{formatNumber(max)}</span>
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function ToggleControl({
  control,
  value,
  onChange,
}: {
  control: ParameterControl;
  value: number;
  onChange: (v: number) => void;
}) {
  const valueOff = control.value_off ?? 0;
  const valueOn = control.value_on ?? 1;
  const isOn = value === valueOn || (value !== valueOff && value > 0);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-400 truncate">{control.label}</span>
      <button
        onClick={() => onChange(isOn ? valueOff : valueOn)}
        className={cn(
          "relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200",
          isOn ? "bg-blue-600" : "bg-zinc-200"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            isOn ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function StepperControl({
  control,
  value,
  unit,
  onChange,
}: {
  control: ParameterControl;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const step = control.step ?? 1;
  const min = control.min ?? -Infinity;
  const max = control.max ?? Infinity;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-500 truncate">{control.label}</span>
      <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded-lg px-1.5 py-1">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-700 rounded transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-xs font-mono font-bold text-zinc-800 w-14 text-center tabular-nums">
          {formatNumber(value)}{unit ? ` ${unit}` : ""}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-700 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Text ──────────────────────────────────────────────────────────────────────
function TextControl({
  control,
  value,
  unit,
  onChange,
}: {
  control: ParameterControl;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const commit = useCallback(() => {
    const v = parseFloat(ref.current?.value ?? "");
    if (!isNaN(v)) onChange(v);
    else if (ref.current) ref.current.value = String(value);
  }, [value, onChange]);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-500 truncate">{control.label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          ref={ref}
          defaultValue={value}
          key={value}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-24 h-7 text-xs font-mono font-bold text-right text-zinc-900 bg-white border border-zinc-300 rounded px-2 outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
        />
        {unit && <span className="text-xs text-zinc-400 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}
