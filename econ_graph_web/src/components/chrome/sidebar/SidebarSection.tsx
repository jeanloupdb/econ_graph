"use client";

import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { useScenarioStore } from "@/store/scenarioState";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface CollapsibleSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  forceOpen = false,
  action,
  noPadding = false,
}: CollapsibleSectionProps) {
  const { isLightMode } = useGraphTheme();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  
  const mode = comparisonEnabled
    ? "comparison"
    : activeScenarioId
    ? "scenario"
    : "baseline";

  // Auto-expand if forced (e.g. contains selection)
  if (forceOpen && !isOpen) {
    setIsOpen(true);
  }

  return (
    <div className={`border-b last:border-0 ${isLightMode ? 'border-zinc-300' : 'border-white/5'}`}>
      <div className={`flex items-center w-full transition-all duration-200 pr-2 rounded-lg mx-1 ${isLightMode ? 'hover:bg-zinc-200/60' : 'hover:bg-white/5'}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex flex-1 items-center gap-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              isLightMode 
                ? 'text-zinc-900' 
                : mode === 'baseline' ? 'text-zinc-300' : 'text-white/80 hover:text-white'
          }`}
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" />
          )}
          {title}
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="relative">
        {isOpen && (
          <div className="absolute left-[24px] top-0 bottom-2 w-px bg-gradient-to-b from-purple-500/30 via-blue-500/30 to-transparent" />
        )}
        {isOpen && <div className={noPadding ? "pb-2 pl-[26px] animate-in slide-in-from-top-2 duration-200" : "pl-[26px] pb-2 animate-in slide-in-from-top-2 duration-200"}>{children}</div>}
      </div>
    </div>
  );
}

interface NestedListProps {
  items: React.ReactNode[];
  className?: string;
}

export function NestedList({ items, className }: NestedListProps) {
  return (
    <div className={`space-y-0.5 ${className || ''}`}>
      {items}
    </div>
  );
}
