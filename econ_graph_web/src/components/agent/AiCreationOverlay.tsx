"use client";

import { AgentLog, AgentStatus } from "@/store/agentState";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  CheckCircle2,
  Code,
  Database,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface AiCreationOverlayProps {
  isVisible: boolean;
  logs: AgentLog[];
  status: AgentStatus;
  currentStep?: string;
}

// Construction steps - Pipeline optimisé
const CONSTRUCTION_STEPS = [
  {
    id: "init",
    label: "Initialisation",
    icon: Settings,
    color: "zinc",
  },
  {
    id: "analyze",
    label: "Analyse",
    icon: Brain,
    color: "violet",
  },
  {
    id: "build",
    label: "Construction",
    icon: Zap,
    color: "blue",
  },
  {
    id: "validate",
    label: "Validation",
    icon: Code,
    color: "emerald",
  },
];

// Map agent steps to construction progression
const STEP_TO_INDEX: Record<string, number> = {
  analyste: 1,
  executeur: 2,
  validateur: 3,
  correcteur: 3,
};

// Dynamic messages for different phases
const PHASE_MESSAGES: Record<number, string[]> = {
  0: [
    "Préparation de l'environnement",
    "Configuration des agents",
    "Chargement des modules",
  ],
  1: [
    "Analyse de votre demande",
    "Compréhension du contexte",
    "Identification des variables",
    "Structuration du modèle",
  ],
  2: [
    "Création des nœuds",
    "Génération des formules",
    "Construction du graphe",
    "Définition des relations",
  ],
  3: [
    "Validation des calculs",
    "Vérification de la cohérence",
    "Optimisation du modèle",
    "Finalisation",
  ],
};

export function AiCreationOverlay({
  isVisible,
  logs,
  status,
  currentStep,
}: AiCreationOverlayProps) {
  const [nodeCount, setNodeCount] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [userIntent, setUserIntent] = useState<string | null>(null);
  const isSuccess = status === "success";

  // Determine current step index
  const currentStepIndex = currentStep ? STEP_TO_INDEX[currentStep] || 0 : 0;
  const activeStep = CONSTRUCTION_STEPS[currentStepIndex];

  // Cycle through messages for current phase
  useEffect(() => {
    if (isSuccess) return;

    const messages = PHASE_MESSAGES[currentStepIndex] || PHASE_MESSAGES[0];
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentStepIndex, isSuccess]);

  // Reset message index when step changes
  useEffect(() => {
    setMessageIndex(0);
  }, [currentStepIndex]);

  // Count nodes created from logs
  useEffect(() => {
    const count = logs.filter(
      (l) =>
        l.message.includes("Création du nœud") ||
        l.message.includes("Created node") ||
        l.message.includes("Nœud créé") ||
        l.message.includes("✓ Nœud:")
    ).length;
    setNodeCount(count);
  }, [logs]);

  // Extract user intent from logs
  useEffect(() => {
    const intentLog = logs.find((l) => l.message.startsWith("💡"));
    if (intentLog) {
      const intent = intentLog.message.replace(/^💡\s*/, "");
      setUserIntent(intent);
    }
  }, [logs]);

  // Current message
  const message = useMemo(() => {
    if (isSuccess) return "Modèle créé avec succès";

    const messages = PHASE_MESSAGES[currentStepIndex] || PHASE_MESSAGES[0];
    return messages[messageIndex] || messages[0];
  }, [isSuccess, currentStepIndex, messageIndex]);

  // Progress calculation
  const progress = isSuccess
    ? 100
    : Math.min(95, ((currentStepIndex + 0.5) / CONSTRUCTION_STEPS.length) * 100);

  const Icon = activeStep.icon;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop with subtle gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
          />

          {/* Ambient glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] ${
                isSuccess ? "bg-emerald-500/20" : "bg-violet-500/20"
              }`}
            />
          </div>

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full max-w-md mx-4"
          >
            <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden">
              {/* Progress bar at top - Linear style */}
              <div className="h-1 bg-zinc-800">
                <motion.div
                  className={`h-full ${isSuccess ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500"}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              <div className="p-8">
                {/* Icon with animation */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* Outer ring - spinning */}
                    {!isSuccess && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute inset-0 w-16 h-16"
                      >
                        <svg className="w-full h-full" viewBox="0 0 64 64">
                          <circle
                            cx="32"
                            cy="32"
                            r="30"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="120 60"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="50%" stopColor="#a855f7" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </motion.div>
                    )}

                    {/* Icon container */}
                    <div
                      className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
                        isSuccess
                          ? "bg-emerald-500/10 border-2 border-emerald-500/30"
                          : "bg-zinc-800/50 border border-zinc-700/50"
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {isSuccess ? (
                          <motion.div
                            key="success"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", duration: 0.5 }}
                          >
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key={activeStep.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Icon className="w-7 h-7 text-zinc-300" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="text-center mb-6">
                  <AnimatePresence mode="wait">
                    <motion.h3
                      key={message}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className={`text-lg font-medium ${
                        isSuccess ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {message}
                    </motion.h3>
                  </AnimatePresence>

                  {/* Node count during build */}
                  {nodeCount > 0 && currentStepIndex >= 2 && !isSuccess && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-zinc-500 mt-2"
                    >
                      {nodeCount} variable{nodeCount > 1 ? "s" : ""} créée
                      {nodeCount > 1 ? "s" : ""}
                    </motion.p>
                  )}
                </div>

                {/* Steps indicator */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  {CONSTRUCTION_STEPS.map((step, index) => {
                    const isActive = index === currentStepIndex && !isSuccess;
                    const isDone = index < currentStepIndex || isSuccess;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <motion.div
                          animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                          transition={{
                            duration: 1.5,
                            repeat: isActive ? Infinity : 0,
                          }}
                          className={`
                            relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
                            ${isDone ? "bg-emerald-500/20 text-emerald-400" : ""}
                            ${isActive ? "bg-violet-500/20 text-violet-400" : ""}
                            ${!isActive && !isDone ? "bg-zinc-800/50 text-zinc-600" : ""}
                          `}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <StepIcon className="w-4 h-4" />
                          )}
                        </motion.div>

                        {/* Connector line */}
                        {index < CONSTRUCTION_STEPS.length - 1 && (
                          <div
                            className={`w-6 h-0.5 rounded-full transition-colors duration-300 ${
                              index < currentStepIndex || isSuccess
                                ? "bg-emerald-500/50"
                                : "bg-zinc-800"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* User intent - if available */}
                {userIntent && !isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                          Objectif détecté
                        </p>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {userIntent}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Success footer */}
                {isSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <p className="text-sm text-zinc-500">
                      Redirection en cours...
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
