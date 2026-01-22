"use client";

import { cn } from "@/lib/utils";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { BarChart3, Columns, GitCompare, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MODE_CONFIG = {
  baseline: {
    icon: Home,
    label: "Base",
    shortLabel: "Base",
    color: "bg-zinc-900 dark:bg-zinc-100",
    textColor: "text-white dark:text-zinc-900",
    description: "Valeurs par défaut du modèle",
  },
  scenario: {
    icon: BarChart3,
    label: "Scénario",
    shortLabel: "Scén.",
    color: "bg-blue-600 dark:bg-blue-500",
    textColor: "text-white",
    description: "Explorer différentes hypothèses",
  },
  comparison: {
    icon: GitCompare,
    label: "Comparaison",
    shortLabel: "Comp.",
    color: "bg-amber-500 dark:bg-amber-400",
    textColor: "text-white dark:text-zinc-900",
    description: "Comparer deux scénarios",
  },
  columns: {
    icon: Columns,
    label: "Colonnes",
    shortLabel: "Cols",
    color: "bg-emerald-500 dark:bg-emerald-400",
    textColor: "text-white dark:text-zinc-900",
    description: "Vue tabulaire en colonnes",
  },
};

export function ModeIndicator() {
  const mode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const leftSidebarCollapsed = useUIStore((s) => s.leftSidebarCollapsed);
  const setComparisonMode = useScenarioStore((s) => s.setComparisonMode);
  const resetToBaseline = useScenarioStore((s) => s.resetToBaseline);
  const nodeEditorMode = useUIStore((s) => s.nodeEditorMode);

  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentConfig = MODE_CONFIG[mode];
  const Icon = currentConfig.icon;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModeChange = (newMode: "baseline" | "scenario" | "comparison" | "columns") => {
    if (nodeEditorMode) return;
    
    setViewMode(newMode);
    if (newMode === "comparison") {
      setComparisonMode(true);
    } else {
      setComparisonMode(false);
      if (newMode === "baseline") {
        resetToBaseline();
      }
    }
    setIsOpen(false);
  };

  // Only show when sidebar is collapsed
  if (!leftSidebarCollapsed) return null;

  return (
    <div
      ref={menuRef}
      className="absolute top-4 left-4 z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Current Mode Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!!nodeEditorMode}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg transition-all duration-200",
          "border border-white/20 backdrop-blur-sm",
          currentConfig.color,
          currentConfig.textColor,
          nodeEditorMode && "opacity-50 cursor-not-allowed",
          !nodeEditorMode && "hover:scale-105 active:scale-95"
        )}
      >
        <Icon className="h-4 w-4" />
        <span className={cn(
          "text-sm font-semibold transition-all duration-200",
          isHovered ? "max-w-32" : "max-w-16",
          "overflow-hidden whitespace-nowrap"
        )}>
          {isHovered ? currentConfig.label : currentConfig.shortLabel}
        </span>
      </button>

      {/* Mode Selector Dropdown */}
      {isOpen && !nodeEditorMode && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-150">
          {(Object.entries(MODE_CONFIG) as [keyof typeof MODE_CONFIG, typeof MODE_CONFIG.baseline][]).map(
            ([modeKey, config]) => {
              const ModeIcon = config.icon;
              const isActive = mode === modeKey;

              return (
                <button
                  key={modeKey}
                  onClick={() => handleModeChange(modeKey)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg",
                      config.color,
                      config.textColor
                    )}
                  >
                    <ModeIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      "text-sm font-medium",
                      isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"
                    )}>
                      {config.label}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-500">
                      {config.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </button>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}


