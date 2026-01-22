"use client";

import { useScenarios } from "@/lib/api/hooks";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScenarioItem } from "./ScenarioItem";

export function ScenarioExplorer({
    onSelectScenario,
    onCreateScenario,
}: {
    onSelectScenario: (id: string | null) => void;
    onCreateScenario: (name: string) => Promise<void>;
}) {
  const { isLightMode } = useGraphTheme();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const canEdit = useProjectStore((s) => s.canEdit)();
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const requestInlineScenarioCreation = useScenarioStore((s) => s.requestInlineScenarioCreation);
  const clearInlineScenarioCreationRequest = useScenarioStore((s) => s.clearInlineScenarioCreationRequest);

  // Listen for external requests to start inline creation
  useEffect(() => {
    if (requestInlineScenarioCreation) {
      setIsCreatingNew(true);
      setNewScenarioName("");
      clearInlineScenarioCreationRequest();
    }
  }, [requestInlineScenarioCreation, clearInlineScenarioCreationRequest]);

  // Auto-focus input when starting creation
  useEffect(() => {
    if (isCreatingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingNew]);

  const handleConfirmCreation = async () => {
    if (newScenarioName.trim()) {
      await onCreateScenario(newScenarioName.trim());
      setIsCreatingNew(false);
      setNewScenarioName("");
    }
  };

  const handleCancelCreation = () => {
    setIsCreatingNew(false);
    setNewScenarioName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmCreation();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelCreation();
    }
  };

  return (
    <div className="p-2 space-y-1">
        {!activeScenarioId && (
            <div className={cn(
              "mb-3 px-3 py-2 rounded border text-xs text-center",
              isLightMode 
                ? "bg-blue-50 border-blue-200 text-blue-700" 
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            )}>
                Aucun scénario sélectionné
                <br />
                <span className="opacity-75">Affichage des valeurs de base</span>
            </div>
        )}
        
        {/* Baseline Option */}
        <button
            onClick={() => onSelectScenario(null)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
              !activeScenarioId
                ? isLightMode 
                  ? "bg-white text-zinc-900 font-medium shadow-sm" 
                  : "bg-zinc-800 text-zinc-100 font-medium"
                : isLightMode 
                  ? "text-zinc-800 hover:bg-zinc-300/50" 
                  : "text-zinc-400 hover:bg-white/5"
            )}
        >
            <div className={cn(
              "flex items-center justify-center w-4 h-4 rounded border-2 transition-colors",
              !activeScenarioId
                ? "bg-blue-500 border-blue-500"
                : isLightMode ? "border-zinc-400" : "border-zinc-600"
            )}>
                {!activeScenarioId && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <span className="flex-1 text-left">Baseline</span>
        </button>

        {/* Scenarios List */}
        {(scenarios.length > 0 || isCreatingNew) && (
            <div className="pt-2 space-y-1">
                <div className="px-3 pb-1">
                    <p className={cn(
                      "text-xs font-medium uppercase tracking-wide",
                      isLightMode ? "text-zinc-600" : "text-zinc-400"
                    )}>
                        Scénarios
                    </p>
                </div>
                {[...scenarios]
                  .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                  .map(scenario => (
                    <ScenarioItem
                        key={scenario.id}
                        scenario={scenario}
                        isActive={activeScenarioId === scenario.id}
                        onSelect={() => onSelectScenario(scenario.id)}
                        canEdit={canEdit}
                    />
                ))}

                {/* Inline Creation Input */}
                {isCreatingNew && (
                    <div className={cn(
                      "px-3 py-2 rounded-lg flex items-center gap-2",
                      isLightMode ? "bg-white shadow-sm" : "bg-zinc-800"
                    )}>
                        <div className="flex items-center justify-center w-4 h-4 rounded border-2 border-blue-500 bg-blue-500">
                            <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newScenarioName}
                            onChange={(e) => setNewScenarioName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => {
                                // Delay to allow click on confirm button
                                setTimeout(() => {
                                    if (isCreatingNew && !newScenarioName.trim()) {
                                        handleCancelCreation();
                                    }
                                }, 200);
                            }}
                            placeholder="Nom du scénario"
                            className={cn(
                              "flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 text-sm",
                              isLightMode 
                                ? "text-zinc-900 placeholder:text-zinc-500" 
                                : "text-zinc-100 placeholder:text-zinc-500"
                            )}
                        />
                        <button
                            type="button"
                            onClick={handleCancelCreation}
                            className={cn(
                              "p-1 rounded transition-colors",
                              isLightMode 
                                ? "hover:bg-zinc-200 text-zinc-600" 
                                : "hover:bg-zinc-700 text-zinc-400"
                            )}
                            aria-label="Annuler"
                            title="Annuler (Échap)"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        )}

        {scenarios.length === 0 && !isCreatingNew && (
            <div className={cn(
              "px-4 py-8 text-center text-xs",
              isLightMode ? "text-zinc-600" : "text-zinc-400"
            )}>
                Aucun scénario créé.
            </div>
        )}
    </div>
  );
}
