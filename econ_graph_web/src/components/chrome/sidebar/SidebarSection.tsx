"use client";

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
    <div className="border-b border-white/5 last:border-0">
      <div className="flex items-center w-full hover:bg-white/5 transition-colors pr-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex flex-1 items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
              mode === 'baseline' ? 'text-zinc-600 dark:text-zinc-300' : 'text-white/70 hover:text-white'
          }`}
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {title}
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="relative">
        {isOpen && (
          <div className="absolute left-[21px] top-0 bottom-2 w-px bg-zinc-200 dark:bg-white/10" />
        )}
        {isOpen && <div className={noPadding ? "pb-2 pl-[22px]" : "pl-[22px] pb-2"}>{children}</div>}
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
