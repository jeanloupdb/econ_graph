"use client";

import { Badge } from "@/components/ui/badge";
import type { NodeToneKey } from "@/lib/api/hooks";
import { getBadgeToneClasses, type TonePalette } from "@/lib/nodeStyles";
import type { Node } from "@/lib/types";
import { useUIStore } from "@/store/uiState";
import {
    Box,
    Edit3,
    ExternalLink,
    Globe,
    Layers,
    Trash2
} from "lucide-react";

interface InspectorHeaderProps {
  node?: Node;
  palette?: TonePalette;
  tone?: NodeToneKey;
  isCompositeNode: boolean;
  canTransformToComposite: boolean;
  transforming: boolean;
  canOpenCompositeEditor: boolean;
  onOpenCompositeEditor: () => void;
  onEditNode: () => void;
  onEditApiNode: () => void;
  onTransformToComposite: () => void;
  selectedNodeIds?: string[];
  onDelete: () => void;
  className?: string;
  canEdit?: boolean;
}

export function InspectorHeader({
  node,
  palette,
  tone,
  isCompositeNode,
  canTransformToComposite,
  transforming,
  canOpenCompositeEditor,
  onOpenCompositeEditor,
  onEditNode,
  onEditApiNode,
  onTransformToComposite,
  selectedNodeIds,
  onDelete,
  className,
  canEdit = true,
}: InspectorHeaderProps) {
  const developerMode = useUIStore((s) => s.developerMode);
  const isApiNode = (node as any)?.provider_enabled;
  
  // Determine badge classes based on tone
  const badgeClasses = tone ? getBadgeToneClasses(tone) : "";
  
  // Fallback classes if tone is not provided (should match previous logic)
  const fallbackClasses = isCompositeNode 
    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : isApiNode
    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
    : "bg-blue-500/10 text-blue-600 dark:text-blue-400";

  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Node Type Icon */}
          <div className={`w-6 h-6 flex items-center justify-center rounded-md shrink-0 ${tone ? badgeClasses : fallbackClasses}`}>
            {isCompositeNode ? (
              <Layers className="h-3.5 w-3.5" />
            ) : isApiNode ? (
              <Globe className="h-3.5 w-3.5" />
            ) : (
              <Box className="h-3.5 w-3.5" />
            )}
          </div>

          <h2 className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">
            {node?.label || "Inspector"}
          </h2>
        </div>
        
        {node?.computation_error && (
          <Badge
            variant="destructive"
            className="text-[10px]"
            title="Erreur de calcul"
          >
            Erreur
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        {developerMode && canEdit && isCompositeNode && canOpenCompositeEditor && (
          <button
            onClick={onOpenCompositeEditor}
            disabled={!canOpenCompositeEditor}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-zinc-700 dark:text-zinc-400 disabled:opacity-50"
            title="Ouvrir dans l'éditeur de composite"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}

        {developerMode && canEdit && !isCompositeNode && node && (
          <button
            onClick={
              isApiNode
                ? onEditApiNode
                : onEditNode
            }
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-zinc-700 dark:text-zinc-400"
            title="Modifier"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}

        {developerMode && canEdit && node && (
          <div className="relative group">
            <button
              onClick={onDelete}
              title="Supprimer"
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-700 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
