"use client";

import { CollapsibleModePanel } from "@/components/chrome/CollapsibleModePanel";
import { TopbarMinimal } from "@/components/chrome/TopbarMinimal";
import { CommandPalette } from "@/components/command/CommandPalette";
import { BottomToolbar } from "@/components/graph/BottomToolbar";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { Inspector } from "@/components/panels/Inspector";
import { ProjectGraphProvider } from "@/graph/providers/ProjectGraphProvider";
import { apiClient } from "@/lib/api/client";
import type { Edge, Node } from "@/lib/types";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { AlertCircle, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReactFlowProvider } from "reactflow";

interface PublicProjectData {
  project: {
    id: string;
    name: string;
    updated_at: string;
    user_role: "public";
  };
  nodes: Node[];
  edges: Edge[];
}

export default function PublicProjectPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PublicProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addProject = useProjectStore((s) => s.addProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const setDeveloperMode = useUIStore((s) => s.setDeveloperMode);
  const setLibraryPanelOpen = useUIStore((s) => s.setLibraryPanelOpen);

  useEffect(() => {
    if (!token) return;

    const loadPublicProject = async () => {
      try {
        const result = await apiClient.get<PublicProjectData>(
          `/viewer/${token}/full`
        );
        setData(result);

        // Add to project store as a public project
        const publicProject = {
          id: result.project.id,
          name: result.project.name,
          createdAt: result.project.updated_at,
          updatedAt: result.project.updated_at,
          public_view_token: token,
          user_role: "public" as const,
        };

        addProject(publicProject);
        setCurrentProject(result.project.id);

        // Force view mode and close library panel
        setDeveloperMode(false);
        setViewMode("baseline");
        setLibraryPanelOpen(false);
      } catch (err) {
        console.error(err);
        setError(
          "Impossible de charger le projet. Le lien est peut-être invalide ou expiré."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPublicProject();
  }, [
    token,
    addProject,
    setCurrentProject,
    setDeveloperMode,
    setViewMode,
    setLibraryPanelOpen,
  ]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p>{error || "Projet introuvable"}</p>
      </div>
    );
  }

  return (
    <ProjectGraphProvider initialNodes={data.nodes} initialEdges={data.edges}>
      <CommandPalette />

      <div className="flex h-screen flex-col bg-zinc-100 dark:bg-[#0a0a0b]">
        <TopbarMinimal />

        <div className="flex-1 relative overflow-hidden">
          <ReactFlowProvider>
            <GraphCanvas />
            <BottomToolbar />
            {/* No AI or Library for public users */}
          </ReactFlowProvider>

          <CollapsibleModePanel />

          {/* Inspector - overlay flottant à droite */}
          <FloatingInspectorWrapper />
        </div>
      </div>
    </ProjectGraphProvider>
  );
}

function FloatingInspectorWrapper() {
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);

  if (!inspectorOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 z-30 w-[320px] bg-white dark:bg-[#0a0a0b] border-l border-zinc-200 dark:border-white/[0.06] overflow-hidden">
      <Inspector />
    </div>
  );
}
