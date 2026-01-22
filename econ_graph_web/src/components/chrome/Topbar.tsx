"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useComputeWithScenario, useScenarios } from "@/lib/api/hooks";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { ChevronDown, ChevronLeft, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
import { UserMenu } from "./UserMenu";

export function Topbar() {
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
  const scenarioValuesScenarioId = useScenarioStore(
    (s) => s.scenarioValuesScenarioId
  );
  const setScenarioComputedValues = useScenarioStore(
    (s) => s.setScenarioComputedValues
  );
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);

  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const currentScenario = scenarios.find((s) => s.id === activeScenarioId);
  const { isLightMode, toggleGraphTheme } = useGraphTheme();

  // Determine current mode
  const mode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  // Sync viewMode when activeScenarioId changes (optional, but good UX)
  useEffect(() => {
    if (activeScenarioId && mode !== "scenario" && mode !== "comparison") {
      setViewMode("scenario");
    }
  }, [activeScenarioId, mode, setViewMode]);

  // ... (Keep existing useEffects for auto-compute logic) ...
  useEffect(() => {
    const clearAllRetryTimeouts = () => {
      Object.values(scenarioAutoRetryTimeoutRef.current).forEach(
        (timeoutId) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      );
      scenarioAutoRetryTimeoutRef.current = {};
    };

    if (
      !activeScenarioId ||
      !currentProjectId ||
      comparisonEnabled ||
      computeWithScenario.isPending
    ) {
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
    if (status === "pending") {
      return;
    }

    const scenarioIdForRun = activeScenarioId;
    scenarioAutoStatusRef.current[scenarioIdForRun] = "pending";
    let cancelled = false;

    const runPreload = async () => {
      try {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: scenarioIdForRun,
        });
        if (cancelled) {
          return;
        }
        setScenarioComputedValues(scenarioIdForRun, result.results);
        scenarioAutoStatusRef.current[scenarioIdForRun] = "idle";
        const timeoutId = scenarioAutoRetryTimeoutRef.current[scenarioIdForRun];
        if (timeoutId) {
          clearTimeout(timeoutId);
          scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] = null;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("❌ Failed to preload scenario values:", error);
        scenarioAutoStatusRef.current[scenarioIdForRun] = "idle";
        if (!scenarioAutoRetryTimeoutRef.current[scenarioIdForRun]) {
          scenarioAutoRetryTimeoutRef.current[scenarioIdForRun] =
            window.setTimeout(() => {
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
    <div className="shrink-0">
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          {/* Back Button with Logo */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            title="Retour au tableau de bord"
          >
            <ChevronLeft className="h-5 w-5 text-zinc-500 transition-transform group-hover:-translate-x-0.5" />
            <SmartGraphLogo size={28} />
          </Link>

          {/* Project Title */}
          <h1 className="text-lg font-semibold leading-tight flex items-center gap-2 min-w-0 text-zinc-900 dark:text-zinc-100">
            <span className="truncate shrink">
              {currentProject?.name || "SmartGraph"}
            </span>
            {mode === "scenario" && (
              <span className="text-zinc-600 dark:text-zinc-400 font-normal shrink-0 flex items-center gap-2 whitespace-nowrap">
                <span className="text-zinc-300 dark:text-zinc-700">/</span>
                <DropdownMenu>
                  <DropdownMenuTrigger className="hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded px-2 py-1 transition-colors outline-none flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {currentScenario
                      ? currentScenario.name
                      : "Sélectionner un scénario"}
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {scenarios.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={async () => {
                          setActiveScenario(s.id);
                          try {
                            setIsComputing(true);
                            const result =
                              await computeWithScenario.mutateAsync({
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
                        className={
                          s.id === activeScenarioId
                            ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                            : ""
                        }
                      >
                        {s.name}
                      </DropdownMenuItem>
                    ))}
                    {scenarios.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-zinc-500">
                        Aucun scénario
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleGraphTheme}
            className={`h-9 w-9 flex items-center justify-center rounded-md border transition-colors ${
              isLightMode
                ? "border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            }`}
            title={isLightMode ? "Passer en mode sombre" : "Passer en mode clair"}
          >
            {isLightMode ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          <UserMenu />
        </div>
      </div>
    </div>
  );
}
