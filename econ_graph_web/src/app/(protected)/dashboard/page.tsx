"use client";

import { AiCreationOverlay } from "@/components/agent/AiCreationOverlay";
import { DashboardSidebar } from "@/components/chrome/DashboardSidebar";
import { ConversationalChat } from "@/components/dashboard/ConversationalChat";
import { ExcelImportSessionView } from "@/components/dashboard/ExcelImportSessionView";
import { ProfileOnboarding } from "@/components/dashboard/ProfileOnboarding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  // Claim demo project if user just signed up after a landing page demo
  useEffect(() => {
    if (typeof window === "undefined") return;
    const demoToken = localStorage.getItem("sg_demo_token");
    if (!demoToken) return;
    localStorage.removeItem("sg_demo_token");

    (async () => {
      try {
        const { claimDemoProject } = await import("@/lib/api/demo");
        const { project_id } = await claimDemoProject(demoToken);
        // Refresh project list and navigate to the claimed project
        await load();
        router.push(`/graph?projectId=${project_id}`);
      } catch {
        // Project already claimed or doesn't exist — ignore
      }
    })();
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

  useEffect(() => {
    const requestedView = searchParams?.get('view');
    if (requestedView === 'import') {
      setView('import');
      return;
    }
    if (requestedView === 'chat') {
      setView('chat');
    }
  }, [searchParams]);

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
    <div className="min-h-screen h-[100dvh] lg:h-screen text-zinc-900 flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-violet-500/20 p-0 lg:p-3 gap-0 lg:gap-3 bg-zinc-100">
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
      <Dialog open={confirmNewOpen} onOpenChange={setConfirmNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation ?</DialogTitle>
            <DialogDescription>
              La conversation en cours sera réinitialisée. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setConfirmNewOpen(false)}
              className="px-4 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => { setConfirmNewOpen(false); handleReset(); }}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition-colors"
            >
              Réinitialiser
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent relative lg:h-full overflow-visible lg:overflow-hidden min-h-[70vh] lg:min-h-0 lg:pb-0 pb-0">
        {/* Column Container */}
        <div className={`flex-1 w-full relative z-0 flex flex-col lg:h-full min-h-0 ${
          view === 'chat'
            ? "bg-transparent border-0 rounded-none overflow-visible lg:overflow-hidden lg:bg-white lg:border lg:border-zinc-200 lg:rounded-xl min-h-[calc(100dvh-4rem)]"
            : "bg-white border border-zinc-200 rounded-xl"
        }`}>

          {/* Column Header */}
          <div className="h-12 border-b border-zinc-200 flex items-center justify-between px-5 shrink-0 bg-zinc-50 sticky top-0 z-20">
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
                    <span className="font-mono font-bold text-violet-500 text-sm leading-none select-none">›</span>
                    <h2 className="font-mono font-semibold text-[13px] text-zinc-800 tracking-tight leading-none uppercase">
                      {view === 'import' ? "Importer un Excel" : "Assistant de création"}
                    </h2>
                    <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-zinc-500 transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] bg-white border-zinc-200 p-1 shadow-xl rounded-xl">
                  <DropdownMenuItem
                    onClick={() => setView('chat')}
                    className="flex items-center justify-between px-3 py-2 text-zinc-500 focus:text-zinc-900 focus:bg-zinc-50 cursor-pointer rounded-lg transition-colors"
                  >
                    <span className="text-[13px] font-medium">Assistant de création</span>
                    {view === 'chat' && <Check className="w-3.5 h-3.5 text-violet-500" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setView('import')}
                    className="flex items-center justify-between px-3 py-2 text-zinc-500 focus:text-zinc-900 focus:bg-zinc-50 cursor-pointer rounded-lg transition-colors mt-0.5"
                  >
                    <span className="text-[13px] font-medium">Importer un Excel</span>
                    {view === 'import' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
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

          <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden bg-white">
            {isResetting && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/90 backdrop-blur-sm transition-all duration-300">
                <div className="flex items-center gap-3 text-[13px] text-zinc-500 bg-white px-4 py-3 rounded-xl border border-zinc-200">
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
                  <ExcelImportSessionView onCancel={() => setView('chat')} />
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
