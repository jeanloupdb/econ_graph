"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Node } from "@/lib/types";
import {
    Edit3,
    ExternalLink,
    Layers,
    Loader2,
    Trash2,
    X
} from "lucide-react";

interface InspectorHeaderProps {
  node?: Node;
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
  onClose: () => void;
}

export function InspectorHeader({
  node,
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
  onClose,
}: InspectorHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800 flex-wrap gap-2">
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30">
          {isCompositeNode && (
            <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          )}
          <h2 className="text-base font-semibold truncate text-zinc-900 dark:text-zinc-100">
            {node?.label || "Inspector"}
          </h2>
          {isCompositeNode && canOpenCompositeEditor && (
            <>
              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
              <button
                onClick={onOpenCompositeEditor}
                disabled={!canOpenCompositeEditor}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity disabled:opacity-50 flex-shrink-0"
                title="Ouvrir dans l'éditeur de composite"
                aria-label="Ouvrir dans l'éditeur de composite"
              >
                <ExternalLink className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Éditer</span>
              </button>
            </>
          )}
          {!isCompositeNode && node && (
            <>
              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
              <button
                onClick={
                  (node as any).provider_enabled
                    ? onEditApiNode
                    : onEditNode
                }
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity flex-shrink-0"
                title="Modifier"
                aria-label="Modifier"
              >
                <Edit3 className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Modifier</span>
              </button>
            </>
          )}
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
      <div className="flex items-center gap-2">
        {node && (
          <>
            {canTransformToComposite && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 border-dashed"
                onClick={onTransformToComposite}
                title={
                  (selectedNodeIds?.length || 0) > 1
                    ? "Créer un composite à partir de la sélection"
                    : "Transformer en composite (avec dépendances)"
                }
                disabled={transforming}
              >
                {transforming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Layers className="h-3.5 w-3.5" />
                )}
                {(selectedNodeIds?.length || 0) > 1
                  ? `Transformer (${selectedNodeIds?.length})`
                  : "Transformer"}
              </Button>
            )}
            <div className="relative group">
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                title="Supprimer"
                aria-label="Supprimer"
                className="relative"
              >
                <Trash2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </Button>
              <div className="pointer-events-none absolute right-0 top-full mt-1 px-2 py-1 text-xs rounded bg-zinc-900 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Supprimer ce nœud. Les parents/enfants restent.
              </div>
            </div>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          title="Fermer"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
