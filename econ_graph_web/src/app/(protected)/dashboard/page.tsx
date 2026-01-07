"use client";

import { AiCreationOverlay } from "@/components/agent/AiCreationOverlay";
import { AiAssistantModal } from "@/components/ai/AiAssistantModal";
import { ProtectedTopbar } from "@/components/chrome/ProtectedTopbar";
import {
  BatchDeleteDialog,
  CreateProjectDialog,
  DeleteProjectDialog,
  RenameProjectDialog,
  ShareDialog,
} from "@/components/dashboard/DashboardDialogs";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { InlineAiBar } from "@/components/dashboard/InlineAiBar";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { ProjectRow } from "@/components/dashboard/ProjectRow";
import { ProjectsHeader } from "@/components/dashboard/ProjectsHeader";
import { Checkbox } from "@/components/ui/checkbox";
import {
  startAgentProjectCreation,
  useAgentStream,
} from "@/hooks/useAgentStream";
import { apiClient } from "@/lib/api/client";
import { useAgentStore } from "@/store/agentState";
import { useProjectStore } from "@/store/projectState";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "list" | "grid";

// Helper to fetch project with retries
async function fetchProjectWithRetry(
  projectId: string,
  attempts = 3,
  delay = 500
): Promise<any> {
  for (let i = 0; i < attempts; i++) {
    try {
      const projects = await apiClient.get<any[]>("/projects");
      const project = projects?.find((p) => p.id === projectId);
      if (project) return project;
    } catch (e) {
      console.warn(`[Dashboard] Attempt ${i + 1} failed to fetch projects`, e);
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    projects,
    load,
    createProject,
    setCurrentProject,
    renameProject,
    deleteProject,
    addProject,
  } = useProjectStore();

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<null | { id: string; name: string }>(
    null
  );
  const [deleteOpen, setDeleteOpen] = useState<null | {
    id: string;
    name: string;
  }>(null);
  const [shareOpen, setShareOpen] = useState<null | {
    id: string;
    name: string;
    token?: string;
  }>(null);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");

  // UI states
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set()
  );

  // Agent state
  const { currentTask, startTask, clearTask, isAgentRunning } = useAgentStore();
  const [agentTaskId, setAgentTaskId] = useState<string | null>(null);

  // Connect to SSE stream
  useAgentStream(agentTaskId, {
    onComplete: async (projectId, error) => {
      if (projectId) {
        try {
          const newProject = await fetchProjectWithRetry(projectId, 5, 500);
          if (newProject) {
            addProject({
              id: newProject.id,
              name: newProject.name,
              createdAt: newProject.created_at,
              updatedAt: newProject.updated_at,
              public_view_token: newProject.public_view_token,
            });
            setJustCreatedId(projectId);
            setTimeout(() => {
              clearTask();
              setAgentTaskId(null);
            }, 100);
            setTimeout(() => setJustCreatedId(null), 3500);
          } else {
            await load();
            clearTask();
            setAgentTaskId(null);
          }
        } catch (e) {
          console.error("[Dashboard] Error updating state:", e);
          await load();
          clearTask();
          setAgentTaskId(null);
        }
      } else {
        console.error("[Dashboard] Project creation failed:", error);
        clearTask();
        setAgentTaskId(null);
      }
    },
  });

  // Load projects on mount
  useEffect(() => {
    load();
  }, [load]);

  // Reset form on dialog close
  useEffect(() => {
    if (!createOpen && !editOpen) setName("");
  }, [createOpen, editOpen]);

  // Handlers
  const handleCreate = async () => {
    if (!name.trim()) return;
    const p = await createProject(name.trim());
    setCreateOpen(false);
    setCurrentProject(p.id);
    router.push("/graph");
  };

  const handleRename = () => {
    if (!editOpen || !name.trim()) return;
    renameProject(editOpen.id, name.trim());
    setEditOpen(null);
  };

  const handleAiGenerate = async (prompt: string, file?: File) => {
    try {
      const taskId = await startAgentProjectCreation(prompt, file);
      startTask(taskId);
      setAgentTaskId(taskId);
    } catch (e) {
      console.error("[Dashboard] Failed to start agent:", e);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProjects.size === 0) return;
    setBatchDeleteOpen(true);
  };

  const confirmBatchDelete = () => {
    for (const projectId of selectedProjects) {
      deleteProject(projectId);
    }
    setSelectedProjects(new Set());
    setBatchDeleteOpen(false);
  };

  const toggleProjectSelection = (projectId: string) => {
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map((p) => p.id)));
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    let list = projects.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (
      isAgentRunning &&
      currentTask?.status === "success" &&
      currentTask.projectId
    ) {
      list = list.filter((p) => p.id !== currentTask.projectId);
    }
    return list;
  }, [projects, searchQuery, isAgentRunning, currentTask]);

  const hasProjects = projects.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(255 255 255) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(255 255 255) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* AI Creation Overlay */}
      <AiCreationOverlay
        isVisible={isAgentRunning}
        logs={currentTask?.logs || []}
        status={currentTask?.status || "initializing"}
        currentStep={currentTask?.currentStep}
      />

      <div className="relative z-10">
        <ProtectedTopbar />

        <main className="w-full max-w-6xl mx-auto px-6 pt-6 pb-32">
          {/* EMPTY STATE */}
          {!hasProjects && !isAgentRunning && (
            <DashboardEmptyState
              onAiGenerate={handleAiGenerate}
              onCreateBlank={() => setCreateOpen(true)}
            />
          )}

          {/* HAS PROJECTS */}
          {hasProjects && (
            <div className="space-y-6">
              {/* Inline AI Bar - Integrated into page */}
              <InlineAiBar
                onGenerate={handleAiGenerate}
                isPending={isAgentRunning}
              />

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main content */}
                <div className="lg:col-span-3">
                  <ProjectsHeader
                    projectCount={projects.length}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    selectedCount={selectedProjects.size}
                    onDeleteSelected={handleDeleteSelected}
                    onClearSelection={() => setSelectedProjects(new Set())}
                    onCreateNew={() => setCreateOpen(true)}
                  />

                  {/* Search Empty */}
                  {filteredProjects.length === 0 && searchQuery && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-12 px-6">
                      <Search className="h-8 w-8 text-zinc-600 mb-3" />
                      <p className="text-sm text-zinc-500">
                        Aucun projet ne correspond à &quot;{searchQuery}&quot;
                      </p>
                    </div>
                  )}

                  {/* Projects Grid */}
                  {filteredProjects.length > 0 && viewMode === "grid" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProjects.map((project, index) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          index={index}
                          isSelected={selectedProjects.has(project.id)}
                          onToggleSelect={() =>
                            toggleProjectSelection(project.id)
                          }
                          onOpen={() => {
                            setCurrentProject(project.id);
                            router.push("/graph");
                          }}
                          onRename={() => {
                            setName(project.name);
                            setEditOpen({ id: project.id, name: project.name });
                          }}
                          onDelete={() =>
                            setDeleteOpen({
                              id: project.id,
                              name: project.name,
                            })
                          }
                          onShare={() =>
                            setShareOpen({
                              id: project.id,
                              name: project.name,
                              token: project.public_view_token || undefined,
                            })
                          }
                          isJustCreated={project.id === justCreatedId}
                        />
                      ))}
                    </div>
                  )}

                  {/* Projects List */}
                  {filteredProjects.length > 0 && viewMode === "list" && (
                    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="w-12 px-4 py-3">
                              <Checkbox
                                checked={
                                  selectedProjects.size ===
                                    filteredProjects.length &&
                                  filteredProjects.length > 0
                                }
                                onCheckedChange={toggleSelectAll}
                              />
                            </th>
                            <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">
                              Nom
                            </th>
                            <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">
                              Nœuds
                            </th>
                            <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">
                              Connexions
                            </th>
                            <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">
                              Modifié
                            </th>
                            <th className="w-32"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {filteredProjects.map((project, index) => (
                            <ProjectRow
                              key={project.id}
                              project={project}
                              index={index}
                              isSelected={selectedProjects.has(project.id)}
                              onToggleSelect={() =>
                                toggleProjectSelection(project.id)
                              }
                              onOpen={() => {
                                setCurrentProject(project.id);
                                router.push("/graph");
                              }}
                              onRename={() => {
                                setName(project.name);
                                setEditOpen({
                                  id: project.id,
                                  name: project.name,
                                });
                              }}
                              onDelete={() =>
                                setDeleteOpen({
                                  id: project.id,
                                  name: project.name,
                                })
                              }
                              onShare={() =>
                                setShareOpen({
                                  id: project.id,
                                  name: project.name,
                                  token: project.public_view_token || undefined,
                                })
                              }
                              layoutId={`project-row-${project.id}`}
                              isJustCreated={project.id === justCreatedId}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <DashboardSidebar
                  projectCount={projects.length}
                  onTemplateClick={handleAiGenerate}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Dialogs */}
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={name}
        onNameChange={setName}
        onSubmit={handleCreate}
      />

      <RenameProjectDialog
        open={!!editOpen}
        onOpenChange={(open) => setEditOpen(open ? editOpen : null)}
        name={name}
        onNameChange={setName}
        onSubmit={handleRename}
      />

      <DeleteProjectDialog
        open={!!deleteOpen}
        onOpenChange={(open) => setDeleteOpen(open ? deleteOpen : null)}
        projectName={deleteOpen?.name || ""}
        onConfirm={() => {
          if (deleteOpen) {
            deleteProject(deleteOpen.id);
            setDeleteOpen(null);
          }
        }}
      />

      <ShareDialog
        open={!!shareOpen}
        onClose={() => setShareOpen(null)}
        projectId={shareOpen?.id || ""}
        projectName={shareOpen?.name || ""}
      />

      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={selectedProjects.size}
        onConfirm={confirmBatchDelete}
      />

      <AiAssistantModal
        open={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
      />
    </div>
  );
}
