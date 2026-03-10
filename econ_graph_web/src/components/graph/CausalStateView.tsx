
"use client";

import { CalculationsColumn } from "@/components/graph/columns/CalculationsColumn";
import { ParametersColumn } from "@/components/graph/columns/ParametersColumn";
import { ResultsColumn } from "@/components/graph/columns/ResultsColumn";
import { InsightsPanel } from "@/components/graph/InsightsPanel";
import { useCausalGraphLogic } from "@/components/graph/hooks/useCausalGraphLogic";
import { DeleteScenarioModal } from "@/components/graph/modals/DeleteScenarioModal";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiState";
import { Calculator, Settings2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

type MobileTab = "params" | "calcs" | "results";

const MOBILE_TABS = [
  { key: "params"  as MobileTab, label: "Paramètres", Icon: Settings2,  accent: "text-violet-600"  },
  { key: "calcs"   as MobileTab, label: "Calculs",    Icon: Calculator, accent: "text-blue-600"    },
  { key: "results" as MobileTab, label: "Résultats",  Icon: TrendingUp, accent: "text-emerald-600" },
];

export function CausalStateView() {
  const logic = useCausalGraphLogic();
  const { isLightMode } = logic;

  const columnViewMode = useUIStore((s) => s.columnViewMode);
  const setColumnViewMode = useUIStore((s) => s.setColumnViewMode);

  // Init from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("causal_column_mode") as "insights" | "details" | null;
    if (saved && saved !== columnViewMode) setColumnViewMode(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [mobileTab, setMobileTab] = useState<MobileTab>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("causal_mobile_tab") as MobileTab) || "params";
    }
    return "params";
  });
  const [isMobile, setIsMobile] = useState(false);

  const handleSetMobileTab = (tab: MobileTab) => {
    setMobileTab(tab);
    localStorage.setItem("causal_mobile_tab", tab);
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const modal = (
    <DeleteScenarioModal
      isLightMode={isLightMode}
      scenarioToDelete={logic.scenarioToDelete}
      setScenarioToDelete={logic.setScenarioToDelete}
      handleDeleteScenario={logic.handleDeleteScenario}
    />
  );

  // ── Mobile layout ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-[#f0f0f5]">
        <div className="flex-1 overflow-y-auto min-h-0">
          {mobileTab === "params"  && <ParametersColumn  {...logic} compact />}
          {mobileTab === "calcs"   && <CalculationsColumn {...logic} compact />}
          {mobileTab === "results" && <ResultsColumn      {...logic} compact />}
        </div>

        <nav className="shrink-0 flex h-[58px] border-t bg-white border-zinc-200">
          {MOBILE_TABS.map(({ key, label, Icon, accent }) => {
            const isActive = mobileTab === key;
            return (
              <button
                key={key}
                onClick={() => handleSetMobileTab(key)}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? accent : "text-zinc-400"
                )}
              >
                {isActive && (
                  <span className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full",
                    key === "params" ? "bg-violet-500" : key === "calcs" ? "bg-blue-500" : "bg-emerald-500"
                  )} />
                )}
                <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[11px] font-medium tracking-wide leading-none">{label}</span>
              </button>
            );
          })}
        </nav>
        {modal}
      </div>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full items-stretch gap-2 px-4 py-3 bg-[#f0f0f5]">
      {columnViewMode === "insights" ? (
        <>
          <ParametersColumn {...logic} />
          <div className="flex-[2] min-w-0 flex flex-col">
            <InsightsPanel
              onSwitchToDetails={() => setColumnViewMode("details")}
              isLightMode={isLightMode}
            />
          </div>
        </>
      ) : (
        <>
          <ParametersColumn  {...logic} />
          <CalculationsColumn {...logic} />
          <ResultsColumn      {...logic} />
        </>
      )}
      {modal}
    </div>
  );
}
