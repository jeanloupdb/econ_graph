"use client";

import { useGraphData } from "@/graph/context/GraphDataContext";
import { generateDashboard } from "@/lib/api/dashboard";
import type { Node } from "@/lib/types/index";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useScenarios } from "@/lib/api/hooks";
import type { DashboardConfigV2 } from "@/types/dashboard";
import { isDashboardV2 } from "@/types/dashboard";
import { Columns3, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { KpiCard } from "./dashboard/KpiCard";

// ─── Main panel ───────────────────────────────────────────────────────────────
export function InsightsPanel({
  onSwitchToDetails,
  isLightMode,
}: {
  onSwitchToDetails: () => void;
  isLightMode?: boolean;
}) {
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const { nodes = [] } = useGraphData();
  const { data: scenarios = [] } = useScenarios(currentProjectId);

  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const scenarioComputedValues = useScenarioStore((s) => s.scenarioComputedValues);
  const scenarioValuesScenarioId = useScenarioStore((s) => s.scenarioValuesScenarioId);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenConfig, setRegenConfig] = useState<DashboardConfigV2 | null>(null);

  const nodeBySlug = useMemo(() => {
    const map = new Map<string, Node>();
    for (const n of nodes) { if (n.slug) map.set(n.slug, n); }
    return map;
  }, [nodes]);

  const scenarioValues = useMemo(() => {
    if (!activeScenarioId || scenarioValuesScenarioId !== activeScenarioId) return {};
    const result: Record<string, number | null> = {};
    for (const [nodeId, val] of Object.entries(scenarioComputedValues)) {
      result[nodeId] = val.scenario_value ?? val.real_value ?? null;
    }
    return result;
  }, [activeScenarioId, scenarioComputedValues, scenarioValuesScenarioId]);

  const isScenarioActive = activeScenarioId !== null && scenarioValuesScenarioId === activeScenarioId;
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  // Dashboard config
  const rawConfig = currentProject?.dashboard_config;
  const storeConfig: DashboardConfigV2 | null =
    rawConfig && isDashboardV2(rawConfig as any) ? (rawConfig as unknown as DashboardConfigV2) : null;
  const localConfig = regenConfig ?? storeConfig;

  // Auto-generate if no V2 config exists yet
  const autoGenRef = useRef(false);
  useEffect(() => {
    if (!currentProjectId || storeConfig || isRegenerating || autoGenRef.current) return;
    const project = useProjectStore.getState().projects.find(p => p.id === currentProjectId);
    if (!project || project.status !== 'completed') return;
    autoGenRef.current = true;
    setIsRegenerating(true);
    generateDashboard(currentProjectId)
      .then(result => {
        if (isDashboardV2(result)) {
          setRegenConfig(result as DashboardConfigV2);
          useProjectStore.setState(state => ({
            projects: state.projects.map(p =>
              p.id === currentProjectId ? { ...p, dashboard_config: result as any } : p
            ),
          }));
        }
      })
      .catch(() => {})
      .finally(() => setIsRegenerating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, storeConfig]);

  const handleRegenerate = async () => {
    if (!currentProjectId) return;
    setIsRegenerating(true);
    try {
      const result = await generateDashboard(currentProjectId);
      if (isDashboardV2(result)) {
        setRegenConfig(result as DashboardConfigV2);
        useProjectStore.setState((state) => ({
          projects: state.projects.map((p) =>
            p.id === currentProjectId ? { ...p, dashboard_config: result as any } : p
          ),
        }));
      }
    } catch {
      toast.error("Échec de la régénération");
    } finally {
      setIsRegenerating(false);
    }
  };

  const headerBorder = isLightMode ? "border-zinc-200" : "border-zinc-800/60";
  const containerCls = cn(
    "h-full min-w-0 flex flex-col overflow-hidden",
    isLightMode ? "bg-white border-l border-zinc-200 shadow-sm" : "bg-transparent"
  );

  const actionBtn = cn(
    "shrink-0 p-1.5 rounded-lg border transition-colors duration-150",
    isLightMode
      ? "border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
      : "border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-700"
  );

  // ── Loading / skeleton ─────────────────────────────────────────────────────
  if (!localConfig || isRegenerating) {
    return (
      <div className={containerCls}>
        <div className={cn(
          "shrink-0 flex items-center gap-2 px-4 py-2.5 border-b",
          headerBorder,
          isLightMode ? "bg-white" : ""
        )}>
          {isRegenerating
            ? <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
            : <Sparkles className="w-3.5 h-3.5 text-zinc-600 animate-pulse" />
          }
          <span className="text-xs text-zinc-500 flex-1">
            {isRegenerating ? "Régénération…" : "Analyse du modèle en cours…"}
          </span>
          <button onClick={onSwitchToDetails} className={actionBtn} title="Vue 3 colonnes">
            <Columns3 className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Shimmer skeleton */}
        <div className="flex-1 p-3 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn(
              "rounded-xl min-h-[180px] overflow-hidden relative",
              isLightMode ? "bg-zinc-200 animate-pulse" : "bg-zinc-900/60 border border-zinc-800/50"
            )}>
              {!isLightMode && <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const kpis = localConfig.kpi_widgets ?? [];
  const numCols = kpis.length === 1 ? 1 : 2;

  return (
    <div className={containerCls}>
      {/* Header — read-only scenario badge + actions */}
      <div className={cn(
        "shrink-0 flex items-center gap-2 px-4 py-2.5 border-b",
        headerBorder,
        isLightMode ? "bg-white" : ""
      )}>
        {/* Scenario indicator (read-only) */}
        <div className="flex-1 min-w-0">
          {isScenarioActive && activeScenario ? (
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border animate-in fade-in duration-300",
              isLightMode
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isLightMode ? "bg-blue-500" : "bg-blue-400")} />
              {activeScenario.name}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-600 font-medium">Valeurs de base</span>
          )}
        </div>

        <button
          onClick={handleRegenerate}
          className={actionBtn}
          title="Régénérer le tableau de bord"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onSwitchToDetails}
          className={cn(actionBtn, "flex items-center gap-1.5 px-2.5 !py-1 text-xs font-medium")}
          title="Vue 3 colonnes"
        >
          <Columns3 className="w-3.5 h-3.5" />
          <span>3 colonnes</span>
        </button>
      </div>

      {/* KPI grid */}
      <div
        className="flex-1 min-h-0 p-3 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${numCols}, 1fr)`,
            gridAutoRows: "minmax(190px, auto)",
          }}
        >
          {kpis.map((kpi, idx) => (
            <div
              key={kpi.id}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both"
              style={{
                animationDelay: `${idx * 60}ms`,
                gridColumn: kpis.length % 2 !== 0 && idx === kpis.length - 1 ? "1 / -1" : undefined,
              }}
            >
              <KpiCard
                kpi={kpi}
                nodeBySlug={nodeBySlug}
                scenarioValues={scenarioValues}
                isScenarioActive={isScenarioActive}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Insight footer */}
      {localConfig.insight && (
        <div className={cn(
          "shrink-0 flex items-start gap-2 px-4 py-2.5 border-t backdrop-blur-sm",
          headerBorder,
          isLightMode ? "bg-zinc-50/80" : "bg-zinc-900/40"
        )}>
          <Sparkles className={cn("w-3 h-3 shrink-0 mt-0.5", isLightMode ? "text-zinc-400" : "text-zinc-500")} />
          <p className={cn("text-[10px] leading-relaxed", isLightMode ? "text-zinc-600" : "text-zinc-500")}>
            {localConfig.insight}
          </p>
        </div>
      )}
    </div>
  );
}