"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/graph/NotificationBell";
import { downloadFile } from "@/lib/api/client";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import {
    ArrowLeft,
    Columns3,
    Download,
    FileSpreadsheet,
    Loader2,
    Network,
    Pencil,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
import { UserMenu } from "./UserMenu";

export function TopbarMinimal() {
  const { isLightMode } = useGraphTheme();
  const [isExporting, setIsExporting] = useState(false);

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentRole = useProjectStore((s) => s.getCurrentRole)();

  const workspaceView = useUIStore((s) => s.workspaceView);
  const setWorkspaceView = useUIStore((s) => s.setWorkspaceView);
  const columnViewMode = useUIStore((s) => s.columnViewMode);
  const setColumnViewMode = useUIStore((s) => s.setColumnViewMode);
  const aiAssistantOpen = useUIStore((s) => s.aiAssistantOpen);
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);

  const handleExportExcel = async () => {
    if (!currentProjectId) { toast.error("Aucun projet sélectionné"); return; }
    setIsExporting(true);
    try {
      const projectName = currentProject?.name || "modele";
      const safeName = projectName.replace(/[^a-zA-Z0-9-_]/g, "_");
      await downloadFile(`/projects/${currentProjectId}/export/excel`, `${safeName}_SmartGraph.xlsx`);
      toast.success("Modèle exporté vers Excel !");
    } catch {
      toast.error("Échec de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  // Shared button style helpers
  const segmentActive = "bg-zinc-800 text-white";
  const segmentInactive = "bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700";

  return (
    <div
      className={cn(
        "h-14 flex items-center justify-between px-3 md:px-6 shrink-0 relative z-30",
        workspaceView === "causal"
          ? "bg-transparent border-b-0"
          : "bg-white border-b border-zinc-200"
      )}
    >
      {/* ── Left: logo + breadcrumb ───────────────────────────────────── */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          title="Retour aux projets"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <SmartGraphLogo size={22} />
        <div className="text-base font-medium flex items-center gap-1.5 md:gap-2 min-w-0">
          <Link
            href="/dashboard"
            className="hidden sm:inline text-sm uppercase tracking-wide hover:underline transition-colors shrink-0 text-zinc-400 hover:text-zinc-600"
            title="Retour aux projets"
          >
            Projets
          </Link>
          <span className="hidden sm:inline shrink-0 text-zinc-300">/</span>
          <span className="truncate max-w-[160px] md:max-w-[220px] text-sm text-zinc-800">
            {currentProject?.name || "Projet"}
          </span>
        </div>
      </div>

      {/* ── Right: controls ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 md:gap-2.5">

        {/* Insights / Détails toggle — visible only in causal mode, desktop */}
        {currentProjectId && workspaceView === "causal" && (
          <div className="hidden md:flex items-center gap-0 rounded-lg border border-zinc-200 overflow-hidden">
            {([
              { key: "insights" as const, Icon: Sparkles, label: "Insights", tooltip: "Vue insights IA" },
              { key: "details"  as const, Icon: Columns3, label: "Détails",  tooltip: "Vue 3 colonnes détaillée" },
            ]).map(({ key, Icon, label, tooltip }) => (
              <TooltipProvider key={key} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setColumnViewMode(key)}
                      className={cn(
                        "flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all duration-150 border-r border-zinc-200 last:border-r-0",
                        columnViewMode === key ? segmentActive : segmentInactive
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">{label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p className="text-xs">{tooltip}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* Export Excel — desktop */}
        {currentRole !== "public" && currentProjectId && (
          <div className="hidden md:block">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className={cn(
                      "group flex items-center gap-1.5 md:gap-2 h-9 px-2.5 md:px-3 rounded-lg text-sm font-medium border transition-all duration-150",
                      isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
                    )}
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    <span className="hidden md:inline">Excel</span>
                    <Download className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-y-0.5 hidden md:block text-emerald-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Exporter tout le modèle vers Excel</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Workspace toggle: Colonnes | Graphe — desktop */}
        {currentProjectId && (
          <div className="hidden md:flex items-center gap-0 rounded-lg border border-zinc-200 overflow-hidden">
            {([
              { key: "causal" as const, Icon: Columns3, label: "Colonnes", tooltip: "Vue colonnes causales" },
              { key: "graph"  as const, Icon: Network,  label: "Graphe",   tooltip: "Vue graphe technique" },
            ]).map(({ key, Icon, label, tooltip }) => (
              <TooltipProvider key={key} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setWorkspaceView(key)}
                      className={cn(
                        "flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all duration-150 border-r border-zinc-200 last:border-r-0",
                        workspaceView === key ? segmentActive : segmentInactive
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">{label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p className="text-xs">{tooltip}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* AI button — desktop */}
        {currentProjectId && currentRole !== "public" && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAiAssistantOpen(!aiAssistantOpen)}
                  className={cn(
                    "hidden md:flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-150",
                    aiAssistantOpen
                      ? "bg-zinc-800 border-zinc-600 text-white"
                      : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-700"
                  )}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Assistant IA</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Notification bell — desktop */}
        <div className="hidden md:block">
          <NotificationBell topbarMode />
        </div>

        {/* Mobile: notification bell */}
        <div className="md:hidden">
          <NotificationBell dropDown />
        </div>

        {/* User menu */}
        <div className="md:hidden">
          <UserMenu compact onExportExcel={currentRole !== "public" && currentProjectId ? handleExportExcel : undefined} />
        </div>
        <div className="hidden md:block">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
