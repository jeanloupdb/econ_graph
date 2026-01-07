"use client";

import { ChevronLeft } from "lucide-react";

import {
  GRAPH_LIGHT_COLORS,
  useGraphTheme,
} from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
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
  const { isLightMode } = useGraphTheme();
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

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "h-full w-full flex flex-col border-l z-40 transition-all duration-300",
        !isLightMode && "bg-[#0a0a0b] border-white/[0.06]"
      )}
      style={
        isLightMode
          ? {
              backgroundColor: GRAPH_LIGHT_COLORS.panelBg,
              borderColor: GRAPH_LIGHT_COLORS.panelBorder,
            }
          : undefined
      }
    >
      {/* Header with Back to Menu button */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b shrink-0",
          isLightMode
            ? "text-zinc-900 border-zinc-300"
            : "text-zinc-100 border-white/[0.06]"
        )}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className={cn(
              "p-1 -ml-2 rounded-lg transition-colors",
              isLightMode
                ? "hover:bg-zinc-300 text-zinc-700"
                : "hover:bg-white/10 text-zinc-400"
            )}
            title="Retour au menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">Scénarios</span>
        </div>
      </div>

      <ScenarioHeader {...headerProps} onClose={onClose} />

      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 space-y-4",
          isLightMode ? "graph-light-scrollbar" : ""
        )}
      >
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
          scrollbar-color: rgba(82, 82, 91, 0.5) transparent;
        }
        .scenario-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .scenario-scroll::-webkit-scrollbar-track {
          background: transparent;
          margin: 0 8px;
        }
        .scenario-scroll::-webkit-scrollbar-thumb {
          background: rgba(82, 82, 91, 0.5);
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        .scenario-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(82, 82, 91, 0.7);
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
