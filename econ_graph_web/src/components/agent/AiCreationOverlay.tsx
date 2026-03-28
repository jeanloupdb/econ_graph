"use client";

import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { AgentLog, AgentStatus } from "@/store/agentState";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

interface AiCreationOverlayProps {
  isVisible: boolean;
  logs: AgentLog[];
  status: AgentStatus;
  currentStep?: string;
  onCancel?: () => void;
  variant?: "default" | "import";
}

const CONSTRUCTION_STEPS = [
  { id: "init",     label: "Init" },
  { id: "analyze",  label: "Analyse" },
  { id: "build",    label: "Construction" },
  { id: "validate", label: "Validation" },
];

const IMPORT_STEPS = [
  { id: "analyze", label: "Analyse" },
  { id: "build",   label: "Création" },
];

const STEP_TO_INDEX: Record<string, number> = {
  analyste: 1, executeur: 2, validateur: 3, correcteur: 3,
};
const IMPORT_STEP_TO_INDEX: Record<string, number> = {
  analyste: 0, executeur: 1, validateur: 1, correcteur: 1,
};

const PHASE_MESSAGES: Record<number, string[]> = {
  0: ["Préparation de l'environnement", "Configuration des agents"],
  1: ["Analyse de votre demande", "Identification des variables", "Structuration du modèle"],
  2: ["Création des nœuds", "Génération des formules", "Construction du graphe"],
  3: ["Validation des calculs", "Vérification de la cohérence", "Finalisation"],
};

const IMPORT_PHASE_MESSAGES: Record<number, string[]> = {
  0: ["Analyse du fichier Excel"],
  1: ["Création du modèle"],
};

export function AiCreationOverlay({
  isVisible,
  logs,
  status,
  currentStep,
  onCancel,
  variant = "default",
}: AiCreationOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const isSuccess = status === "success";
  const isImport = variant === "import";
  const steps = isImport ? IMPORT_STEPS : CONSTRUCTION_STEPS;
  const stepToIndex = isImport ? IMPORT_STEP_TO_INDEX : STEP_TO_INDEX;
  const phaseMessages = isImport ? IMPORT_PHASE_MESSAGES : PHASE_MESSAGES;

  const currentStepIndex = currentStep ? (stepToIndex[currentStep] ?? 0) : 0;

  useEffect(() => {
    if (isSuccess) return;
    const msgs = phaseMessages[currentStepIndex] || phaseMessages[0];
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % msgs.length);
    }, isImport ? 999999 : 3000);
    return () => clearInterval(interval);
  }, [currentStepIndex, isImport, isSuccess, phaseMessages]);

  const nodeCount = useMemo(
    () => logs.filter(l =>
      l.message.includes("Création du nœud") ||
      l.message.includes("Created node") ||
      l.message.includes("✓ Nœud:")
    ).length,
    [logs]
  );

  const message = useMemo(() => {
    if (isSuccess) return "Modèle créé avec succès";
    const msgs = phaseMessages[currentStepIndex] || phaseMessages[0];
    return msgs[messageIndex % msgs.length] || msgs[0];
  }, [isSuccess, currentStepIndex, messageIndex, phaseMessages]);

  const progress = isSuccess
    ? 100
    : Math.min(92, ((currentStepIndex + 0.5) / steps.length) * 100);

  const overlay = (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-100/85 backdrop-blur-sm"
        >
          {/* Card */}
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full max-w-sm mx-4 bg-white rounded-xl border border-zinc-200 overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-0.5 bg-zinc-100">
              <motion.div
                className={isSuccess ? "h-full bg-emerald-500" : "h-full bg-violet-500"}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>

            <div className="px-8 py-8">
              {/* Central motif */}
              <div className="flex justify-center mb-7">
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SmartGraphLogo size={36} loading />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Message */}
              <div className="text-center mb-6">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={message}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={`text-[15px] font-semibold tracking-tight ${
                      isSuccess ? "text-emerald-600" : "text-zinc-900"
                    }`}
                  >
                    {message}
                  </motion.p>
                </AnimatePresence>

                {nodeCount > 0 && currentStepIndex >= 2 && !isSuccess && !isImport && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-mono text-[11px] text-zinc-400 mt-1.5 uppercase tracking-widest"
                  >
                    {nodeCount} variable{nodeCount > 1 ? "s" : ""} créée{nodeCount > 1 ? "s" : ""}
                  </motion.p>
                )}

                {isSuccess && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="font-mono text-[10px] text-zinc-400 mt-1.5 uppercase tracking-widest"
                  >
                    Redirection en cours…
                  </motion.p>
                )}
              </div>

              {/* Steps */}
              <div className="flex items-center justify-center gap-0 mb-6">
                {steps.map((step, index) => {
                  const isActive = index === currentStepIndex && !isSuccess;
                  const isDone = index < currentStepIndex || isSuccess;

                  return (
                    <div key={step.id} className="flex items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          isDone ? "bg-emerald-500" :
                          isActive ? "bg-violet-500" :
                          "bg-zinc-200"
                        }`} />
                        <span className={`font-mono text-[9px] uppercase tracking-widest transition-colors duration-300 ${
                          isDone ? "text-emerald-500" :
                          isActive ? "text-violet-500" :
                          "text-zinc-300"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-6 h-px mx-2 mb-3.5 transition-colors duration-300 ${
                          index < currentStepIndex || isSuccess ? "bg-emerald-300" : "bg-zinc-200"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cancel */}
              {!isSuccess && onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
