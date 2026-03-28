"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, SlidersHorizontal, X } from "lucide-react";
import type { ImportGuide } from "@/types/excel-import-session";

export interface ImportSummaryPayload {
  project_id: string;
  project_name: string;
  nodes_created: number;
  edges_created: number;
  summary?: {
    total_cells?: number;
    parameters?: number;
    calculations?: number;
    results?: number;
  };
  import_guide?: ImportGuide;
}

interface ImportSummaryBannerProps {
  payload: ImportSummaryPayload;
  onDismiss: () => void;
}

export function ImportSummaryBanner({ payload, onDismiss }: ImportSummaryBannerProps) {
  const keyInputs = payload.import_guide?.key_inputs ?? [];
  const hasGuide = keyInputs.length > 0;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30 overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <span className="font-medium text-emerald-900 dark:text-emerald-100 truncate">
            Import terminé — {payload.project_name}
          </span>

          <div className="flex flex-wrap gap-1.5">
            {typeof payload.summary?.parameters === "number" && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/50 dark:text-emerald-300 text-[11px]">
                {payload.summary.parameters} param.
              </Badge>
            )}
            {typeof payload.summary?.calculations === "number" && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/50 dark:text-emerald-300 text-[11px]">
                {payload.summary.calculations} calculs
              </Badge>
            )}
            {typeof payload.summary?.results === "number" && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/50 dark:text-emerald-300 text-[11px]">
                {payload.summary.results} résultats
              </Badge>
            )}
            {(!payload.summary?.parameters && !payload.summary?.calculations && !payload.summary?.results) && (
              <span className="text-emerald-700 dark:text-emerald-400">
                {payload.nodes_created} variables · {payload.edges_created} dépendances
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Fermer</span>
        </Button>
      </div>

      {/* Key levers row */}
      {hasGuide && (
        <div className="border-t border-emerald-200/60 dark:border-emerald-800/30 px-4 py-2.5 flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-3 w-3 text-emerald-600/70 shrink-0" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Leviers clés :
          </span>
          {keyInputs.map((inp) => (
            <span
              key={inp.slug}
              className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-white/60 dark:bg-emerald-900/40 rounded-md px-1.5 py-0.5 border border-emerald-200/60"
            >
              {inp.label}
              {inp.value !== null && inp.value !== undefined
                ? ` = ${Number.isInteger(inp.value) ? inp.value : inp.value.toFixed(2)}`
                : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
