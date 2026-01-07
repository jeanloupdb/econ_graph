"use client";

import { ShareProjectModal } from "@/components/modals/ShareProjectModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useComputeAll, useComputeWithScenario } from "@/lib/api/hooks";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Focus,
  Loader2,
  Moon,
  RefreshCw,
  Share2,
  Sparkles,
  Sun,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useReactFlow } from "reactflow";

interface GraphNode {
  id: string;
  label: string;
  composite_id?: string;
  computation_error?: string;
}

export function BottomToolbar() {
  const developerMode = useUIStore((s) => s.developerMode);
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);
  const setIsComputing = useUIStore((s) => s.setIsComputing);
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const uiMode = useUIStore((s) => s.mode);
  const setMode = useUIStore((s) => s.setMode);

  const { graphTheme, toggleGraphTheme, isLightMode } = useGraphTheme();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAiOnboarding, setShowAiOnboarding] = useState(false);
  const aiAssistantOpen = useUIStore((s) => s.aiAssistantOpen);

  const canEdit = useProjectStore((s) => s.canEdit)();
  const canShare = useProjectStore((s) => s.canShare)();
  const currentRole = useProjectStore((s) => s.getCurrentRole)();

  useEffect(() => {
    const timer = setTimeout(() => setShowAiOnboarding(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (aiAssistantOpen) {
      setShowAiOnboarding(false);
    }
  }, [aiAssistantOpen]);

  const dismissOnboarding = () => {
    setShowAiOnboarding(false);
  };

  const { nodes } = useGraphData();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setScenarioComputedValues = useScenarioStore(
    (s) => s.setScenarioComputedValues
  );
  const clearScenarioComputedValues = useScenarioStore(
    (s) => s.clearScenarioComputedValues
  );

  const computeAll = useComputeAll();
  const computeWithScenario = useComputeWithScenario();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const hasSelection = selectedNodeIds.length > 0;
  const errorCount = nodes.filter(
    (n) => (n as GraphNode).computation_error
  ).length;

  const handleComputeAll = async () => {
    try {
      setIsComputing(true);
      if (activeScenarioId) {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: activeScenarioId,
        });
        setScenarioComputedValues(activeScenarioId, result.results);
      } else {
        await computeAll.mutateAsync();
        clearScenarioComputedValues();
      }
    } catch (error) {
      console.error("❌ Computation failed:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const handleAiClick = () => {
    if (hasSelection) {
      setMode("ai-select");
    }
    setAiAssistantOpen(true);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 backdrop-blur-xl border rounded-2xl",
            isLightMode
              ? "bg-white/90 border-zinc-400 shadow-lg"
              : "bg-zinc-900/95 border-white/[0.08] shadow-2xl"
          )}
        >
          {/* AI Button - only show if user can edit AND in developer mode */}
          {developerMode && canEdit && (
            <>
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        dismissOnboarding();
                        handleAiClick();
                      }}
                      className={cn(
                        "relative flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border",
                        "bg-gradient-to-r from-blue-500/20 to-purple-500/20",
                        "hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200",
                        showAiOnboarding &&
                          "ring-2 ring-purple-500 ring-offset-2",
                        isLightMode
                          ? "border-blue-300 text-zinc-900"
                          : "border-white/[0.08] text-zinc-100"
                      )}
                    >
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span>AI</span>
                      {hasSelection && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 text-[10px] font-bold">
                          {selectedNodeIds.length}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {hasSelection
                      ? `Agir sur ${selectedNodeIds.length} nœud${
                          selectedNodeIds.length > 1 ? "s" : ""
                        } sélectionné${selectedNodeIds.length > 1 ? "s" : ""}`
                      : "Assistant IA"}
                  </TooltipContent>
                </Tooltip>

                {/* AI Onboarding Tooltip */}
                <AnimatePresence>
                  {showAiOnboarding && !aiAssistantOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72"
                    >
                      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />

                        <div className="relative">
                          <p className="text-sm font-medium text-zinc-200 mb-3">
                            L&apos;IA peut :
                          </p>
                          <ul className="text-sm text-zinc-300 space-y-2.5 mb-4">
                            <li className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                              Créer des nœuds
                            </li>
                            <li className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                              Modifier le graphe
                            </li>
                            <li className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                              Répondre à vos questions
                            </li>
                            <li className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              Générer des scénarios
                            </li>
                          </ul>

                          <button
                            onClick={dismissOnboarding}
                            className="w-full py-2 px-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-medium transition-colors"
                          >
                            Compris
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Separator */}
              <div
                className={cn(
                  "h-6 w-px mx-1",
                  isLightMode ? "bg-zinc-500" : "bg-white/[0.08]"
                )}
              />
            </>
          )}

          {/* View Controls */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => fitView({ padding: 0.2, duration: 200 })}
              tooltip="Recentrer"
              shortcut=""
              isLightMode={isLightMode}
            >
              <Focus className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => zoomIn({ duration: 200 })}
              tooltip="Zoom avant"
              shortcut="+"
              isLightMode={isLightMode}
            >
              <ZoomIn className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => zoomOut({ duration: 200 })}
              tooltip="Zoom arrière"
              shortcut="-"
              isLightMode={isLightMode}
            >
              <ZoomOut className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Separator */}
          {developerMode && canEdit && (
            <div
              className={cn(
                "h-6 w-px mx-1",
                isLightMode ? "bg-zinc-500" : "bg-white/[0.08]"
              )}
            />
          )}

          {/* Compute */}
          {developerMode && canEdit && (
            <ToolbarButton
              onClick={handleComputeAll}
              disabled={computeAll.isPending || computeWithScenario.isPending}
              tooltip="Recalculer tout"
              shortcut=""
              isLightMode={isLightMode}
            >
              {computeAll.isPending || computeWithScenario.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </ToolbarButton>
          )}

          {/* Error indicator */}
          {errorCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 h-10 px-3 rounded-xl border transition-colors text-xs font-medium",
                    isLightMode
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  )}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>{errorCount}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {errorCount} erreur{errorCount > 1 ? "s" : ""} de calcul
              </TooltipContent>
            </Tooltip>
          )}

          {/* Separator */}
          <div
            className={cn(
              "h-6 w-px mx-1",
              isLightMode ? "bg-zinc-500" : "bg-white/[0.08]"
            )}
          />

          {/* Theme toggle */}
          <ToolbarButton
            onClick={toggleGraphTheme}
            tooltip={graphTheme === "dark" ? "Mode clair" : "Mode sombre"}
            isLightMode={isLightMode}
          >
            {graphTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </ToolbarButton>

          {/* Share button */}
          {currentRole !== "public" && (
            <ToolbarButton
              onClick={() => setShowShareModal(true)}
              tooltip="Partager le projet"
              isLightMode={isLightMode}
            >
              <Share2 className="h-4 w-4" />
            </ToolbarButton>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && currentProjectId && (
        <ShareProjectModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          projectId={currentProjectId}
          projectName={currentProject?.name || "Projet"}
        />
      )}
    </TooltipProvider>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  tooltip,
  shortcut,
  children,
  isLightMode,
}: {
  onClick: () => void;
  disabled?: boolean;
  tooltip: string;
  shortcut?: string;
  children: React.ReactNode;
  isLightMode: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
            isLightMode
              ? "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <span>{tooltip}</span>
        {shortcut && (
          <kbd
            className={cn(
              "ml-1.5 px-1 py-0.5 rounded text-[10px] font-mono",
              isLightMode ? "bg-zinc-200" : "bg-white/10"
            )}
          >
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
