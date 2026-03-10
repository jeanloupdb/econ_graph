"use client";

import { useGraphData } from "@/graph/context/GraphDataContext";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import {
  useScenarios,
  useComputeWithScenario,
  useCreateScenario,
  useDeleteScenario,
} from "@/lib/api/hooks";
import { generateDashboard } from "@/lib/api/dashboard";
import type { Node } from "@/lib/types/index";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import type { DashboardConfig, DashboardConfigV2 } from "@/types/dashboard";
import { isDashboardV2 } from "@/types/dashboard";
import { LayoutDashboard, Loader2, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ParameterGroupCard } from "./dashboard/ParameterGroupCard";
import { KpiCard } from "./dashboard/KpiCard";

// ─── Scenario pills ───────────────────────────────────────────────────────────
function ScenarioPills({
  scenarios,
  activeScenarioId,
  computingId,
  onSelect,
  onCreate,
  onDelete,
  onRegenerate,
}: {
  scenarios: { id: string; name: string }[];
  activeScenarioId: string | null;
  computingId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);

  const handleCreate = () => {
    const t = name.trim();
    if (!t) return;
    onCreate(t);
    setName("");
    setCreating(false);
  };

  return (
    <div className="shrink-0 flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
          !activeScenarioId ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
        )}
      >
        Valeurs de base
      </button>

      {scenarios.map((s) => (
        <div key={s.id} className={cn(
          "flex items-center rounded-full transition-colors shrink-0 group/s",
          activeScenarioId === s.id ? "bg-blue-600" : "bg-zinc-100 hover:bg-zinc-200"
        )}>
          <button
            onClick={() => onSelect(s.id)}
            className={cn("pl-2.5 pr-1 py-1 text-xs font-medium shrink-0 flex items-center gap-1.5",
              activeScenarioId === s.id ? "text-white" : "text-zinc-600")}
          >
            {computingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : s.name}
          </button>
          <button
            onClick={() => onDelete(s.id)}
            className="pr-1.5 py-1 opacity-0 group-hover/s:opacity-100 transition-opacity text-white/70 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {creating ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef} value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setName(""); } }}
            placeholder="Nom du scénario…"
            className="h-7 text-xs w-36 rounded px-2.5 bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button onClick={handleCreate} className="px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white">Créer</button>
          <button onClick={() => { setCreating(false); setName(""); }} className="p-1 rounded hover:bg-zinc-100 text-zinc-500"><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="px-2.5 py-1 rounded-full text-xs font-medium border border-zinc-200 text-zinc-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors"
        >
          <Plus className="h-3 w-3" />Ajouter Scénario
        </button>
      )}

      <button
        onClick={onRegenerate}
        className="ml-auto p-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200 transition-colors"
        title="Régénérer le dashboard"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function DashboardView() {
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const { nodes = [] } = useGraphData();
  const graphActions = useGraphActions();
  const { data: scenarios = [] } = useScenarios(currentProjectId);

  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const scenarioComputedValues = useScenarioStore((s) => s.scenarioComputedValues);
  const scenarioValuesScenarioId = useScenarioStore((s) => s.scenarioValuesScenarioId);
  const setScenarioComputedValues = useScenarioStore((s) => s.setScenarioComputedValues);
  const computeWithScenario = useComputeWithScenario();
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();

  const [computingId, setComputingId] = useState<string | null>(null);

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
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null;

  const handleSelectScenario = async (id: string | null) => {
    setActiveScenario(id);
    if (!id || !currentProjectId) return;
    setComputingId(id);
    try {
      const result = await computeWithScenario.mutateAsync({ projectId: currentProjectId, scenarioId: id });
      setScenarioComputedValues(id, result.results);
    } catch { toast.error("Erreur lors du calcul du scénario"); }
    finally { setComputingId(null); }
  };

  const handleCreateScenario = async (name: string) => {
    if (!currentProjectId) return;
    try { await createScenario.mutateAsync({ projectId: currentProjectId, data: { name } }); }
    catch { toast.error("Impossible de créer le scénario"); }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    if (!currentProjectId) return;
    if (activeScenarioId === scenarioId) setActiveScenario(null);
    try { await deleteScenario.mutateAsync({ scenarioId, projectId: currentProjectId }); }
    catch { toast.error("Impossible de supprimer le scénario"); }
  };

  // Debounced parameter edit
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleParamChange = useCallback((slug: string, value: number) => {
    const node = nodeBySlug.get(slug);
    if (!node) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await graphActions.updateNode(node.id, { value });
        graphActions.computeProject?.();
      } catch { toast.error("Impossible de modifier le paramètre"); }
    }, 400);
  }, [nodeBySlug, graphActions]);

  // Dashboard config
  const dashboardConfig = currentProject?.dashboard_config as DashboardConfig | null | undefined;
  const [genState, setGenState] = useState<"idle" | "generating" | "ready" | "error">(
    dashboardConfig ? "ready" : "idle"
  );
  const [localConfig, setLocalConfig] = useState<DashboardConfig | null>(dashboardConfig ?? null);
  const config = localConfig ?? dashboardConfig ?? null;

  useEffect(() => {
    if (dashboardConfig && !localConfig && genState === "idle") {
      setLocalConfig(dashboardConfig);
      setGenState("ready");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardConfig]);

  const handleGenerate = async () => {
    if (!currentProjectId) return;
    setGenState("generating");
    try {
      const result = await generateDashboard(currentProjectId);
      setLocalConfig(result);
      useProjectStore.setState((state) => ({
        projects: state.projects.map((p) =>
          p.id === currentProjectId ? { ...p, dashboard_config: result as any } : p
        ),
      }));
      setGenState("ready");
    } catch {
      toast.error("Échec de la génération du dashboard");
      setGenState(localConfig ? "ready" : "error");
    }
  };

  // ── Empty states ──────────────────────────────────────────────────────────
  if (genState === "generating") {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f5f7]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          <p className="text-xs text-zinc-500">Génération du dashboard…</p>
        </div>
      </div>
    );
  }

  if (!config || genState === "error") {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f5f7]">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center px-6">
          <LayoutDashboard className="w-7 h-7 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-zinc-700 mb-1.5">Tableau de bord IA</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              L'IA analyse votre modèle et génère un tableau de bord interactif avec des contrôles visuels pour chaque paramètre.
            </p>
          </div>
          <button onClick={handleGenerate} className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors">
            Générer le tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // V1 fallback — show regenerate prompt
  if (!isDashboardV2(config)) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f5f7]">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center px-6">
          <LayoutDashboard className="w-7 h-7 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-zinc-700 mb-1.5">Nouveau tableau de bord disponible</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              La nouvelle version du tableau de bord offre des contrôles interactifs et des visualisations enrichies.
            </p>
          </div>
          <button onClick={handleGenerate} className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors">
            Régénérer
          </button>
        </div>
      </div>
    );
  }

  const v2 = config as DashboardConfigV2;

  return (
    <div className="h-full flex flex-col gap-5 p-5 overflow-hidden bg-[#f5f5f7]">

      {/* Scenario pills */}
      <ScenarioPills
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        computingId={computingId}
        onSelect={handleSelectScenario}
        onCreate={handleCreateScenario}
        onDelete={handleDeleteScenario}
        onRegenerate={handleGenerate}
      />

      {/* Two-column layout */}
      <div className="flex-1 min-h-0 flex gap-5">

        {/* ── LEFT: parameter groups ────────────────────────────────── */}
        <div className="w-[38%] shrink-0 flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {v2.parameter_groups.map((group) => (
            <ParameterGroupCard
              key={group.id}
              group={group}
              nodeBySlug={nodeBySlug}
              onValueChange={handleParamChange}
            />
          ))}

          {/* Insight pill */}
          {v2.insight && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-white border border-zinc-200 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-600 leading-relaxed">{v2.insight}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: KPI visualizations ─────────────────────────────── */}
        <div className={cn(
          "flex-1 min-h-0 min-w-0 grid gap-5",
          v2.kpi_widgets.length === 1 ? "grid-rows-1" : "grid-rows-2"
        )}>
          {v2.kpi_widgets.map((kpi) => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              nodeBySlug={nodeBySlug}
              scenarioValues={scenarioValues}
              isScenarioActive={isScenarioActive}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
