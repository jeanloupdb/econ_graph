"use client";

import { AiCreationOverlay } from '@/components/agent/AiCreationOverlay';
import { AiAssistantModal } from '@/components/ai/AiAssistantModal';
import { ProtectedTopbar } from '@/components/chrome/ProtectedTopbar';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { ProjectRow } from '@/components/dashboard/ProjectRow';
import { SubtleBackground } from '@/components/ui/SubtleBackground';
import { startAgentProjectCreation, useAgentStream } from '@/hooks/useAgentStream';
import { apiClient } from '@/lib/api/client';
import { useAgentStore } from '@/store/agentState';
import { AnimatePresence, motion } from "framer-motion";

// ... imports
import { AiMagicBar } from '@/components/dashboard/AiMagicBar';
import { ShareProjectModal } from '@/components/modals/ShareProjectModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/store/projectState';
import {
  Layers,
  LayoutGrid,
  LayoutList,
  Network,
  PlusCircle,
  Search,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type ViewMode = 'list' | 'grid';

// Helper to fetch project with retries - use /projects and filter by ID
async function fetchProjectWithRetry(projectId: string, attempts = 3, delay = 500): Promise<any> {
  for (let i = 0; i < attempts; i++) {
    try {
      const projects = await apiClient.get<any[]>('/projects');
      const project = projects?.find(p => p.id === projectId);
      if (project) return project;
      console.warn(`[Dashboard] Attempt ${i + 1}: project ${projectId} not found in list yet`);
    } catch (e) {
      console.warn(`[Dashboard] Attempt ${i + 1} failed to fetch projects`, e);
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, delay));
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, load, createProject, setCurrentProject, renameProject, deleteProject, addProject } = useProjectStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [editOpen, setEditOpen] = useState<null | { id: string; name: string }>(null);
  const [name, setName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState<null | { id: string; name: string }>(null);
  const [shareOpen, setShareOpen] = useState<null | { id: string; name: string; token?: string }>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());


  // Agent multi-agent state
  const { currentTask, startTask, clearTask, isAgentRunning } = useAgentStore();
  const [agentTaskId, setAgentTaskId] = useState<string | null>(null);

  // Connect to SSE stream
  useAgentStream(agentTaskId, {
    onComplete: async (projectId, error) => {
      if (projectId) {
        console.log('[Dashboard] ⏱️ Agent completed, starting fetch...');
        const fetchStart = Date.now();

        try {
          // Fetch the new project immediately - overlay stays visible during this
          const newProject = await fetchProjectWithRetry(projectId, 5, 500);
          console.log('[Dashboard] ⏱️ Fetch completed in', Date.now() - fetchStart, 'ms');

          if (newProject) {
            const addStart = Date.now();

            // Add the project to the store FIRST
            addProject({
              id: newProject.id,
              name: newProject.name,
              createdAt: newProject.created_at,
              updatedAt: newProject.updated_at,
              public_view_token: newProject.public_view_token,
            });
            console.log('[Dashboard] ⏱️ addProject called in', Date.now() - addStart, 'ms');

            // Mark it as just created AFTER adding
            setJustCreatedId(projectId);
            console.log('[Dashboard] ⏱️ setJustCreatedId called');

            // Wait for React to render the new project at its final position
            // Then close the overlay - this ensures no layout shift
            setTimeout(() => {
              console.log('[Dashboard] ⏱️ Clearing overlay...');
              clearTask();
              setAgentTaskId(null);
            }, 100);

            // Clear the victory animation after 3 seconds
            setTimeout(() => {
              setJustCreatedId(null);
            }, 3500);
          } else {
            // If fetch failed, fall back to full reload
            console.warn('[Dashboard] Failed to fetch project after retries, reloading list');
            await load();
            clearTask();
            setAgentTaskId(null);
          }
        } catch (e) {
          console.error('[Dashboard] Error updating state:', e);
          await load();
          clearTask();
          setAgentTaskId(null);
        }
      } else {
        console.error('[Dashboard] Project creation failed:', error);
        clearTask();
        setAgentTaskId(null);
      }
    }
  });

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!createOpen) setName(''); }, [createOpen]);
  useEffect(() => { if (!editOpen) setName(''); }, [editOpen]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const p = await createProject(name.trim());
    setCreateOpen(false);
    setCurrentProject(p.id);
    router.push('/graph');
  };

  const handleRename = () => {
    if (!editOpen) return;
    if (!name.trim()) return;
    renameProject(editOpen.id, name.trim());
    setEditOpen(null);
  };

  const handleAiGenerate = async (prompt: string, file?: File) => {
    try {
      // Utiliser le mode agent multi-agents
      const taskId = await startAgentProjectCreation(prompt, file);
      startTask(taskId);
      setAgentTaskId(taskId);
    } catch (e) {
      console.error('[Dashboard] Failed to start agent:', e);
    }
  };

  const filteredProjects = useMemo(() => {
    console.log('[Dashboard] 🔄 filteredProjects recalculating, projects.length:', projects.length);

    let list = projects.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // If the agent just created a project and is still showing it (morphed),
    // remove it from the main list to avoid duplication
    if (isAgentRunning && currentTask?.status === 'success' && currentTask.projectId) {
      list = list.filter(p => p.id !== currentTask.projectId);
    }

    console.log('[Dashboard] 🔄 filteredProjects result, list.length:', list.length, 'isAgentRunning:', isAgentRunning);

    return list;
  }, [projects, searchQuery, isAgentRunning, currentTask]);

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
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProjects.size === 0) return;
    if (!confirm(`Supprimer ${selectedProjects.size} projet(s) ?`)) return;

    for (const projectId of selectedProjects) {
      deleteProject(projectId);
    }
    setSelectedProjects(new Set());
  };

  return (
    <div className="min-h-screen font-sans relative">
      <SubtleBackground variant="blue" />

      {/* Global AI Creation Overlay */}
      <AiCreationOverlay
        isVisible={isAgentRunning}
        logs={currentTask?.logs || []}
        status={currentTask?.status || 'initializing'}
        currentStep={currentTask?.currentStep}
      />

      <div className="relative z-10">
        <ProtectedTopbar />

        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-48 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 relative">
          {/* Gradient accent */}
          <div className="absolute left-0 -bottom-px h-0.5 w-24 bg-gradient-to-r from-blue-500 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 ring-1 ring-blue-200 dark:ring-blue-800">
              <Network className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Projets</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Gérez vos modèles économiques
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selection Actions */}
            <AnimatePresence>
              {selectedProjects.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                >
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {selectedProjects.size} sélectionné{selectedProjects.size > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Supprimer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => setSelectedProjects(new Set())}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* View Toggle */}
            <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm transition-colors ${
                  viewMode === 'list'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/composites')}
            >
              <Layers className="h-4 w-4 mr-1.5 text-amber-600" />
              Bibliothèque
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Nouveau
            </Button>
          </div>
        </div>

        {/* AI Bar */}
        <AiMagicBar onGenerate={handleAiGenerate} isPending={isAgentRunning} />




        {/* Empty State */}
        {filteredProjects.length === 0 && !isAgentRunning && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 py-16 px-6">
            {searchQuery ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 mb-4">
                  <Search className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  Aucun résultat
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Aucun projet ne correspond à &quot;{searchQuery}&quot;
                </p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  Aucun projet
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-6">
                  Créez votre premier projet avec l&apos;IA ou manuellement
                </p>
                <div className="flex items-center gap-3">
                  <Button onClick={() => document.querySelector<HTMLInputElement>('.ai-input-field')?.focus()}>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Créer avec l&apos;IA
                  </Button>
                  <Button variant="outline" onClick={() => setCreateOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-1.5" />
                    Projet vierge
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Projects View */}
        {filteredProjects.length > 0 && (
          <>
            {viewMode === 'list' ? (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={selectedProjects.size === filteredProjects.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 px-4 py-3">
                        Nom
                      </th>
                      <th className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 px-4 py-3">
                        Nœuds
                      </th>
                      <th className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 px-4 py-3">
                        Connexions
                      </th>
                      <th className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 px-4 py-3">
                        Modifié
                      </th>
                      <th className="w-32"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {/* No Agent Row during loading - only show projects */}
                    {filteredProjects.map((project, index) => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        index={index}
                        isSelected={selectedProjects.has(project.id)}
                        onToggleSelect={() => toggleProjectSelection(project.id)}
                        onOpen={() => {
                          setCurrentProject(project.id);
                          router.push('/graph');
                        }}
                        onRename={() => {
                          setName(project.name);
                          setEditOpen({ id: project.id, name: project.name });
                        }}
                        onDelete={() => setDeleteOpen({ id: project.id, name: project.name })}
                        onShare={() => {
                          setShareOpen({ id: project.id, name: project.name, token: project.public_view_token || undefined });
                        }}
                        layoutId={`project-row-${project.id}`}
                        isJustCreated={project.id === justCreatedId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* No Agent Card during loading - only show projects */}
                {filteredProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    isSelected={selectedProjects.has(project.id)}
                    onToggleSelect={() => toggleProjectSelection(project.id)}
                    onOpen={() => {
                      setCurrentProject(project.id);
                      router.push('/graph');
                    }}
                    onRename={() => {
                      setName(project.name);
                      setEditOpen({ id: project.id, name: project.name });
                    }}
                    onDelete={() => setDeleteOpen({ id: project.id, name: project.name })}
                    onShare={() => {
                      setShareOpen({ id: project.id, name: project.name, token: project.public_view_token || undefined });
                    }}
                    isJustCreated={project.id === justCreatedId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      </div>

      {/* Dialogs */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nom</label>
            <Input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Mon modèle économique"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleCreate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editOpen} onOpenChange={(open) => setEditOpen(open ? editOpen : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer le projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nom</label>
            <Input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(null)}>Annuler</Button>
            <Button onClick={handleRename} disabled={!name.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteOpen} onOpenChange={(open) => setDeleteOpen(open ? deleteOpen : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le projet</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 py-4">
            Voulez-vous vraiment supprimer <strong className="text-zinc-900 dark:text-white">"{deleteOpen?.name}"</strong> ?
            Tous les nœuds et connexions seront supprimés.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteOpen) {
                  deleteProject(deleteOpen.id);
                  setDeleteOpen(null);
                }
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {shareOpen && (
        <ShareProjectModal
          open={!!shareOpen}
          onClose={() => setShareOpen(null)}
          projectId={shareOpen.id}
          projectName={shareOpen.name}
        />
      )}

      <AiAssistantModal
        open={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
      />
    </div>
  );
}


