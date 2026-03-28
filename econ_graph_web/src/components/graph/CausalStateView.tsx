
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
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { Calculator, Settings2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

type MobileTab = "params" | "calcs" | "results";

const MOBILE_TABS = [
  { key: "params"  as MobileTab, label: "Paramètres", Icon: Settings2,  activeColor: "text-violet-600",  indicatorColor: "data-[state=active]:before:bg-violet-500"  },
  { key: "calcs"   as MobileTab, label: "Calculs",    Icon: Calculator, activeColor: "text-blue-600",    indicatorColor: "data-[state=active]:before:bg-blue-500"    },
  { key: "results" as MobileTab, label: "Résultats",  Icon: TrendingUp, activeColor: "text-emerald-600", indicatorColor: "data-[state=active]:before:bg-emerald-500" },
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
          {/* Content area — rendered before TabsList for correct DOM order (content on top, tabs on bottom) */}
          <TabsContent value="params" className="flex-1 overflow-y-auto min-h-0 mt-0 data-[state=inactive]:hidden">
            <ParametersColumn {...logic} compact />
          </TabsContent>
          <TabsContent value="calcs" className="flex-1 overflow-y-auto min-h-0 mt-0 data-[state=inactive]:hidden">
            <CalculationsColumn {...logic} compact />
          </TabsContent>
          <TabsContent value="results" className="flex-1 overflow-y-auto min-h-0 mt-0 data-[state=inactive]:hidden">
            <ResultsColumn {...logic} compact />
          </TabsContent>

          {/* Bottom tab bar */}
          <TabsList className="shrink-0 h-[58px] w-full rounded-none border-t bg-card border-border grid grid-cols-3 gap-0 p-0">
            {MOBILE_TABS.map(({ key, label, Icon, activeColor, indicatorColor }) => (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-full rounded-none",
                  "text-muted-foreground",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  `data-[state=active]:${activeColor}`,
                  // Top accent indicator bar
                  "relative",
                  "before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2",
                  "before:w-8 before:h-[2px] before:rounded-b-full",
                  "before:scale-x-0 data-[state=active]:before:scale-x-100 before:transition-transform before:duration-200",
                  indicatorColor,
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[11px] font-medium tracking-wide leading-none">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
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
