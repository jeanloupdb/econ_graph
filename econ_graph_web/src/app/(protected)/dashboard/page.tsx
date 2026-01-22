"use client";

import { DashboardSidebar } from "@/components/chrome/DashboardSidebar";
import { ConversationalChat } from "@/components/dashboard/ConversationalChat";
import { ProfileOnboarding } from "@/components/dashboard/ProfileOnboarding";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { useSmartProfile } from "@/hooks/useSmartProfile";
import { useWizard } from "@/hooks/useWizard";
import { useAgentStore } from "@/store/agentState";
import { useProjectStore } from "@/store/projectState";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Dashboard - Interface conversationnelle simplifiée
 * Plus de topbar, tout est intégré dans le chat
 */
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { load } = useProjectStore();
  const [isCreating, setIsCreating] = useState(false);
  
  // Smart Profile - personnalisation des suggestions IA
  const { needsOnboarding, dismissOnboarding, markAsCompleted, refetch: refetchProfile } = useSmartProfile();

  const {
    state,
    initialize,
    submitAnswer,
    goBack,
    refineFromSummary,
    createProject: createFromWizard,
    resetConversation,
    addSystemMessage,
  } = useWizard();

  // 1. Initial Load - projects + wizard
  useEffect(() => {
    load();
    initialize();
  }, [load, initialize]);

  // 2. Gérer le retour d'erreur de création
  useEffect(() => {
    const errorMsg = searchParams?.get('error');
    const errorType = searchParams?.get('type');

    if (errorMsg && errorType === 'creation_failed') {
      setIsCreating(false);
      addSystemMessage('error', `La création a échoué : ${decodeURIComponent(errorMsg)}. Vous pouvez modifier votre demande et réessayer.`);

      // Nettoyer l'URL sans recharger
      if (typeof window !== 'undefined') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('error');
        newUrl.searchParams.delete('type');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [searchParams, addSystemMessage]);

  // Accès au store agent pour initialiser le task
  const startTask = useAgentStore((s) => s.startTask);

  // Créer le projet depuis le wizard
  const handleCreateProject = async (customPrompt?: string) => {
    setIsCreating(true);
    try {
      const taskId = await createFromWizard(customPrompt);
      if (taskId) {
        startTask(taskId);
        router.push(`/dashboard/projects/creating/${taskId}`);
      } else {
        setIsCreating(false);
      }
    } catch {
      setIsCreating(false);
    }
  };

  // Réinitialiser la conversation
  const handleReset = async () => {
    await resetConversation();
  };

  // Callback après complétion du profil
  const handleProfileComplete = async () => {
    // Marquer immédiatement comme complété pour fermer l'overlay
    markAsCompleted();
    
    // Reset le wizard pour charger les nouvelles suggestions personnalisées
    try {
      await resetConversation();
    } catch (e) {
      console.error('Failed to reset conversation:', e);
    }
  };

  return (
    <div className="h-screen bg-zinc-950 text-white flex overflow-hidden font-sans selection:bg-violet-500/30">
      {/* Overlay de profil onboarding */}
      <AnimatePresence>
        {needsOnboarding && (
          <ProfileOnboarding
            onComplete={handleProfileComplete}
            onSkip={dismissOnboarding}
          />
        )}
      </AnimatePresence>

      {/* Overlay de création */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Icône animée */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-2xl">
                  <SmartGraphLogo size={40} className="text-violet-400" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-2xl border border-violet-500/30"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* Texte */}
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Création en cours...
                </h2>
                <p className="text-sm text-zinc-400">
                  Initialisation de l&apos;agent de modélisation
                </p>
              </div>

              {/* Loader */}
              <div className="flex items-center gap-2 text-violet-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Préparation du pipeline IA</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <DashboardSidebar />

      {/* ZONE PRINCIPALE - Plus de topbar, directement le chat */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0F1115] relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#FFFFFF03_1px,transparent_1px),linear-gradient(to_bottom,#FFFFFF03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F1115] via-[#0F1115]/95 to-[#0F1115] pointer-events-none" />

        {/* Chat principal - occupe tout l'espace */}
        <div className="flex-1 relative z-0 flex flex-col overflow-hidden">
          <ConversationalChat
            state={state}
            onSubmitAnswer={submitAnswer}
            onGoBack={goBack}
            onRefineFromSummary={refineFromSummary}
            onCreateProject={handleCreateProject}
            onReset={handleReset}
          />
        </div>
      </main>
    </div>
  );
}

