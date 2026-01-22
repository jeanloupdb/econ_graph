/**
 * Dialog principal du wizard conversationnel.
 * Orchestre le flux complet : questions → récapitulatif → création.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useWizard } from '@/hooks/useWizard';
import { WizardStep } from './WizardStep';
import { WizardSummary } from './WizardSummary';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WizardDialog({ open, onOpenChange }: WizardDialogProps) {
  const router = useRouter();
  const {
    state,
    initialize,
    submitAnswer,
    goBack,
    refineFromSummary,
    createProject,
    resetConversation,
  } = useWizard();

  // Initialiser le wizard quand le dialog s'ouvre
  useEffect(() => {
    if (open && !state.currentQuestion && state.stepNumber === 0) {
      initialize();
    }
  }, [open, state.currentQuestion, state.stepNumber, initialize]);

  // Gérer la création du projet
  const handleCreateProject = async () => {
    const taskId = await createProject();
    if (taskId) {
      // Fermer le dialog et rediriger vers la page de création
      onOpenChange(false);
      router.push(`/dashboard/projects/creating/${taskId}`);
      // Réinitialiser le wizard pour la prochaine fois
      setTimeout(resetConversation, 500);
    }
  };

  // Calculer le nombre total d'étapes (estimation)
  const totalSteps = state.summary ? state.stepNumber : state.stepNumber + 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] p-0 gap-0 bg-[#0a0a0a] border-zinc-800/50">
        <DialogHeader className="p-6 pb-0 border-b border-zinc-800/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium text-white">
              {state.currentStep === 'question' && 'Nouvelle modélisation'}
              {state.currentStep === 'summary' && 'Récapitulatif'}
              {state.currentStep === 'creating' && 'Création en cours...'}
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6">
          {/* Error Alert */}
          {state.error && (
            <Alert variant="destructive" className="mb-4 bg-red-950/50 border-red-900 text-red-200">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Content */}
          <div className="h-full">
            <AnimatePresence mode="wait">
              {state.currentStep === 'question' && state.currentQuestion && (
                <WizardStep
                  key={`step-${state.stepNumber}`}
                  question={state.currentQuestion}
                  stepNumber={state.stepNumber}
                  totalSteps={totalSteps}
                  onSubmit={submitAnswer}
                  onBack={goBack}
                  isLoading={state.isLoading}
                  canGoBack={state.conversationHistory.length > 0}
                />
              )}

              {state.currentStep === 'summary' && state.summary && (
                <WizardSummary
                  key="summary"
                  summary={state.summary}
                  onRefine={refineFromSummary}
                  onCreateProject={handleCreateProject}
                  isCreating={state.isLoading}
                />
              )}

              {state.currentStep === 'creating' && (
                <div
                  key="creating"
                  className="flex h-full flex-col items-center justify-center"
                >
                  <div className="text-center">
                    <div className="mb-4 text-6xl">✨</div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      Création de votre modèle...
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Cela peut prendre quelques secondes
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
