"use client";

import { useCommandHistoryStore } from "@/store/commandHistory";
import { cn } from "@/lib/utils";
import { Undo2, Redo2, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UndoRedoButtonsProps {
  isLightMode?: boolean;
}

/**
 * Undo/Redo buttons component for the graph toolbar
 * Displays the current undo/redo state and allows users to
 * navigate through their action history.
 */
export function UndoRedoButtons({ isLightMode = false }: UndoRedoButtonsProps) {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    isProcessing,
    lastUndoDescription,
    lastRedoDescription,
  } = useCommandHistoryStore();

  const handleUndo = async () => {
    console.log('[UNDO/REDO BUTTON] Undo button clicked. State:', {
      canUndo,
      isProcessing,
      lastUndoDescription,
    });
    
    if (!canUndo || isProcessing) {
      console.warn('[UNDO/REDO BUTTON] Undo blocked:', { canUndo, isProcessing });
      return;
    }
    
    console.log('[UNDO/REDO BUTTON] Calling undo()...');
    const result = await undo();
    console.log('[UNDO/REDO BUTTON] Undo result:', result);
  };

  const handleRedo = async () => {
    console.log('[UNDO/REDO BUTTON] Redo button clicked. State:', {
      canRedo,
      isProcessing,
      lastRedoDescription,
    });
    
    if (!canRedo || isProcessing) {
      console.warn('[UNDO/REDO BUTTON] Redo blocked:', { canRedo, isProcessing });
      return;
    }
    
    console.log('[UNDO/REDO BUTTON] Calling redo()...');
    const result = await redo();
    console.log('[UNDO/REDO BUTTON] Redo result:', result);
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Undo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleUndo}
            disabled={!canUndo || isProcessing}
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-xl transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              isLightMode
                ? "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
            )}
            aria-label="Annuler"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="h-4 w-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span>Annuler</span>
              <kbd
                className={cn(
                  "px-1 py-0.5 rounded text-[10px] font-mono",
                  isLightMode ? "bg-zinc-200" : "bg-white/10"
                )}
              >
                ⌘Z
              </kbd>
            </div>
            {lastUndoDescription && canUndo && (
              <span className="text-zinc-500 text-[10px] truncate">
                {lastUndoDescription}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Redo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleRedo}
            disabled={!canRedo || isProcessing}
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-xl transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              isLightMode
                ? "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
            )}
            aria-label="Rétablir"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Redo2 className="h-4 w-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span>Rétablir</span>
              <kbd
                className={cn(
                  "px-1 py-0.5 rounded text-[10px] font-mono",
                  isLightMode ? "bg-zinc-200" : "bg-white/10"
                )}
              >
                ⌘⇧Z
              </kbd>
            </div>
            {lastRedoDescription && canRedo && (
              <span className="text-zinc-500 text-[10px] truncate">
                {lastRedoDescription}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
