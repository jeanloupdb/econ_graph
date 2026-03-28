"use client";

import { useGraphData } from "@/graph/context/GraphDataContext";
import { generateDashboard } from "@/lib/api/dashboard";
import type { Node } from "@/lib/types/index";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useScenarios } from "@/lib/api/hooks";
import type { DashboardConfigV2 } from "@/types/dashboard";
import { isDashboardV2 } from "@/types/dashboard";
import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { KpiCard } from "./dashboard/KpiCard";
import { ColumnShell, ColumnHeader } from "@/components/graph/common/ColumnShell";

// ─── Main panel ───────────────────────────────────────────────────────────────
export function InsightsPanel({
  onClose,
  isLightMode,
}: {
  onClose: () => void;
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

  const iconBtn = "shrink-0 p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150";
  const closeBtn = "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 shadow-sm ring-1 ring-inset ring-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-md";

  // ── Loading / skeleton ─────────────────────────────────────────────────────
  if (!localConfig || isRegenerating) {
    return (
      <ColumnShell color="emerald">
        <ColumnHeader layout="between">
          <button onClick={handleRegenerate} className={iconBtn} title="Régénérer">
            {isRegenerating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
          </button>
          <span className="text-lg font-semibold text-foreground">Stats</span>
          <button onClick={onClose} className={closeBtn} title="Fermer">
            <X className="w-4 h-4" />
          </button>
        </ColumnHeader>
        <div className="flex-1 p-3 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </ColumnShell>
    );
  }

  const kpis = localConfig.kpi_widgets ?? [];
  const numCols = kpis.length === 1 ? 1 : 2;

  return (
    <ColumnShell color="emerald">
      <ColumnHeader layout="between">
        <button onClick={handleRegenerate} className={iconBtn} title="Régénérer">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <span className="text-lg font-semibold text-foreground">Stats</span>
        <button onClick={onClose} className={closeBtn} title="Fermer">
          <X className="w-4 h-4" />
        </button>
      </ColumnHeader>

      {/* KPI grid */}
      <div className="flex-1 min-h-0 p-3">
        <div
          className="grid gap-3 h-full"
          style={{
            gridTemplateColumns: `repeat(${numCols}, 1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(kpis.length / numCols)}, minmax(0, 1fr))`,
          }}
        >
          {kpis.map((kpi, idx) => (
            <div
              key={kpi.id}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both min-h-0"
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
        <div className="shrink-0 flex items-start gap-2 px-4 py-2.5 border-t border-border bg-muted/50">
          <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {localConfig.insight}
          </p>
        </div>
      )}
    </ColumnShell>
  );
}