"use client";

import { AgentLog, AgentStatus } from "@/store/agentState";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, CheckCircle2, Code, Database, Network, Settings, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface AiCreationOverlayProps {
  isVisible: boolean;
  logs: AgentLog[];
  status: AgentStatus;
  currentStep?: string;
}

// Initialization sub-steps that appear progressively
const INIT_SUBSTEPS = [
  { id: 'setup', label: 'Configuration du système', icon: Settings },
  { id: 'connect', label: 'Connexion à l\'IA', icon: Sparkles },
  { id: 'prepare', label: 'Préparation de l\'environnement', icon: Database },
];

// Construction steps with unified sober design
const CONSTRUCTION_STEPS = [
  {
    id: 'init',
    label: 'Initialisation',
    icon: Sparkles,
    message: 'Démarrage de l\'IA...'
  },
  {
    id: 'analyze',
    label: 'Analyse',
    icon: Brain,
    message: 'Analyse de votre demande...'
  },
  {
    id: 'design',
    label: 'Architecture',
    icon: Network,
    message: 'Conception de l\'architecture...'
  },
  {
    id: 'build',
    label: 'Construction',
    icon: Zap,
    message: 'Création des nœuds...'
  },
  {
    id: 'validate',
    label: 'Finalisation',
    icon: Code,
    message: 'Finalisation du modèle...'
  },
];

// Map agent steps to construction progression
const STEP_TO_INDEX: Record<string, number> = {
  'analyste': 1,
  'planificateur': 2,
  'executeur': 3,
  'validateur': 4,
  'correcteur': 4,
};

// Messages to display during the long analysis phase
const WAITING_MESSAGES = [
  "Initialisation des services...",
  "Chargement des modules IA...",
  "Connexion aux bases de connaissances...",
  "Allocation des ressources...",
  "Vérification de la disponibilité...",
  "Synchronisation des contextes...",
  "Préparation de l'environnement d'exécution...",
  "Calibrage des paramètres...",
  "Mise en cache des dépendances...",
  "Démarrage des agents..."
];

export function AiCreationOverlay({ isVisible, logs, status, currentStep }: AiCreationOverlayProps) {
  const [nodeCount, setNodeCount] = useState(0);
  const [dots, setDots] = useState('');
  const [initSubStepIndex, setInitSubStepIndex] = useState(0);
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0);
  const isSuccess = status === 'success';

  // Determine current step index
  const currentStepIndex = currentStep ? (STEP_TO_INDEX[currentStep] || 0) : 0;
  const activeStep = CONSTRUCTION_STEPS[currentStepIndex];
  
  // We consider "waiting phase" to be both Init (0) and Analysis (1)
  // But we want to show specific init substeps first
  const isWaitingPhase = currentStepIndex <= 1 && !isSuccess;
  const initSubstepsDone = initSubStepIndex >= INIT_SUBSTEPS.length;

  // Cycle through init substeps during initialization
  useEffect(() => {
    if (currentStepIndex === 0 && !isSuccess) {
      const interval = setInterval(() => {
        setInitSubStepIndex(prev => {
          // If we reached the end, we stop incrementing index to flag "done"
          // The message logic will switch to random messages
          if (prev >= INIT_SUBSTEPS.length) return prev;
          return prev + 1;
        });
      }, 2000); // Faster init steps (2s)
      return () => clearInterval(interval);
    } else {
      // If we moved past step 0, ensure we consider init done
      if (currentStepIndex > 0) setInitSubStepIndex(INIT_SUBSTEPS.length);
    }
  }, [currentStepIndex, isSuccess]);

  // Cycle through waiting messages randomly
  useEffect(() => {
    // Active if we are in waiting phase AND (we are in analysis OR init substeps are done)
    const shouldRotate = isWaitingPhase && (currentStepIndex === 1 || initSubstepsDone);
    
    if (shouldRotate) {
      // Initial random message
      if (waitingMessageIndex === 0) {
          setWaitingMessageIndex(Math.floor(Math.random() * WAITING_MESSAGES.length));
      }

      const randomInterval = Math.floor(Math.random() * 1000) + 3000; // 3000ms to 4000ms

      const interval = setInterval(() => {
        setWaitingMessageIndex(prev => {
            let next;
            do {
                next = Math.floor(Math.random() * WAITING_MESSAGES.length);
            } while (next === prev && WAITING_MESSAGES.length > 1); // Avoid same message twice
            return next;
        });
      }, randomInterval); 
      return () => clearInterval(interval);
    }
  }, [isWaitingPhase, currentStepIndex, initSubstepsDone]);

  // Animated dots for loading effect
  useEffect(() => {
    if (!isSuccess) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 600);
      return () => clearInterval(interval);
    }
  }, [isSuccess]);

  // Count nodes created from logs
  useEffect(() => {
    const count = logs.filter(l =>
      l.message.includes("Création du nœud") ||
      l.message.includes("Created node")
    ).length;
    setNodeCount(count);
  }, [logs]);

  // Current message
  const message = useMemo(() => {
    if (isSuccess) return "Votre modèle est prêt !";
    
    // If in init phase and substeps not done, show substep
    if (currentStepIndex === 0 && !initSubstepsDone) {
      return INIT_SUBSTEPS[initSubStepIndex]?.label || INIT_SUBSTEPS[INIT_SUBSTEPS.length - 1].label;
    }

    // If in waiting phase (Analysis OR Init done), show random message
    if (isWaitingPhase) {
        return WAITING_MESSAGES[waitingMessageIndex];
    }

    if (nodeCount > 0 && currentStepIndex === 3) {
      return `${nodeCount} variable${nodeCount > 1 ? 's' : ''} créée${nodeCount > 1 ? 's' : ''}`;
    }
    return activeStep.message;
  }, [isSuccess, activeStep, nodeCount, currentStepIndex, initSubstepsDone, initSubStepIndex, isWaitingPhase, waitingMessageIndex]);

  // Calculate progress
  const progress = isSuccess ? 100 : Math.min(95, ((currentStepIndex + 1) / CONSTRUCTION_STEPS.length) * 100);

  const Icon = activeStep.icon;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center gap-6"
          >
            {/* Icon Circle with Pulse */}
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    {isSuccess ? (
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    ) : (
                        <Icon className="w-8 h-8 text-blue-500" />
                    )}
                    {!isSuccess && (
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                    )}
                </div>
            </div>

            {/* Text Content */}
            <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">
                    {message}
                </h3>
                <p className="text-sm text-zinc-400">
                    {isSuccess ? 'Terminé' : `Étape ${currentStepIndex + 1} sur ${CONSTRUCTION_STEPS.length}`}
                </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-medium text-zinc-500">
                    <span>Progression</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-blue-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>
            </div>

            {/* Sub-steps or Details */}
            {!isSuccess && (
                <div className="w-full bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-400 text-center border border-zinc-800">
                    L&apos;IA construit votre modèle...
                </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
