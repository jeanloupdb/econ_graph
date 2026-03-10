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
import {
  AlertCircle,
  Focus,
  Loader2,
  RefreshCw,
  Share2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useState } from "react";
import { useReactFlow } from "reactflow";

interface GraphNode {
  id: string;
  label: string;
  composite_id?: string;
  computation_error?: string;
}

export function BottomToolbar() {
  const developerMode = useUIStore((s) => s.developerMode);
  const setIsComputing = useUIStore((s) => s.setIsComputing);

  const { graphTheme, toggleGraphTheme, isLightMode } = useGraphTheme();
  const [showShareModal, setShowShareModal] = useState(false);

  const canEdit = useProjectStore((s) => s.canEdit)();
  const currentRole = useProjectStore((s) => s.getCurrentRole)();

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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 backdrop-blur-xl border rounded-2xl",
            isLightMode
              ? "bg-white border-zinc-200 shadow-sm"
              : "bg-zinc-900/95 border-white/[0.08] shadow-2xl"
          )}
        >

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
                isLightMode ? "bg-zinc-200" : "bg-white/[0.08]"
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
