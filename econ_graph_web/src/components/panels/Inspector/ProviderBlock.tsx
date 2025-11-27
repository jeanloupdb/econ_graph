"use client";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Node } from "@/lib/types";
import { Loader2, Edit3 } from "lucide-react";
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
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Source API</div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Modifier la source API"
            aria-label="Modifier la source API"
          >
            <Edit3 className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Modifier</span>
          </button>
        )}
      </div>
      <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
        <div>
          <span className="font-medium">URL :</span>{" "}
          <span className="font-mono break-all">{providerUrl || "—"}</span>
        </div>
        <div>
          <span className="font-medium">Chemin JSON :</span>{" "}
          <span className="font-mono">{providerJsonPath || "—"}</span>
        </div>
        {providerLastFetchedAt && (
          <div>
            <span className="font-medium">Dernier fetch :</span>{" "}
            {formatDate(providerLastFetchedAt)}
          </div>
        )}
        {providerLastError && (
          <div className="text-red-600 dark:text-red-300">
            <span className="font-medium">Erreur :</span>{" "}
            {providerLastError}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-1 items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={onManualCompute}
          disabled={!canCompute || computePending}
        >
          {computePending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Rafraîchissement…
            </span>
          ) : (
            "Rafraîchir"
          )}
        </Button>
        <ProviderTester url={providerUrl || ""} path={providerJsonPath || ""} />
      </div>
    </div>
  );
}
