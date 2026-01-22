/**
 * ProjectHistoryDropdown - Historique des projets dans la topbar
 *
 * Affiche la liste des projets existants de manière discrète.
 * Jamais imposé à l'entrée, toujours secondaire à l'action.
 *
 * Conforme à refonte.md section "Historique des projets"
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  FolderOpen,
  ChevronDown,
  Search,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  public_view_token?: string;
}

interface ProjectHistoryDropdownProps {
  projects: Project[];
}

export function ProjectHistoryDropdown({
  projects,
}: ProjectHistoryDropdownProps) {
  const router = useRouter();
  const { setCurrentProject } = useProjectStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenProject = (projectId: string) => {
    setCurrentProject(projectId);
    router.push("/graph");
    setOpen(false);
  };

  if (projects.length === 0) {
    return null; // Masquer complètement si aucun projet
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900"
        >
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Historique</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 bg-zinc-900 border-zinc-800"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-zinc-500" />
            <h3 className="text-sm font-medium text-zinc-300">
              Mes projets
            </h3>
          </div>

          {/* Search */}
          {projects.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 bg-zinc-950 border-zinc-800 text-sm"
              />
            </div>
          )}
        </div>

        {/* Projects list */}
        <div className="max-h-[400px] overflow-y-auto py-1">
          {filteredProjects.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-zinc-500">
              Aucun projet trouvé
            </div>
          ) : (
            filteredProjects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleOpenProject(project.id)}
                className="cursor-pointer px-3 py-2.5 hover:bg-zinc-800"
              >
                <div className="flex items-start gap-3 w-full">
                  <FileText className="h-4 w-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-zinc-200 truncate">
                      {project.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Modifié {formatDate(project.updatedAt)}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-3 py-2">
          <button
            onClick={() => {
              router.push("/dashboard/projects");
              setOpen(false);
            }}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
          >
            Voir tous les projets →
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Formatte une date relative (ex: "il y a 2 jours")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}
