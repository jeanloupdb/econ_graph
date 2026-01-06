"use client";

import { useScenarioStore } from "@/store/scenarioState";
import { ChevronLeft } from "lucide-react";

import {
    DeleteScenarioDialog,
    DuplicateScenarioDialog,
    ModeChangeDialog,
    NewScenarioDialog,
    RenameScenarioDialog,
} from "./ScenarioPanel/ScenarioDialogs";
import { ScenarioHeader } from "./ScenarioPanel/ScenarioHeader";
import { ScenarioParameters } from "./ScenarioPanel/ScenarioParameters";
import { useScenarioPanelLogic } from "./ScenarioPanel/useScenarioPanelLogic";

interface ScenarioPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScenarioPanel({ isOpen, onClose }: ScenarioPanelProps) {
  const {
    panelRef,
    containerStyle,
    startResize,
    headerProps,
    parametersProps,
    renameDialogProps,
    deleteDialogProps,
    duplicateDialogProps,
    newScenarioDialogProps,
    modeDialogProps,
  } = useScenarioPanelLogic(isOpen);

  // Mode determination for styling
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  
  const mode = comparisonEnabled
    ? "comparison"
    : activeScenarioId
    ? "scenario"
    : "baseline";

  const getContainerStyles = () => {
    // Unified baseline style for all modes
    return "bg-white/60 dark:bg-black/40 border-white/20 backdrop-blur-xl shadow-lg";
  };

  const getHeaderStyles = () => {
    // Unified baseline style for all modes
    return "text-zinc-900 dark:text-zinc-100 border-white/10 dark:border-white/5";
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed top-[4.5rem] left-2 bottom-2 flex flex-col rounded-2xl border z-40 transition-all duration-300 ${getContainerStyles()}`}
      style={{ ...containerStyle, width: containerStyle?.width || 400 }}
    >
      <div
        className="absolute left-0 top-4 bottom-4 w-1 cursor-col-resize hover:bg-white/20 dark:hover:bg-white/10 transition-colors rounded-full"
        onMouseDown={startResize}
        aria-label="Redimensionner le panneau scénarios"
        role="separator"
      >
        <div className="absolute inset-y-1/2 -translate-y-1/2 left-0 right-0 flex items-center justify-center">
          <div className="w-1 h-8 bg-zinc-400/50 rounded-full" />
        </div>
      </div>

      {/* Header with Back to Menu button */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${getHeaderStyles()}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className={`p-1 -ml-2 rounded-lg transition-colors ${
                mode === 'baseline' 
                    ? 'hover:bg-white/20 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400' 
                    : 'hover:bg-white/10 text-white/60 hover:text-white'
            }`}
            title="Retour au menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            Scénarios
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* We pass onClose to ScenarioHeader but we might want to hide its close button or keep it as is. 
              The user asked for a back link to menu. 
              ScenarioHeader likely has a close button. Let's check ScenarioHeader later if needed.
              For now, let's just add this header wrapper.
          */}
        </div>
      </div>

      <ScenarioHeader {...headerProps} onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ScenarioParameters {...parametersProps} />
      </div>

      <RenameScenarioDialog {...renameDialogProps} />
      <DeleteScenarioDialog {...deleteDialogProps} />
      <DuplicateScenarioDialog {...duplicateDialogProps} />
      <NewScenarioDialog {...newScenarioDialogProps} />
      <ModeChangeDialog {...modeDialogProps} />

      <style jsx>{`
        .scenario-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.3) transparent;
        }
        .scenario-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .scenario-scroll::-webkit-scrollbar-track {
          background: transparent;
          margin: 0 8px;
        }
        .scenario-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.3);
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        .scenario-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.5);
        }
        :global(.dark) .scenario-scroll {
          scrollbar-color: rgba(71, 85, 105, 0.4) transparent;
        }
        :global(.dark) .scenario-scroll::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.4);
        }
        :global(.dark) .scenario-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.6);
        }
      `}</style>
    </div>
  );
}
