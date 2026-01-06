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
    <div className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Source API</div>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-6 px-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            <span className="text-[11px]">Modifier</span>
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-2 space-y-2">
        <div className="space-y-1.5">
          <div className="space-y-1">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              URL Endpoint
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Globe className="h-3 w-3 text-zinc-400 shrink-0" />
              <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 break-all line-clamp-1">
                {providerUrl || "—"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              Chemin JSON
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Database className="h-3 w-3 text-zinc-400 shrink-0" />
              <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                {providerJsonPath || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
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
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                <span className="font-medium">Erreur</span>
              </div>
            )}
          </div>

          {providerLastError && (
            <div className="text-[11px] bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-1.5 rounded border border-red-100 dark:border-red-900/20">
              {providerLastError}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={onManualCompute}
              disabled={!canCompute || computePending}
              className="flex-1 h-6 text-[11px] border-zinc-200 dark:border-zinc-700"
            >
              {computePending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
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
