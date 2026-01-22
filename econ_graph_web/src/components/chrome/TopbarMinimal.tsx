"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Network,
  Search,
} from "lucide-react";
import Link from "next/link";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
import { UserMenu } from "./UserMenu";

export function TopbarMinimal() {
  const { isLightMode } = useGraphTheme();

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const workspaceView = useUIStore((s) => s.workspaceView);
  const setWorkspaceView = useUIStore((s) => s.setWorkspaceView);
  const aiAssistantOpen = useUIStore((s) => s.aiAssistantOpen);
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);
  const currentRole = useProjectStore((s) => s.getCurrentRole)();

  return (
    <div
      className={cn(
        "h-16 flex items-center justify-between px-6 shrink-0 relative z-30",
        workspaceView === 'causal'
          ? "bg-transparent border-b-0"
          : isLightMode
            ? "bg-zinc-300 border-b border-zinc-500"
            : "bg-[#0a0a0b] border-b border-white/[0.06]"
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Back Button with Logo - hidden for public users */}
        {currentRole !== "public" ? (
          <Link
            href="/dashboard"
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors",
              isLightMode
                ? "text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
            )}
            title="Retour au tableau de bord"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            <SmartGraphLogo size={28} />
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <SmartGraphLogo size={28} />
          </div>
        )}

        {/* Project Title */}
        <h1
          className={cn(
            "text-base font-medium flex items-center gap-2 min-w-0",
            isLightMode ? "text-zinc-900" : "text-zinc-100"
          )}
        >
          <span className="truncate max-w-[240px]">
            {currentProject?.name || "Projet"}
          </span>
        </h1>
      </div>

      {/* Center - AI Search Bar */}
      <div className="flex-1 flex justify-center px-8">
        {currentRole !== "public" && (
          <button
            onClick={() => setAiAssistantOpen(!aiAssistantOpen)}
            className={cn(
              "group flex items-center gap-3 w-full max-w-xl h-11 px-5 rounded-2xl text-sm transition-all duration-300",
              aiAssistantOpen
                ? isLightMode
                  ? "bg-violet-100/80 border border-violet-200 text-violet-900 hover:bg-violet-100"
                  : "bg-violet-500/10 border border-violet-500/20 text-violet-100 hover:bg-violet-500/20"
                : isLightMode
                  ? "bg-white/80 backdrop-blur-sm border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md hover:bg-white"
                  : "bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/80"
            )}
          >
            {aiAssistantOpen ? (
               <Network className={cn(
                "h-4 w-4 shrink-0 transition-colors duration-200",
                isLightMode ? "text-violet-600" : "text-violet-400"
               )} />
            ) : (
              <Search className={cn(
                "h-4 w-4 shrink-0 transition-colors duration-200",
                isLightMode
                  ? "text-zinc-400 group-hover:text-zinc-600"
                  : "text-zinc-500 group-hover:text-zinc-300"
              )} />
            )}
            
            <span className={cn(
              "flex-1 text-left transition-colors duration-200 font-medium",
              aiAssistantOpen
                ? isLightMode ? "text-violet-900" : "text-violet-100"
                : isLightMode
                  ? "text-zinc-400 group-hover:text-zinc-600 font-normal"
                  : "text-zinc-500 group-hover:text-zinc-300 font-normal"
            )}>
              {aiAssistantOpen ? "Fermer l'assistant" : "Demandez à l'IA..."}
            </span>
            <kbd className={cn(
              "hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors",
              aiAssistantOpen
                ? isLightMode
                  ? "bg-violet-200/50 text-violet-700"
                  : "bg-violet-500/20 text-violet-300"
                : isLightMode
                  ? "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200 group-hover:text-zinc-500"
                  : "bg-zinc-700/50 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-400"
            )}>
              {aiAssistantOpen ? "Échap" : "Smart Edit"}
            </kbd>
          </button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">

        {/* View Toggle Button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setWorkspaceView(workspaceView === 'causal' ? 'graph' : 'causal')}
                className={cn(
                  "group flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border transition-all duration-150",
                  isLightMode
                    ? "text-zinc-600 bg-zinc-200 border-zinc-300 hover:bg-zinc-300 hover:border-zinc-400"
                    : "text-zinc-300 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                )}
              >
                {workspaceView === 'causal' ? (
                  <>
                    <Network className="h-4 w-4" />
                    <span>Graphe</span>
                  </>
                ) : (
                  <>
                    <Columns3 className="h-4 w-4" />
                    <span>Colonnes</span>
                  </>
                )}
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5",
                  isLightMode ? "text-zinc-400" : "text-zinc-500"
                )} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-center">
              {workspaceView === 'causal' ? (
                <p className="text-xs">
                  <span className="font-medium">Vue Graphe</span>
                  <br />
                  <span className="text-zinc-400">Vue technique pour développeurs et profils avancés</span>
                </p>
              ) : (
                <p className="text-xs">
                  <span className="font-medium">Vue Colonnes</span>
                  <br />
                  <span className="text-zinc-400">Vue simplifiée par étapes causales</span>
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User Menu */}
        <UserMenu />
      </div>
    </div>
  );
}
