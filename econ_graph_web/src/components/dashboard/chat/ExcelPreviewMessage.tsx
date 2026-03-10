/**
 * ExcelPreviewMessage - Excel analysis card with subtle color accents
 */

"use client";

import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { type ExcelAnalysis } from "@/hooks/useExcelImport";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, Check, FileSpreadsheet, Loader2, TriangleAlert } from "lucide-react";

interface ExcelPreviewMessageProps {
  analysis: ExcelAnalysis;
  isImporting: boolean;
  onConvert: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function ExcelPreviewMessage({
  analysis,
  isImporting,
  onConvert,
  onCancel,
  onRetry,
}: ExcelPreviewMessageProps) {
  const isNotSuitable = analysis.suitability_level === 'not_suitable';
  const isGood = analysis.suitability_level === 'excellent' || analysis.suitability_level === 'good';

  // Subtle score color — only the score gets a touch of color
  const scoreColor = isGood
    ? "text-emerald-400/80"
    : isNotSuitable
      ? "text-red-400/70"
      : "text-amber-400/70";

  // Status label
  const statusLabel = isGood
    ? "Compatible"
    : isNotSuitable
      ? "Non compatible"
      : "Partiellement compatible";

  const statusColor = isGood
    ? "text-emerald-400/70"
    : isNotSuitable
      ? "text-red-400/60"
      : "text-amber-400/60";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 items-start"
    >
      {/* Avatar */}
      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
        <SmartGraphLogo size={20} />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 min-w-0">
        <p className="text-[14px] text-zinc-700 leading-relaxed">
          J&apos;ai analysé votre fichier Excel.
        </p>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
          {/* File header */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-zinc-800 truncate">
                {analysis.filename}
              </p>
              <p className="text-[12px] text-zinc-400">
                {analysis.sheet_count} feuille{analysis.sheet_count > 1 ? 's' : ''} · {analysis.total_cells} cellules
              </p>
            </div>
            {/* Score + status */}
            <div className="text-right shrink-0">
              <span className={cn("text-[13px] font-semibold tabular-nums", scoreColor)}>
                {analysis.suitability_score}%
              </span>
              <p className={cn("text-[10px]", statusColor)}>{statusLabel}</p>
            </div>
          </div>

          {/* Suitability message */}
          <div className="px-4 pb-3">
            <p className="text-[13px] leading-relaxed text-zinc-500">
              {analysis.suitability_message}
            </p>
          </div>

          {/* Stats row */}
          {!isNotSuitable && (
            <div className="px-4 py-3 border-t border-zinc-100 flex gap-6">
              <div>
                <span className="text-[14px] font-semibold text-zinc-800 tabular-nums">{analysis.estimated_nodes}</span>
                <span className="text-[12px] text-zinc-400 ml-1.5">variables</span>
              </div>
              <div>
                <span className="text-[14px] font-semibold text-zinc-800 tabular-nums">{analysis.parameters_count}</span>
                <span className="text-[12px] text-zinc-400 ml-1.5">paramètres</span>
              </div>
              <div>
                <span className={cn(
                  "text-[14px] font-semibold tabular-nums",
                  analysis.formula_count > 0 ? "text-zinc-800" : "text-zinc-400"
                )}>
                  {analysis.formula_count}
                </span>
                <span className="text-[12px] text-zinc-400 ml-1.5">formules</span>
              </div>
            </div>
          )}

          {/* Insights — with subtle icons for check/warning */}
          {analysis.insights.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-100 space-y-1.5">
              {analysis.insights.map((insight: string, i: number) => {
                const isCheck = insight.startsWith('✓');
                const isWarn = insight.startsWith('⚠');
                const text = insight.replace(/^[✓⚠○]\s*/, '');
                return (
                  <div key={i} className="flex items-start gap-2 text-[12px] leading-relaxed">
                    {isCheck && <Check className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />}
                    {isWarn && <TriangleAlert className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />}
                    {!isCheck && !isWarn && <span className="w-3 text-zinc-400 shrink-0 text-center">·</span>}
                    <span className="text-zinc-500">{text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* KPIs */}
          {analysis.detected_kpis.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-100">
              <p className="text-[11px] text-zinc-400 mb-2">KPIs détectés</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.detected_kpis.map((kpi: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[11px] rounded-md"
                  >
                    {kpi}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          {analysis.warning && (
            <div className="px-4 py-2.5 border-t border-zinc-100 flex items-start gap-2">
              <TriangleAlert className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
              <p className="text-[12px] text-zinc-500">{analysis.warning}</p>
            </div>
          )}
        </div>

        {/* Actions — clear UX guidance */}
        {isNotSuitable ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-zinc-500">
              Ce fichier ne peut pas être converti. Essayez avec un fichier contenant des formules ou des relations entre variables.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onRetry}
                className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
              >
                Choisir un autre fichier
              </button>
              <button
                onClick={onCancel}
                className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onConvert}
              disabled={isImporting || !analysis.can_import}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Conversion en cours...
                </>
              ) : (
                <>
                  Convertir en modèle
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isImporting}
              className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-30 px-2 py-2"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
