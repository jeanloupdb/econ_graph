/**
 * Composant pour une étape du wizard (question + options + texte libre).
 * Style Linear.app avec animations fluides.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { WizardQuestion } from '@/types/wizard';
import { WizardOption } from './WizardOption';
import { WizardProgress } from './WizardProgress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface WizardStepProps {
  question: WizardQuestion;
  stepNumber: number;
  totalSteps: number;
  onSubmit: (userChoice?: string, userFreeform?: string) => void;
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [freeformText, setFreeformText] = useState('');

  const handleSubmit = () => {
    // Soumettre avec le choix sélectionné ET/OU le texte de précision
    if (freeformText.trim()) {
      onSubmit(selectedOption || undefined, freeformText.trim());
    } else if (selectedOption) {
      onSubmit(selectedOption, undefined);
    }
  };

  const canSubmit = selectedOption !== null || freeformText.trim().length > 0;

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
        <div className="space-y-2">
          {question.options.map((option) => (
            <WizardOption
              key={option.value}
              option={option}
              isSelected={selectedOption === option.value}
              onSelect={() => setSelectedOption(option.value)}
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
