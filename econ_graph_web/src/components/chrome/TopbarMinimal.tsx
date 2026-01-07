"use client";

import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { useComputeWithScenario, useScenarios } from "@/lib/api/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronLeft, Code2, Eye, BarChart3 } from "lucide-react";
import Link from "next/link";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
import { useEffect, useRef, useState } from "react";
import { UserMenu } from "./UserMenu";
import { useGraphTheme, GRAPH_LIGHT_COLORS } from "@/lib/context/GraphThemeContext";

export function TopbarMinimal() {
  const { isLightMode } = useGraphTheme();
  const setIsComputing = useUIStore((s) => s.setIsComputing);
  const scenarioAutoStatusRef = useRef<Record<string, "idle" | "pending">>({});
  const scenarioAutoRetryTimeoutRef = useRef<Record<string, number | null>>({});
  const [scenarioAutoTick, setScenarioAutoTick] = useState(0);

  const computeWithScenario = useComputeWithScenario();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const scenarioValuesScenarioId = useScenarioStore((s) => s.scenarioValuesScenarioId);
  const setScenarioComputedValues = useScenarioStore((s) => s.setScenarioComputedValues);
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);

  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const currentScenario = scenarios.find((s) => s.id === activeScenarioId);

  const mode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const developerMode = useUIStore((s) => s.developerMode);
  const setDeveloperMode = useUIStore((s) => s.setDeveloperMode);
  const canEdit = useProjectStore((s) => s.canEdit)();
  const currentRole = useProjectStore((s) => s.getCurrentRole)();

  // Sync viewMode when activeScenarioId changes
  useEffect(() => {
    if (activeScenarioId && mode !== "scenario" && mode !== "comparison") {
      setViewMode("scenario");
    }
  }, [activeScenarioId, mode, setViewMode]);

  // Auto-compute logic for scenarios
  useEffect(() => {
    const clearAllRetryTimeouts = () => {
      Object.values(scenarioAutoRetryTimeoutRef.current).forEach((timeoutId) => {
        if (timeoutId) clearTimeout(timeoutId);
      });
      scenarioAutoRetryTimeoutRef.current = {};
    };

    if (!activeScenarioId || !currentProjectId || comparisonEnabled || computeWithScenario.isPending) {
      scenarioAutoStatusRef.current = {};
      clearAllRetryTimeouts();
      return;
    }

    if (scenarioValuesScenarioId === activeScenarioId) {
      scenarioAutoStatusRef.current[activeScenarioId] = "idle";
      const timeoutId = scenarioAutoRetryTimeoutRef.current[activeScenarioId];
      if (timeoutId) {
        clearTimeout(timeoutId);
        scenarioAutoRetryTimeoutRef.current[activeScenarioId] = null;
      }
      return;
    }

    const status = scenarioAutoStatusRef.current[activeScenarioId] ?? "idle";
    if (status === "pending") return;

    const scenarioIdForRun = activeScenarioId;
    scenarioAutoStatusRef.current[scenarioIdForRun] = "pending";
    let cancelled = false;

    const runPreload = async () => {
      try {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: scenarioIdForRun,
        });
        if (cancelled) return;
        setScenarioComputedValues(scenarioIdForRun, result.results);
        scenarioAutoStatusRef.current[scenarioIdForRun] = "idle";
        const timeoutId = scenarioAutoRetryTimeoutRef.current[scenarioIdForRun];
        if (timeoutId) {
          clearTimeout(timeoutId);
          scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = null;
        }
      } catch (error) {
        if (cancelled) return;
        console.error("❌ Failed to preload scenario values:", error);
        scenarioAutoStatusRef.current[scenarioIdForRun] = "idle";
        if (!scenarioAutoRetryTimeoutRef.current[scenarioIdForRun]) {
          scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = window.setTimeout(() => {
            scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = null;
            setScenarioAutoTick((tick) => tick + 1);
          }, 5000);
        }
      }
    };

    void runPreload();

    return () => {
      cancelled = true;
      if (scenarioAutoStatusRef.current[scenarioIdForRun] === "pending") {
        scenarioAutoStatusRef.current[scenarioIdForRun] = "idle";
      }
    };
  }, [
    activeScenarioId,
    currentProjectId,
    comparisonEnabled,
    scenarioValuesScenarioId,
    computeWithScenario,
    setScenarioComputedValues,
    scenarioAutoTick,
  ]);

  return (
    <div
      className={cn(
        "h-16 flex items-center justify-between px-6 border-b shrink-0 relative z-30",
        isLightMode 
          ? "bg-zinc-300 border-zinc-500" 
          : "bg-[#0a0a0b] border-white/[0.06]"
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Back Button with Logo - hidden for public users */}
        {currentRole !== 'public' ? (
          <Link
            href="/dashboard"
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors",
              isLightMode 
                ? "text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
            )}
            title="Retour au tableau de bord"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            <SmartGraphLogo size={28} />
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <SmartGraphLogo size={28} />
          </div>
        )}

        {/* Project Title */}
        <h1 className={cn(
          "text-base font-medium flex items-center gap-3 min-w-0",
          isLightMode ? "text-zinc-900" : "text-zinc-100"
        )}>
          <span className="truncate max-w-[240px]">
            {currentProject?.name || "Projet"}
          </span>

          {/* Scenario indicator when in scenario mode */}
          {mode === "scenario" && activeScenarioId && (
            <>
              <span className={isLightMode ? "text-zinc-600" : "text-zinc-500"}>/</span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                    isLightMode ? "text-blue-600 text-sm font-medium" : "text-blue-500 text-sm font-medium",
                    isLightMode 
                      ? "hover:bg-zinc-200" 
                      : "hover:bg-white/[0.04]",
                    "transition-colors"
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="truncate max-w-[140px]">
                    {currentScenario?.name || "Scénario"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {scenarios.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={async () => {
                        setActiveScenario(s.id);
                        try {
                          setIsComputing(true);
                          const result = await computeWithScenario.mutateAsync({
                            projectId: currentProjectId || undefined,
                            scenarioId: s.id,
                          });
                          setScenarioComputedValues(s.id, result.results);
                        } catch (error) {
                          console.error("Failed to compute scenario:", error);
                        } finally {
                          setIsComputing(false);
                        }
                      }}
                      className={s.id === activeScenarioId ? "bg-blue-500/10" : ""}
                    >
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                  {scenarios.length === 0 && (
                    <div className="px-3 py-2 text-sm text-zinc-500">
                      Aucun scénario
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* View/Edit Toggle - only show if user can edit */}
        {canEdit ? (
          <div className={cn(
            "flex items-center h-9 p-1 rounded-lg",
            isLightMode ? "bg-zinc-200" : "bg-white/[0.04]"
          )}>
            <button
              onClick={() => setDeveloperMode(false)}
              className={cn(
                "flex items-center gap-2 h-full px-3 rounded-md text-sm font-medium transition-all",
                !developerMode
                  ? isLightMode
                    ? "bg-zinc-300 text-zinc-900 shadow-sm"
                    : "bg-white/[0.08] text-zinc-100 shadow-sm"
                  : isLightMode
                    ? "text-zinc-600 hover:text-zinc-800"
                    : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Eye className="h-4 w-4" />
              <span>Vue</span>
            </button>
            <button
              onClick={() => setDeveloperMode(true)}
              className={cn(
                "flex items-center gap-2 h-full px-3 rounded-md text-sm font-medium transition-all",
                developerMode
                  ? isLightMode
                    ? "bg-zinc-300 text-zinc-900 shadow-sm"
                    : "bg-white/[0.08] text-zinc-100 shadow-sm"
                  : isLightMode
                    ? "text-zinc-600 hover:text-zinc-800"
                    : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Code2 className="h-4 w-4" />
              <span>Éditer</span>
            </button>
          </div>
        ) : (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            isLightMode ? "bg-zinc-200" : "bg-white/[0.04]"
          )}>
            <Eye className={cn("h-4 w-4", isLightMode ? "text-zinc-600" : "text-zinc-400")} />
            <span className={cn("text-sm font-medium", isLightMode ? "text-zinc-600" : "text-zinc-400")}>
              Mode Vue
            </span>
          </div>
        )}

        {/* User Menu */}
        <UserMenu />
      </div>
    </div>
  );
}
