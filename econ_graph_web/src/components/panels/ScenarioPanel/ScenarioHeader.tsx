"use client";

import type { Scenario } from "@/lib/types";
import { MoreVertical, Plus, Settings2, X, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useScenarioStore } from "@/store/scenarioState";

export interface ScenarioHeaderProps {
  isOpen: boolean;
  scenarios: Scenario[];
  activeScenarioId: string | null;
  onSelectScenario: (scenarioId: string | null) => void;
  onClose: () => void;
  onRequestCreateScenario: () => void;
  onRequestRenameScenario: (scenario: Scenario) => void;
  onRequestDuplicateScenario: (scenarioId: string) => void;
  onRequestDeleteScenario: (scenarioId: string) => void;
  onCreateScenario: (name: string) => void;
  canEdit?: boolean;
}

export function ScenarioHeader({
  isOpen,
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onClose,
  onRequestCreateScenario,
  onRequestRenameScenario,
  onRequestDuplicateScenario,
  onRequestDeleteScenario,
  onCreateScenario,
  canEdit = true,
}: ScenarioHeaderProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [menuState, setMenuState] = useState<{
    id: string;
    position: { x: number; y: number };
  } | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");

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

  useEffect(() => {
    if (!isOpen) {
      setMenuState(null);
      setIsCreatingNew(false);
      setNewScenarioName("");
      return;
    }
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuState(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Auto-focus input when starting creation
  useEffect(() => {
    if (isCreatingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingNew]);

  const openMenuFor = (scenarioId: string, rect: DOMRect) => {
    setMenuState((prev) =>
      prev?.id === scenarioId
        ? null
        : {
            id: scenarioId,
            position: { x: rect.right, y: rect.bottom },
          }
    );
  };

  const handleStartCreation = () => {
    setIsCreatingNew(true);
    setNewScenarioName("");
  };

  const handleConfirmCreation = () => {
    if (newScenarioName.trim()) {
      onCreateScenario(newScenarioName.trim());
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

  const menuScenario = menuState
    ? scenarios.find((scenario) => scenario.id === menuState.id) || null
    : null;

  return (
    <div className="p-4 border-b border-zinc-400 dark:border-zinc-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Explorateur de Scénarios
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-zinc-400/50 dark:hover:bg-zinc-800 transition-colors"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-zinc-700 dark:text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="scenario-scroll flex items-center gap-1.5 overflow-x-auto pb-1">
        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-500 dark:border-zinc-700 bg-zinc-400/40 dark:bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => onSelectScenario(null)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              activeScenarioId === null
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-800 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-300/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <span>Baseline</span>
          </button>

          {scenarios.map((scenario) => {
            const isActive = activeScenarioId === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelectScenario(scenario.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-800 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-300/50"
                }`}
              >
                {scenario.color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: scenario.color }}
                  />
                )}
                <span className="max-w-[100px] truncate">{scenario.name}</span>
                {canEdit && (
                  <span
                    className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70"
                    onClick={(event) => {
                      event.stopPropagation();
                      const rect = (
                        event.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      openMenuFor(scenario.id, rect);
                    }}
                    aria-label={`Actions pour ${scenario.name}`}
                    title={`Actions pour ${scenario.name}`}
                  >
                    <MoreVertical className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}

          {isCreatingNew && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
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
                className="w-[120px] bg-transparent border-none outline-none focus:ring-0 p-0 text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              {newScenarioName.trim() && (
                <button
                  type="button"
                  onClick={handleConfirmCreation}
                  className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-green-200/70 dark:hover:bg-green-700/70 text-green-600 dark:text-green-400"
                  aria-label="Confirmer"
                  title="Confirmer (Entrée)"
                >
                  <Check className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={handleCancelCreation}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70"
                aria-label="Annuler"
                title="Annuler (Échap)"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {!isCreatingNew && canEdit && (
            <button
              type="button"
              onClick={handleStartCreation}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-zinc-400/60 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              title="Créer un nouveau scénario"
              aria-label="Créer un nouveau scénario"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {menuState && menuScenario && (
        <div
          ref={menuRef}
          className="fixed z-[80] w-40 rounded border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg"
          style={{
            top: menuState.position.y + 4,
            left: menuState.position.x - 160,
          }}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => {
              onRequestRenameScenario(menuScenario);
              setMenuState(null);
            }}
          >
            Renommer
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => {
              onRequestDuplicateScenario(menuScenario.id);
              setMenuState(null);
            }}
          >
            Dupliquer
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
            onClick={() => {
              onRequestDeleteScenario(menuScenario.id);
              setMenuState(null);
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
