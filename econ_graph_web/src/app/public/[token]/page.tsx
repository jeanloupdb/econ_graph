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
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
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
  const setWorkspaceView = useUIStore((s) => s.setWorkspaceView);

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

        // Force causal column view and close library panel
        setDeveloperMode(false);
        setViewMode("baseline");
        setLibraryPanelOpen(false);
        setWorkspaceView("causal");
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
    setWorkspaceView,
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

  // Check if this is a demo project the user just generated
  const isDemoProject = typeof window !== "undefined" && localStorage.getItem("sg_demo_token") === token;

  return (
    <ProjectGraphProvider initialNodes={data.nodes} initialEdges={data.edges}>
      <CommandPalette />

      <div className="flex h-screen flex-col bg-zinc-100 dark:bg-[#0a0a0b]">
        <TopbarMinimal />

        {/* Demo claim banner */}
        {isDemoProject && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 flex items-center justify-center gap-3 shrink-0">
            <span className="text-white text-sm">
              Votre modèle est prêt ! Créez un compte pour le modifier et l&apos;exporter.
            </span>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-violet-700 font-medium text-sm rounded-lg hover:bg-violet-50 transition-colors"
            >
              Créer un compte <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

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
