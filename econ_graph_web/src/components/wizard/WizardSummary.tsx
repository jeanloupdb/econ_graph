/**
 * Écran de récapitulatif du wizard.
 * Affiche l'intention comprise, la structure du graphe et les scénarios suggérés.
 */

'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { WizardSummary as WizardSummaryType } from '@/types/wizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onRefine}
            disabled={isCreating}
            className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Affiner mon besoin
          </button>
          <div className="text-sm font-medium text-zinc-500">
            Récapitulatif
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white">
          ✨ Votre modèle est prêt
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* User Intent */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
              💡 Objectif compris
            </div>
            <p className="text-white">
              {summary.user_intent}
            </p>
          </CardContent>
        </Card>

        {/* Graph Preview */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
              📊 Structure du graphe
            </div>

            <div className="mb-4 rounded-md bg-zinc-950 border border-zinc-800 p-3 text-center text-sm font-medium text-zinc-300">
              {summary.graph_preview.structure}
            </div>

            <p className="mb-4 text-sm text-zinc-400">
              {summary.graph_preview.description}
            </p>

            {summary.graph_preview.example_nodes &&
              summary.graph_preview.example_nodes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-zinc-400">
                    Nœuds principaux :
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summary.graph_preview.example_nodes.map((node, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-violet-500/10 border border-violet-500/20 px-2 py-1 text-xs font-medium text-violet-400"
                      >
                        {node}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Suggested Scenarios */}
        {summary.suggested_scenarios.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
                🎬 Scénarios suggérés
              </div>
              <ul className="space-y-2">
                {summary.suggested_scenarios.map((scenario, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-zinc-400"
                  >
                    <span className="mt-0.5 text-violet-400">•</span>
                    <span>{scenario}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onRefine} disabled={isCreating}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Affiner mon besoin
        </Button>
        <Button
          onClick={onCreateProject}
          disabled={isCreating}
          className="min-w-[180px]"
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
