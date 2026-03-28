"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/graph/NotificationBell";
import { useScenarios } from "@/lib/api/hooks";
import { downloadFile } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { BarChart2, ChevronDown, Columns3, FileSpreadsheet, Loader2, Network, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
import { UserMenu } from "./UserMenu";

export function TopbarMinimal() {
  const [isExporting, setIsExporting] = useState(false);

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentRole = useProjectStore((s) => s.getCurrentRole)();

  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  const workspaceView = useUIStore((s) => s.workspaceView);
  const setWorkspaceView = useUIStore((s) => s.setWorkspaceView);
  const columnViewMode = useUIStore((s) => s.columnViewMode);
  const setColumnViewMode = useUIStore((s) => s.setColumnViewMode);
  const isAiOpen = useUIStore((s) => s.aiAssistantOpen);
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

  return (
    <div className="h-12 grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-5 shrink-0 relative z-30 bg-background">

      {/* ── Left: logo + breadcrumb ──────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href="/dashboard" className="shrink-0 opacity-90 hover:opacity-100 transition-opacity">
          <SmartGraphLogo size={20} />
        </Link>

        <div className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
          >
            Projets
          </Link>
          <span className="text-border/50 select-none shrink-0">/</span>

          {/* Mode icon + project name + chevron dropdown (shadcn DropdownMenu) */}
          {currentProjectId ? (
            <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 min-w-0 rounded-md px-1.5 py-0.5 hover:bg-accent transition-colors duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {workspaceView === "causal" ? (
                    <Columns3 className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  ) : (
                    <Network className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                  <span className="truncate font-medium text-foreground max-w-[260px]">
                    {currentProject?.name || "Projet"}
                  </span>
                  <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground transition-transform duration-150" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="w-40">
                <DropdownMenuItem
                  onClick={() => setWorkspaceView("causal")}
                  className={cn(
                    "gap-2.5",
                    workspaceView === "causal" && "bg-accent text-foreground"
                  )}
                >
                  <Columns3 className="w-3.5 h-3.5 shrink-0" />
                  Colonnes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWorkspaceView("graph")}
                  className={cn(
                    "gap-2.5",
                    workspaceView === "graph" && "bg-accent text-foreground"
                  )}
                >
                  <Network className="w-3.5 h-3.5 shrink-0" />
                  Graphe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Scenario selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/50 hover:bg-accent transition-colors outline-none shrink-0 text-xs">
                  <span className="text-muted-foreground font-medium shrink-0">Scénario</span>
                  <span className="text-border/60 shrink-0">:</span>
                  <span className={cn(
                    "truncate max-w-[120px] font-medium",
                    activeScenarioId ? "text-blue-600" : "text-foreground"
                  )}>
                    {activeScenario?.name ?? "Valeurs de base"}
                  </span>
                  <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="w-48">
                <DropdownMenuItem
                  onClick={() => setActiveScenario(null)}
                  className={cn("gap-2.5", !activeScenarioId && "bg-accent text-foreground")}
                >
                  Valeurs de base
                </DropdownMenuItem>
                {scenarios.length > 0 && <DropdownMenuSeparator />}
                {scenarios.map((sc) => (
                  <DropdownMenuItem
                    key={sc.id}
                    onClick={() => setActiveScenario(sc.id)}
                    className={cn("gap-2.5", activeScenarioId === sc.id && "bg-accent text-foreground")}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                    <span className="truncate">{sc.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <span className="truncate font-medium text-foreground">Projet</span>
          )}
        </div>
      </div>

      {/* ── Center: empty ───────────────────────────────────────────────── */}
      <div />

      {/* ── Right: AI search bar + bell + avatar ────────────────────────── */}
      <div className="flex items-center gap-1.5 justify-end">

        {/* AI search-bar button */}
        {currentProjectId && currentRole !== "public" && (
          <button
            onClick={() => setAiAssistantOpen(!isAiOpen)}
            className={cn(
              "group relative flex items-center gap-2 h-8 rounded-full text-[13px] font-medium overflow-hidden outline-none",
              "px-3.5 md:px-4 transition-all duration-200",
              "hover:scale-[1.02] active:scale-[0.98]",
              isAiOpen
                ? "text-white shadow-[0_2px_16px_rgba(109,40,217,0.55)]"
                : "text-white shadow-[0_2px_10px_rgba(109,40,217,0.35)] hover:shadow-[0_2px_18px_rgba(109,40,217,0.55)]"
            )}
            style={{ background: "linear-gradient(110deg, #7c3aed 0%, #6366f1 50%, #4f46e5 100%)" }}
          >
            {/* shimmer sweep */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <Search className="w-3 h-3 shrink-0 opacity-80" />
            <span className="hidden md:inline whitespace-nowrap">
              {isAiOpen ? "Assistant IA" : "Demander à l'IA..."}
            </span>
            <span className="md:hidden">IA</span>
          </button>
        )}

        {/* Excel export button */}
        {currentProjectId && currentRole !== "public" && (
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-all duration-150 active:scale-[0.97] bg-zinc-900 text-white hover:bg-zinc-700 shadow-sm disabled:opacity-50"
          >
            {isExporting
              ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
              : <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            }
            <span className="hidden sm:inline">Excel</span>
          </button>
        )}

        {/* Stats button */}
        {currentProjectId && workspaceView === "causal" && (
          <button
            onClick={() => setColumnViewMode(columnViewMode === "insights" ? "details" : "insights")}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-all duration-150 active:scale-[0.97]",
              columnViewMode === "insights"
                ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                : "bg-zinc-900 text-white hover:bg-zinc-700 shadow-sm"
            )}
          >
            <BarChart2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Stats</span>
          </button>
        )}

        {/* Notification bell */}
        <div className="hidden md:block">
          <NotificationBell topbarMode />
        </div>
        <div className="md:hidden">
          <NotificationBell dropDown />
        </div>

        {/* Separator */}
        <div className="hidden md:block w-px h-5 bg-border/40 mx-0.5" />

        {/* User menu */}
        <div className="md:hidden">
          <UserMenu compact onExportExcel={currentRole !== "public" && currentProjectId ? handleExportExcel : undefined} />
        </div>
        <div className="hidden md:block">
          <UserMenu onExportExcel={currentRole !== "public" && currentProjectId ? handleExportExcel : undefined} />
        </div>
      </div>
    </div>
  );
}
