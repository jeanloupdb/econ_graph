/**
 * Composant pour une étape du wizard (question + options + texte libre).
 * Style Linear.app avec animations fluides.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Zap } from 'lucide-react';
import { WizardQuestion } from '@/types/wizard';
import { WizardOption } from './WizardOption';
import { WizardProgress } from './WizardProgress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { WizardOption as WizardOptionType } from '@/types/wizard';

interface WizardStepProps {
  question: WizardQuestion;
  stepNumber: number;
  totalSteps: number;
  onSubmit: (
    userChoice?: string,
    userFreeform?: string,
    meta?: {
      selectedOption?: WizardOptionType;
      choiceType?: 'option' | 'freeform' | 'mixed';
      displayText?: string;
    }
  ) => void;
  onBack?: () => void;
  isLoading?: boolean;
  canGoBack?: boolean;
}

export function WizardStep({
  question,
  stepNumber,
  totalSteps,
  onSubmit,
  onBack,
  isLoading = false,
  canGoBack = false,
}: WizardStepProps) {
  const [selectedOption, setSelectedOption] = useState<WizardOptionType | null>(null);
  const [freeformText, setFreeformText] = useState('');

  const handleSubmit = () => {
    // Soumettre avec le choix sélectionné ET/OU le texte de précision
    if (freeformText.trim()) {
      onSubmit(selectedOption?.label || undefined, freeformText.trim(), {
        selectedOption: selectedOption || undefined,
        choiceType: selectedOption ? 'mixed' : 'freeform',
        displayText: selectedOption
          ? `${selectedOption.label} — ${freeformText.trim()}`
          : freeformText.trim(),
      });
    } else if (selectedOption) {
      onSubmit(selectedOption.label, undefined, {
        selectedOption,
        choiceType: 'option',
        displayText: selectedOption.description
          ? `${selectedOption.label} — ${selectedOption.description}`
          : selectedOption.label,
      });
    }
  };

  const canSubmit = selectedOption !== null || freeformText.trim().length > 0;

  // Detect the "joker" option (always has icon "Zap" per backend prompt)
  const jokerOption = question.options.find((o) => o.icon === 'Zap');
  const regularOptions = question.options.filter((o) => o !== jokerOption);

  const handleJokerSubmit = () => {
    if (!jokerOption || isLoading) return;
    onSubmit(jokerOption.label, undefined, {
      selectedOption: jokerOption,
      choiceType: 'option',
      displayText: jokerOption.description
        ? `${jokerOption.label} — ${jokerOption.description}`
        : jokerOption.label,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col"
    >
      {/* Header with progress */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={!canGoBack || isLoading}
            className={cn(
              'flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white',
              (!canGoBack || isLoading) &&
                'cursor-not-allowed opacity-30'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="text-sm text-zinc-500">
            Étape {stepNumber}/{totalSteps}
          </div>
        </div>

        <WizardProgress
          currentStep={stepNumber}
          totalSteps={totalSteps}
          className="py-2"
        />
      </div>

      {/* Question */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white">
          {question.question}
        </h2>
      </div>

      {/* Options */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {/* Regular refinement options */}
        <div className="space-y-2">
          {regularOptions.map((option) => (
            <WizardOption
              key={option.value}
              option={option}
              isSelected={selectedOption?.value === option.value}
              onSelect={() => setSelectedOption(option)}
            />
          ))}
        </div>

        {/* Zone de texte libre toujours visible */}
        {question.allow_freeform && (
          <div className="pt-4">
            <Textarea
              value={freeformText}
              onChange={(e) => setFreeformText(e.target.value)}
              placeholder={
                question.freeform_placeholder ||
                'Précisez ou décrivez autrement votre besoin...'
              }
              className="min-h-[100px] resize-none bg-transparent border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-700"
            />
          </div>
        )}

        {/* Joker option — visually separate, auto-submits on click */}
        {jokerOption && (
          <div className="pt-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-zinc-800/80" />
              <span className="text-[11px] text-zinc-600 select-none">ou</span>
              <div className="h-px flex-1 bg-zinc-800/80" />
            </div>
            <button
              type="button"
              onClick={handleJokerSubmit}
              disabled={isLoading}
              className={cn(
                'group w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left',
                'border-zinc-800/70 bg-zinc-900/30 transition-colors duration-150',
                'hover:border-zinc-700 hover:bg-zinc-900/60',
                'focus:outline-none focus:ring-2 focus:ring-zinc-700/50',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex-shrink-0 rounded-lg bg-zinc-800/80 p-1.5 transition-colors group-hover:bg-zinc-700/80">
                <Zap className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-zinc-300">
                  Générer directement
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  Lancer la création avec un modèle équilibré, sans affiner davantage
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0 transition-colors group-hover:text-zinc-400" />
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement...
            </>
          ) : (
            <>
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
