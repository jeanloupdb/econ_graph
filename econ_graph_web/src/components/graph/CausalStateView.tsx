
"use client";

import { CalculationsColumn } from "@/components/graph/columns/CalculationsColumn";
import { ParametersColumn } from "@/components/graph/columns/ParametersColumn";
import { ResultsColumn } from "@/components/graph/columns/ResultsColumn";
import { useCausalGraphLogic } from "@/components/graph/hooks/useCausalGraphLogic";
import { DeleteScenarioModal } from "@/components/graph/modals/DeleteScenarioModal";
import { cn } from "@/lib/utils";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CausalStateView() {
  const logic = useCausalGraphLogic();
  const { isLightMode } = logic;

  return (
    <div className={cn(
      "flex h-full w-full items-stretch gap-2 px-4 py-3",
      isLightMode ? "bg-zinc-100" : "bg-zinc-950"
    )}>
      {/* ================================================================== */}
      {/* GAUCHE — PARAMÈTRES (1/3) */}
      {/* ================================================================== */}
      <ParametersColumn {...logic} />

      {/* ================================================================== */}
      {/* CENTRE — CALCULS / DÉTAIL (1/3) */}
      {/* ================================================================== */}
      <CalculationsColumn {...logic} />

      {/* ================================================================== */}
      {/* DROITE — RÉSULTATS (1/3) */}
      {/* ================================================================== */}
      <ResultsColumn {...logic} />
      
      <DeleteScenarioModal 
        isLightMode={isLightMode}
        scenarioToDelete={logic.scenarioToDelete}
        setScenarioToDelete={logic.setScenarioToDelete}
        handleDeleteScenario={logic.handleDeleteScenario}
      />
    </div>
  );
}
