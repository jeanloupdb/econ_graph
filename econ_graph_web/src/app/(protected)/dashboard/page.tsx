"use client";

import { AiCreationOverlay } from "@/components/agent/AiCreationOverlay";
import { DashboardSidebar } from "@/components/chrome/DashboardSidebar";
import { ConversationalChat } from "@/components/dashboard/ConversationalChat";
import { ExcelImportView } from "@/components/dashboard/ExcelImportView";
import { ProfileOnboarding } from "@/components/dashboard/ProfileOnboarding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSmartProfile } from "@/hooks/useSmartProfile";
import { useWizard } from "@/hooks/useWizard";
import { useAgentStore } from "@/store/agentState";
import { useProjectStore } from "@/store/projectState";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, Menu } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { load } = useProjectStore();
  const [isLaunchingGraph, setIsLaunchingGraph] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [view, setView] = useState<'chat' | 'import'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);

  const { needsOnboarding, dismissOnboarding, markAsCompleted } = useSmartProfile();

  const {
    state,
    initialize,
    submitAnswer,
    goBack,
    createProject: createFromWizard,
    resetConversation,
    addSystemMessage,
    cancelLoading,
  } = useWizard();

  useEffect(() => {
    load();
    initialize();
  }, [load, initialize]);

  // Handle landing page "test this example" prefill
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefill = localStorage.getItem("sg_prefill_prompt");
    if (!prefill) return;
    localStorage.removeItem("sg_prefill_prompt");
    // Short delay so wizard finishes initializing before we launch
    const t = setTimeout(() => {
      handleCreateProject(prefill);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const errorMsg = searchParams?.get('error');
    const errorType = searchParams?.get('type');

    if (errorMsg && errorType === 'creation_failed') {
      addSystemMessage('error', `La création a échoué : ${decodeURIComponent(errorMsg)}. Vous pouvez modifier votre demande et réessayer.`);

      if (typeof window !== 'undefined') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('error');
        newUrl.searchParams.delete('type');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [searchParams, addSystemMessage]);

  const startTask = useAgentStore((s) => s.startTask);

  const handleCreateProject = async (customPrompt?: string) => {
    setIsLaunchingGraph(true);
    try {
      const taskId = await createFromWizard(customPrompt);
      if (taskId) {
        startTask(taskId);
        router.push(`/dashboard/projects/creating/${taskId}`);
        return;
      }
      setIsLaunchingGraph(false);
    } catch {
      setIsLaunchingGraph(false);
    }
  };

  const performReset = async () => {
    try {
      await resetConversation({ silent: true });
    } catch (e) {
      console.error('Failed to reset conversation:', e);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setView('chat'); // Reset view to chat
    await performReset();
    setTimeout(() => {
      setIsResetting(false);
    }, 800);
  };



  // Called when the user clicks "Nouveau modèle" in the sidebar
  const handleNewModelRequest = () => {
    setSidebarOpen(false);
    if (view === 'import') {
      // Just return to the current conversation — no reset
      setView('chat');
      return;
    }
    // On the chat view: only ask for confirmation if conversation has started
    if (state.conversationHistory.length > 0) {
      setConfirmNewOpen(true);
    }
    // If no history yet, do nothing (already at welcome screen)
  };

  const handleProfileComplete = async () => {
    markAsCompleted();
    try {
      setIsResetting(true);
      await resetConversation({ silent: true });
    } catch (e) {
      console.error('Failed to reset conversation:', e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen h-[100dvh] lg:h-screen bg-[#f5f5f7] text-zinc-900 flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-blue-500/20 p-0 lg:p-3 gap-0 lg:gap-3">
      {/* Profile onboarding overlay */}
      <AnimatePresence>
        {needsOnboarding && (
          <ProfileOnboarding
            onComplete={handleProfileComplete}
            onSkip={dismissOnboarding}
          />
        )}
      </AnimatePresence>

      {/* AI creation overlay while SSE is starting */}
      <AiCreationOverlay
        isVisible={isLaunchingGraph}
        logs={[]}
        status="initializing"
        currentStep="init"
      />

      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewModel={handleNewModelRequest}
        onImportClick={() => {
          setView('import');
          setSidebarOpen(false);
        }}
      />

      {/* Confirm new conversation dialog */}
      {confirmNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-zinc-900 mb-2">Nouvelle conversation ?</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed mb-5">
              La conversation en cours sera réinitialisée. Cette action est irréversible.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmNewOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { setConfirmNewOpen(false); handleReset(); }}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent relative lg:h-full overflow-visible lg:overflow-hidden min-h-[70vh] lg:min-h-0 lg:pb-0 pb-0">
        {/* Column Container */}
        <div className={`flex-1 w-full relative z-0 flex flex-col lg:h-full min-h-0 ${
          view === 'chat'
            ? "bg-transparent border-0 rounded-none shadow-none overflow-visible lg:overflow-hidden lg:bg-white lg:border lg:border-zinc-200 lg:rounded-2xl lg:shadow-sm min-h-[calc(100dvh-4rem)]"
            : "bg-white border border-zinc-200 rounded-2xl shadow-sm"
        }`}>

          {/* Column Header */}
          <div className="h-16 border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-white sticky top-0 z-20">
            <div className="flex items-center gap-3">
              {/* Back button — mobile only */}
              <button
                className="lg:hidden -ml-1 h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                onClick={() => router.push("/")}
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-70 transition-opacity outline-none group">
                  <h2 className="font-semibold text-[15px] text-zinc-900 tracking-tight leading-none">
                    {view === 'import' ? "Importer un Excel" : "Assistant de création"}
                  </h2>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-500 transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] bg-white border-zinc-200 p-1 shadow-xl">
                  <DropdownMenuItem
                    onClick={() => setView('chat')}
                    className="flex items-center justify-between px-3 py-2 text-zinc-600 focus:text-zinc-900 focus:bg-zinc-100 cursor-pointer rounded-md transition-colors"
                  >
                    <span className="text-sm font-medium">Assistant de création</span>
                    {view === 'chat' && <Check className="w-4 h-4 text-blue-600" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setView('import')}
                    className="flex items-center justify-between px-3 py-2 text-zinc-600 focus:text-zinc-900 focus:bg-zinc-100 cursor-pointer rounded-md transition-colors mt-0.5"
                  >
                    <span className="text-sm font-medium">Importer un Excel</span>
                    {view === 'import' && <Check className="w-4 h-4 text-emerald-600" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </div>

            {/* Burger menu — mobile only, right side, simple */}
            <button
              className="lg:hidden h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className={`flex-1 relative flex flex-col min-h-0 bg-[#f5f5f7] ${view === 'chat' ? "overflow-hidden" : "overflow-hidden"}`}>
            {isResetting && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-sm transition-all duration-300">
                <div className="flex items-center gap-3 text-[13px] text-zinc-500 bg-white px-4 py-3 rounded-xl border border-zinc-200 shadow-lg">
                  <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  Réinitialisation de la conversation…
                </div>
              </div>
            )}
            
            <AnimatePresence mode="wait" initial={false}>
              {view === 'import' ? (
                <motion.div
                  key="import"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex-1 flex flex-col min-h-0 h-full"
                >
                  <ExcelImportView onCancel={() => setView('chat')} />
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex-1 flex flex-col min-h-0 h-full"
                >
                  <ConversationalChat
                    state={state}
                    onSubmitAnswer={submitAnswer}
                    onGoBack={goBack}
                    onCreateProject={handleCreateProject}
                    onReset={handleReset}
                    onCancelLoading={cancelLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
