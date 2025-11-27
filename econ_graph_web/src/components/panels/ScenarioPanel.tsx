"use client";

import { ScenarioHeader } from "./ScenarioPanel/ScenarioHeader";
import { ScenarioParameters } from "./ScenarioPanel/ScenarioParameters";
import {
  DeleteScenarioDialog,
  DuplicateScenarioDialog,
  ModeChangeDialog,
  NewScenarioDialog,
  RenameScenarioDialog,
} from "./ScenarioPanel/ScenarioDialogs";
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

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 relative"
      style={containerStyle}
    >
      <div
        className="absolute left-0 top-0 h-full w-2 z-20 cursor-col-resize bg-zinc-200/70 dark:bg-zinc-600/50 hover:bg-zinc-300/80 dark:hover:bg-zinc-500/70 transition-colors"
        onMouseDown={startResize}
        aria-label="Redimensionner le panneau scénarios"
        role="separator"
      >
        <div className="absolute inset-y-1/2 -translate-y-1/2 left-0 right-0 flex items-center justify-center">
          <div className="w-px h-8 bg-zinc-500 dark:bg-zinc-200 rounded-full opacity-80" />
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
