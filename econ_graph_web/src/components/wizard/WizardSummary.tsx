/**
 * Écran de récapitulatif du wizard.
 * Affiche l'intention comprise, la structure du graphe et les scénarios suggérés.
 */

'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { WizardSummary as WizardSummaryType } from '@/types/wizard';
import { Button } from '@/components/ui/button';

interface WizardSummaryProps {
  summary: WizardSummaryType;
  onRefine: () => void;
  onCreateProject: () => void;
  isCreating?: boolean;
}

export function WizardSummary({
  summary,
  onRefine,
  onCreateProject,
  isCreating = false,
}: WizardSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <button
          onClick={onRefine}
          disabled={isCreating}
          className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Affiner mon besoin
        </button>
        <div className="text-sm font-medium text-zinc-500">Récapitulatif</div>
      </div>

      <div className="space-y-5 overflow-y-auto custom-scrollbar pr-1">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Votre modèle est prêt
          </h2>
          <p className="text-sm text-zinc-500 mt-2">
            Vérifiez la structure puis lancez la création.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/50 px-5 py-4">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
            Objectif
          </div>
          <p className="mt-2 text-[15px] text-zinc-100 leading-relaxed">
            {summary.user_intent}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/50 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
              Structure
            </div>
            <div className="text-[11px] text-zinc-500">
              {summary.graph_preview.nodes_count} nœuds
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-800/70 bg-zinc-950/70 px-3 py-2 text-center text-[13px] font-medium text-zinc-300">
            {summary.graph_preview.structure}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/70 p-2 text-zinc-400">
              <div className="text-zinc-500">Paramètres</div>
              <div className="text-zinc-200 font-medium">
                {summary.graph_preview.parameters_count ?? '—'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/70 p-2 text-zinc-400">
              <div className="text-zinc-500">Calculs</div>
              <div className="text-zinc-200 font-medium">
                {summary.graph_preview.computed_count ?? '—'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/70 p-2 text-zinc-400">
              <div className="text-zinc-500">Résultats</div>
              <div className="text-zinc-200 font-medium">
                {summary.graph_preview.results_count ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {summary.suggested_scenarios.length > 0 && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/50 px-5 py-4">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
              Scénarios suggérés
            </div>
            <ul className="mt-2 space-y-2">
              {summary.suggested_scenarios.map((scenario, i) => (
                <li key={i} className="text-sm text-zinc-400">
                  {scenario}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <Button
          onClick={onCreateProject}
          disabled={isCreating}
          className="min-w-[180px] bg-zinc-100 hover:bg-white text-zinc-900"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Créer mon modèle
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
