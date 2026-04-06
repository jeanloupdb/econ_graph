"use client";

import { cn } from "@/lib/utils";
import type { CandidateBlock, ImportSession, SelectedScope } from "@/types/excel-import-session";
import { ArrowRight, Calculator, FileSpreadsheet, TriangleAlert } from "lucide-react";
import { useState } from "react";

interface BlockSelectionViewProps {
  session: ImportSession;
  onConfirm: (scope: SelectedScope) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const SHEET_TYPE_LABELS: Record<string, string> = {
  calculation: "Calculs",
  mixed: "Mixte",
  input: "Paramètres",
  raw_data: "Données brutes",
  decorative: "Décoratif",
  unknown: "Inconnu",
};

export function BlockSelectionView({ session, onConfirm, onBack, isLoading }: BlockSelectionViewProps) {
  const candidateBlocks = session.candidate_blocks ?? [];
  const formulaBlocks = candidateBlocks.filter((b) => b.formula_count > 0);

  const defaultSelected = session.recommended_scope?.target_id
    ? candidateBlocks.find((b) => b.block_id === session.recommended_scope?.target_id)?.block_id ?? null
    : formulaBlocks[0]?.block_id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);

  const handleConfirm = () => {
    if (!selectedId) return;
    const block = candidateBlocks.find((b) => b.block_id === selectedId);
    if (!block) return;
    onConfirm({
      mode: "sheet",
      target_ids: [selectedId],
    });
  };

  const handleImportAll = () => {
    onConfirm({
      mode: "full",
      target_ids: formulaBlocks.map((b) => b.block_id),
    });
  };

  return (
    <div className="space-y-4">
      {session.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800 flex items-start gap-2">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{session.warnings[0]}</span>
        </div>
      )}

      <div className="space-y-2">
        {candidateBlocks.map((block) => (
          <BlockCard
            key={block.block_id}
            block={block}
            selected={selectedId === block.block_id}
            disabled={block.formula_count === 0}
            onSelect={() => block.formula_count > 0 && setSelectedId(block.block_id)}
          />
        ))}
      </div>

      <div className="space-y-2 pt-1">
        <button
          type="button"
          className={cn(
            "w-full rounded-xl px-4 py-3 text-[13px] font-medium transition-colors flex items-center justify-center gap-2",
            !selectedId || isLoading
              ? "bg-zinc-100 text-zinc-300 cursor-not-allowed"
              : "bg-zinc-900 text-white hover:bg-zinc-800"
          )}
          onClick={handleConfirm}
          disabled={!selectedId || isLoading}
        >
          Importer ce bloc
          <ArrowRight className="w-4 h-4" />
        </button>

        {formulaBlocks.length > 1 && (
          <button
            type="button"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[13px] font-medium text-zinc-600 transition-colors hover:border-violet-300 hover:text-zinc-900"
            onClick={handleImportAll}
            disabled={isLoading}
          >
            Importer toutes les feuilles ({formulaBlocks.length})
          </button>
        )}

        <button
          type="button"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[13px] font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900"
          onClick={onBack}
          disabled={isLoading}
        >
          Choisir un autre fichier
        </button>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  selected,
  disabled,
  onSelect,
}: {
  block: CandidateBlock;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200",
        disabled
          ? "opacity-40 cursor-not-allowed border-zinc-200 bg-zinc-50"
          : selected
          ? "border-violet-300 bg-violet-50/30"
          : "border-zinc-200 bg-white hover:border-violet-300"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
            disabled
              ? "bg-zinc-50 border-zinc-200"
              : selected
                ? "bg-violet-50 border-violet-200"
                : "bg-zinc-50 border-zinc-200"
          )}>
            {block.formula_count > 0
              ? <Calculator className={cn("w-3.5 h-3.5", selected ? "text-violet-600" : "text-zinc-500")} />
              : <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-zinc-900 truncate">{block.label}</span>
              {block.is_recommended && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-violet-500 shrink-0">reco</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {SHEET_TYPE_LABELS[block.sheet_type] ?? block.sheet_type}
              {" · "}
              {block.formula_count > 0
                ? `${block.formula_count} formule${block.formula_count > 1 ? "s" : ""} · ~${block.estimated_node_count} nœuds`
                : "Pas de formules"
              }
            </p>
          </div>
        </div>
        <span className={cn(
          "font-mono text-sm shrink-0 transition-colors",
          selected ? "text-violet-500" : "text-zinc-300"
        )}>›</span>
      </div>

      {block.warnings.length > 0 && (
        <p className="mt-2 text-[11px] text-amber-700 flex items-center gap-1">
          <TriangleAlert className="w-3 h-3 shrink-0" />
          {block.warnings[0]}
        </p>
      )}
    </button>
  );
}
