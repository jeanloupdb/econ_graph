
"use client";

import { ImportSummaryBanner, type ImportSummaryPayload } from "@/components/graph/ImportSummaryBanner";
import { CalculationsColumn } from "@/components/graph/columns/CalculationsColumn";
import { ParametersColumn } from "@/components/graph/columns/ParametersColumn";
import { ResultsColumn } from "@/components/graph/columns/ResultsColumn";
import { InsightsPanel } from "@/components/graph/InsightsPanel";
import { useCausalGraphLogic } from "@/components/graph/hooks/useCausalGraphLogic";
import { DeleteScenarioModal } from "@/components/graph/modals/DeleteScenarioModal";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { LAST_EXCEL_IMPORT_KEY } from "@/hooks/useExcelImport";
import { useImportScenarios } from "@/hooks/useImportScenarios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { GitCompare, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type MobileTab = "params" | "calcs" | "results";

const MOBILE_TABS = [
  { key: "params"  as MobileTab, label: "Paramètres" },
  { key: "calcs"   as MobileTab, label: "Calculs"    },
  { key: "results" as MobileTab, label: "Résultats"  },
];

export function CausalStateView() {
  const logic = useCausalGraphLogic();
  const { isLightMode } = logic;
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  const columnViewMode = useUIStore((s) => s.columnViewMode);
  const setColumnViewMode = useUIStore((s) => s.setColumnViewMode);

  const [mobileTab, setMobileTab] = useState<MobileTab>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("causal_mobile_tab") as MobileTab) || "params";
    }
    return "params";
  });
  const [isMobile, setIsMobile] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummaryPayload | null>(null);
  const { suggest: suggestScenarios } = useImportScenarios();

  // Init column view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("causal_column_mode") as "insights" | "details" | null;
    if (saved && saved !== columnViewMode) setColumnViewMode(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !currentProjectId) return;
    try {
      const raw = window.sessionStorage.getItem(LAST_EXCEL_IMPORT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ImportSummaryPayload;
      if (parsed.project_id !== currentProjectId) return;
      setImportSummary(parsed);
      window.sessionStorage.removeItem(LAST_EXCEL_IMPORT_KEY);
    } catch {
      window.sessionStorage.removeItem(LAST_EXCEL_IMPORT_KEY);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (!importSummary?.project_id) return;
    suggestScenarios(importSummary.project_id);
  }, [importSummary?.project_id, suggestScenarios]);

  const handleSetMobileTab = (tab: MobileTab) => {
    setMobileTab(tab);
    localStorage.setItem("causal_mobile_tab", tab);
  };

  const modal = (
    <DeleteScenarioModal
      isLightMode={isLightMode}
      scenarioToDelete={logic.scenarioToDelete}
      setScenarioToDelete={logic.setScenarioToDelete}
      handleDeleteScenario={logic.handleDeleteScenario}
    />
  );

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex h-full flex-col bg-background">
        {importSummary && (
          <div className="p-3 pb-0">
            <ImportSummaryBanner
              payload={importSummary}
              onDismiss={() => setImportSummary(null)}
            />
          </div>
        )}

        <Tabs
          value={mobileTab}
          onValueChange={(v) => handleSetMobileTab(v as MobileTab)}
          className="flex flex-col h-full bg-background"
        >
          {/* ── Top header: onglets + scénarios ────────────────────────────── */}
          <MobileHeader logic={logic} mobileTab={mobileTab} />

          {/* Content area */}
          <TabsContent value="params" className="flex-1 overflow-y-auto min-h-0 !mt-0 data-[state=inactive]:hidden">
            <ParametersColumn {...logic} compact />
          </TabsContent>
          <TabsContent value="calcs" className="flex-1 overflow-y-auto min-h-0 !mt-0 data-[state=inactive]:hidden">
            <CalculationsColumn {...logic} compact />
          </TabsContent>
          <TabsContent value="results" className="flex-1 overflow-y-auto min-h-0 !mt-0 data-[state=inactive]:hidden">
            <ResultsColumn {...logic} compact />
          </TabsContent>

          {modal}
        </Tabs>
      </div>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col bg-background px-3 pb-3 pt-0">
      {importSummary && (
        <div className="pb-3 pt-3">
          <ImportSummaryBanner
            payload={importSummary}
            onDismiss={() => setImportSummary(null)}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Insights mode — always mounted to preserve InsightsPanel state */}
        <div className={cn("flex-1 min-w-0 flex h-full", columnViewMode !== "insights" && "hidden")}>
          <ResizablePanelGroup direction="horizontal" className="gap-0" autoSaveId="sg-columns-insights">
            <ResizablePanel defaultSize={35} minSize={22}>
              <ParametersColumn {...logic} />
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-2" />
            <ResizablePanel defaultSize={65} minSize={20}>
              <InsightsPanel
                onClose={() => setColumnViewMode("details")}
                isLightMode={isLightMode}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Details mode — always mounted to preserve column state */}
        <div className={cn("flex-1 min-w-0 flex h-full", columnViewMode !== "details" && "hidden")}>
          <ResizablePanelGroup direction="horizontal" className="gap-0" autoSaveId="sg-columns-details">
            <ResizablePanel defaultSize={33} minSize={22}>
              <ParametersColumn {...logic} />
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-2" />
            <ResizablePanel defaultSize={34} minSize={15}>
              <CalculationsColumn {...logic} />
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-2" />
            <ResizablePanel defaultSize={33} minSize={15}>
              <ResultsColumn {...logic} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        {modal}
      </div>
    </div>
  );
}

