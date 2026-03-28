"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CandidateBlock, ImportSession, SelectedScope } from "@/types/excel-import-session";
import { ArrowRight, Calculator, FileSpreadsheet, Star, TriangleAlert } from "lucide-react";
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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Sélectionnez un bloc à importer</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {session.verdict_message ?? "Choisissez la feuille à convertir en graphe causal."}
        </p>
      </div>

      {/* Warnings */}
      {session.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{session.warnings[0]}</span>
        </div>
      )}

      {/* Block list */}
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

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <Button
          className="w-full"
          onClick={handleConfirm}
          disabled={!selectedId || isLoading}
        >
          Importer ce bloc
          <ArrowRight className="w-4 h-4" />
        </Button>

        {formulaBlocks.length > 1 && (
          <Button
            variant="outline"
            className="w-full text-muted-foreground"
            onClick={handleImportAll}
            disabled={isLoading}
          >
            Importer toutes les feuilles ({formulaBlocks.length})
          </Button>
        )}

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onBack}
          disabled={isLoading}
        >
          Choisir un autre fichier
        </Button>
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
        "w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled
          ? "opacity-40 cursor-not-allowed border-border bg-muted/30"
          : selected
          ? "border-violet-300 bg-violet-50 ring-1 ring-violet-300"
          : "border-border bg-background hover:border-violet-200 hover:bg-violet-50/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            disabled ? "bg-muted" : selected ? "bg-violet-100" : "bg-muted"
          )}>
            {block.formula_count > 0
              ? <Calculator className={cn("w-3.5 h-3.5", selected ? "text-violet-600" : "text-muted-foreground")} />
              : <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground truncate">{block.label}</span>
              {block.is_recommended && (
                <Star className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {SHEET_TYPE_LABELS[block.sheet_type] ?? block.sheet_type}
              {" · "}
              {block.formula_count > 0
                ? `${block.formula_count} formule${block.formula_count > 1 ? "s" : ""} · ~${block.estimated_node_count} nœuds`
                : "Pas de formules"
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 shrink-0">
          {block.is_recommended && (
            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5">
              Recommandé
            </Badge>
          )}
          <InterestBar score={block.interest_score} />
        </div>
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

function InterestBar({ score }: { score: number }) {
  const bars = 4;
  const filled = Math.round((score / 100) * bars);
  const color =
    score >= 75 ? "bg-emerald-500" :
    score >= 45 ? "bg-blue-400" :
    score >= 20 ? "bg-amber-400" : "bg-muted-foreground/40";

  return (
    <div className="flex items-center gap-0.5 mt-0.5" title={`Score : ${score}/100`}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full",
            i < filled ? color : "bg-border",
            i === 0 ? "h-1.5" : i === 1 ? "h-2" : i === 2 ? "h-2.5" : "h-3"
          )}
        />
      ))}
    </div>
  );
}
