"use client";

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

interface ScenarioSelectorProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  scenarios: any[];
  colorClass: string; // e.g. "bg-blue-400"
  indicatorColor: string; // hex color for the dot
}

export function ScenarioSelector({
  label,
  value,
  onChange,
  scenarios,
  colorClass,
  indicatorColor,
}: ScenarioSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedScenario = scenarios.find((s) => s.id === value);
  const isBaseline = value === "baseline" || !value;

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-[10px] font-bold text-orange-300/50 uppercase tracking-wider">
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
            colorClass
          )}
          style={{
            boxShadow: `0 0 8px ${indicatorColor}80`, // 50% opacity
            backgroundColor: indicatorColor,
          }}
        />
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-slate-900/50 border-white/10 text-slate-200 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all"
          >
            <div className="flex items-center gap-2 truncate">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isBaseline
                    ? "#94a3b8"
                    : selectedScenario?.color || "#3b82f6",
                }}
              />
              <span className="truncate">
                {isBaseline
                  ? "Baseline"
                  : selectedScenario?.name || "Sélectionner..."}
              </span>
            </div>
            <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 bg-slate-950 border-slate-800">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
            <button
              onClick={() => {
                onChange("baseline");
                setOpen(false);
              }}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-white/10 hover:text-white transition-colors",
                isBaseline ? "bg-white/10 text-white" : "text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span>Baseline</span>
              </div>
              {isBaseline && (
                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>

            {scenarios.length > 0 && (
              <div className="my-1 h-px bg-white/10" />
            )}

            {scenarios.map((scenario) => {
              const isSelected = value === scenario.id;
              return (
                <button
                  key={scenario.id}
                  onClick={() => {
                    onChange(scenario.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-white/10 hover:text-white transition-colors",
                    isSelected ? "bg-white/10 text-white" : "text-slate-400"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: scenario.color || "#3b82f6",
                      }}
                    />
                    <span className="truncate">{scenario.name}</span>
                  </div>
                  {isSelected && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </button>
              );
            })}
            
            {scenarios.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-600 italic">
                    Aucun autre scénario disponible
                </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