// ── Header mobile (onglets + scénarios) ───────────────────────────────────────
function MobileHeader({
  logic,
  mobileTab,
}: {
  logic: ReturnType<typeof useCausalGraphLogic>;
  mobileTab: MobileTab;
}) {
  // Compter les nœuds modifiés par colonne quand un scénario est actif
  const changedCounts = useMemo(() => {
    if (!logic.activeScenarioId) return { params: 0, calcs: 0, results: 0 };
    const count = (nodes: typeof logic.settings) =>
      nodes.filter(n => {
        const { diff } = logic.getNodeValues(n.id);
        return diff !== null && diff !== 0;
      }).length;
    return {
      params:   count(logic.settings),
      calcs:    count(logic.intermediates),
      results:  count(logic.results),
    };
  }, [logic]);

  const TABS_META: { key: MobileTab; label: string; count: number }[] = [
    { key: "params",  label: "Paramètres", count: changedCounts.params  },
    { key: "calcs",   label: "Calculs",    count: changedCounts.calcs   },
    { key: "results", label: "Résultats",  count: changedCounts.results },
  ];

  return (
    <div className="shrink-0 border-b border-border bg-background">
      {/* Tab bar — pleine largeur, sans fond ni ombre */}
      <TabsList className="flex w-full h-10 rounded-none !bg-transparent !p-0 gap-0">
        {TABS_META.map(({ key, label, count }) => (
          <TabsTrigger
            key={key}
            value={key}
            className={cn(
              "flex-1 h-full rounded-none !bg-transparent !shadow-none gap-1.5",
              "text-[13px] font-medium text-muted-foreground",
              "data-[state=active]:!bg-transparent data-[state=active]:!shadow-none data-[state=active]:text-violet-600",
              "relative after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-violet-600",
              "after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200",
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                "text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-full transition-colors",
                mobileTab === key
                  ? "bg-violet-100 text-violet-700"
                  : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Scenario bar — toujours visible */}
      <MobileScenarioBar logic={logic} />
    </div>
  );
}

// ── Barre scénarios mobile ─────────────────────────────────────────────────────
function MobileScenarioBar({ logic }: { logic: ReturnType<typeof useCausalGraphLogic> }) {
  const {
    activeScenarioId,
    scenarios,
    creatingScenario,
    setCreatingScenario,
    newScenarioName,
    setNewScenarioName,
    handleCreateScenario,
    handleScenarioChange,
    setScenarioToDelete,
    comparisonEnabled,
    setComparisonMode,
    scenariosContainerRef,
  } = logic;

  // Refs individuels pour chaque pill (null key = Base)
  const pillRefs = useRef<Map<string | null, HTMLElement>>(new Map());

  // Scroll-to-center quand le scénario actif change
  useEffect(() => {
    const container = scenariosContainerRef.current;
    if (!container) return;
    const el = pillRefs.current.get(activeScenarioId);
    if (!el) return;
    const left = el.offsetLeft - (container.offsetWidth - el.offsetWidth) / 2;
    container.scrollTo({ left, behavior: 'smooth' });
  }, [activeScenarioId, scenariosContainerRef]);

  if (creatingScenario) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Input
          value={newScenarioName}
          onChange={(e) => setNewScenarioName(e.target.value)}
          placeholder="Nom du scénario..."
          className="h-7 text-xs flex-1 min-w-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateScenario();
            if (e.key === 'Escape') setCreatingScenario(false);
          }}
          autoFocus
        />
        <button
          onClick={handleCreateScenario}
          className="px-2.5 py-1 rounded text-xs font-medium shrink-0 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Créer
        </button>
        <button
          onClick={() => setCreatingScenario(false)}
          className="p-1 rounded transition-colors shrink-0 text-muted-foreground hover:bg-accent"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={scenariosContainerRef}
      className="flex gap-1.5 items-center overflow-x-auto pt-1.5 pb-1.5"
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="shrink-0 w-3" aria-hidden />

      {/* Base */}
      <button
        ref={(el) => { if (el) pillRefs.current.set(null, el); else pillRefs.current.delete(null); }}
        onClick={() => handleScenarioChange(null)}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
          !activeScenarioId
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-accent"
        )}
      >
        Base
      </button>

      {/* Scénarios existants — ordre stable, pas de sort */}
      {scenarios.map(s => (
        <div
          key={s.id}
          ref={(el) => { if (el) pillRefs.current.set(s.id, el); else pillRefs.current.delete(s.id); }}
          className={cn(
            "flex items-center gap-0.5 rounded-full transition-colors shrink-0 group/scenario",
            activeScenarioId === s.id ? "bg-blue-500" : "bg-muted hover:bg-accent"
          )}
        >
          <button
            onClick={() => handleScenarioChange(s.id)}
            className={cn(
              "pl-2.5 pr-1 py-1 text-xs font-medium shrink-0",
              activeScenarioId === s.id ? "text-white" : "text-muted-foreground"
            )}
          >
            {s.name}
          </button>
          <button
            onClick={() => setScenarioToDelete({ id: s.id, name: s.name })}
            className={cn(
              "pr-1.5 py-1 opacity-0 group-hover/scenario:opacity-100 transition-opacity",
              activeScenarioId === s.id ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {/* Ajouter */}
      <button
        onClick={() => setCreatingScenario(true)}
        className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1 border border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
      >
        <Plus className="h-3 w-3" />
        Scénario
      </button>

      {/* Comparaison */}
      <button
        onClick={() => setComparisonMode(!comparisonEnabled)}
        className={cn(
          "p-1.5 rounded-full transition-colors shrink-0",
          comparisonEnabled ? "bg-blue-100 text-blue-600" : "text-muted-foreground hover:bg-accent"
        )}
        title="Comparer les scénarios"
      >
        <GitCompare className="h-3.5 w-3.5" />
      </button>

      <div className="shrink-0 w-3" aria-hidden />
    </div>
  );
}
