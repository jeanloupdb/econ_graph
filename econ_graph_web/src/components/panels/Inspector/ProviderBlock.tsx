"use client";

import { Button } from "@/components/ui/button";
import type { Node } from "@/lib/types";
import { formatDate } from "@/utils/format";
import { AlertCircle, Database, Edit3, Globe, Loader2 } from "lucide-react";
import { ProviderTester } from "./ProviderTester";

interface ProviderBlockProps {
  node: Node;
  providerUrl?: string | null;
  providerJsonPath?: string | null;
  providerLastFetchedAt?: string | null;
  providerLastError?: string | null;
  canCompute: boolean;
  computePending: boolean;
  onManualCompute: () => void;
  onEdit?: () => void;
}

export function ProviderBlock({
  node,
  providerUrl,
  providerJsonPath,
  providerLastFetchedAt,
  providerLastError,
  canCompute,
  computePending,
  onManualCompute,
  onEdit,
}: ProviderBlockProps) {
  if (!(node as any).provider_enabled) {
    return null;
  }

  return (
    <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Source API</div>
          </div>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 px-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
            Modifier
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <span>URL Endpoint</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all line-clamp-1">
                {providerUrl || "—"}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <span>Chemin JSON</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Database className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {providerJsonPath || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Dernier fetch:</span>
              {providerLastFetchedAt ? (
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {formatDate(providerLastFetchedAt)}
                </span>
              ) : (
                <span className="italic text-zinc-400">Jamais</span>
              )}
            </div>
            {providerLastError && (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-medium">Erreur</span>
              </div>
            )}
          </div>

          {providerLastError && (
            <div className="text-xs bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-2 rounded border border-red-100 dark:border-red-900/20">
              {providerLastError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onManualCompute}
              disabled={!canCompute || computePending}
              className="flex-1 h-8 text-xs border-zinc-200 dark:border-zinc-700"
            >
              {computePending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Rafraîchissement…
                </>
              ) : (
                "Rafraîchir maintenant"
              )}
            </Button>
            <div className="flex-1">
               <ProviderTester url={providerUrl || ""} path={providerJsonPath || ""} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
