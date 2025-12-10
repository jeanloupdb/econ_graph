'use client';

import { ProtectedTopbar } from '@/components/chrome/ProtectedTopbar';
import { SubtleBackground } from '@/components/ui/SubtleBackground';
import { AnimatePresence, motion } from 'framer-motion';

// ... imports
import { AiMagicBar } from '@/components/dashboard/AiMagicBar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAiGraphAction } from '@/graph/hooks/useAiGraphAction';
import { apiClient, APIClientError } from '@/lib/api/client';
import { queryKeys, useComposite, useComposites, useDeleteComposite } from '@/lib/api/hooks';
import type { CompositeSummary, CompositeUsageComposite, CompositeUsageProject } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/projectState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowRight,
    Box,
    Clock,
    GitBranch,
    Layers,
    LayoutGrid,
    LayoutList,
    Loader2,
    Network,
    Pencil,
    PlusCircle,
    Search,
    Sparkles,
    Trash2,
    X
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type ViewMode = 'list' | 'grid';

export default function CompositesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get('highlight');
  const { data: composites = [], isLoading } = useComposites();
  const deleteComposite = useDeleteComposite();
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCompositeName, setNewCompositeName] = useState('');
  const [renameTarget, setRenameTarget] = useState<null | { id: string; name: string }>(null);
  const [renameValue, setRenameValue] = useState('');
  const [flashHighlightId, setFlashHighlightId] = useState<string | null>(highlightId);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedComposites, setSelectedComposites] = useState<Set<string>>(new Set());
  const [usageDialog, setUsageDialog] = useState<null | {
    composite: CompositeSummary;
    projects: CompositeUsageProject[];
    composites: CompositeUsageComposite[];
  }>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const queryClient = useQueryClient();

  const { execute: executeAi, isPending: isAiPending } = useAiGraphAction();

  const renameComposite = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      apiClient.patch(`/composites/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.composites });
      setRenameTarget(null);
      setRenameValue('');
    },
  });

  const registerCardRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      cardRefs.current[id] = node;
    } else {
      delete cardRefs.current[id];
    }
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const target = cardRefs.current[highlightId];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setFlashHighlightId(highlightId);
    const flashTimer = window.setTimeout(() => {
      setFlashHighlightId(null);
    }, 2000);
    const replaceTimer = window.setTimeout(() => {
      router.replace('/composites', { scroll: false });
    }, 2100);
    return () => {
      window.clearTimeout(flashTimer);
      window.clearTimeout(replaceTimer);
    };
  }, [highlightId, composites.length, router]);

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<CompositeSummary | null>(null);

  const handleDeleteClick = (summary: CompositeSummary) => {
    setDeleteConfirm(summary);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    const summary = deleteConfirm;
    setDeletedIds(prev => new Set(prev).add(summary.id));
    setDeleteConfirm(null);

    try {
      await deleteComposite.mutateAsync(summary.id);
    } catch (error) {
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(summary.id);
        return next;
      });

      if (error instanceof APIClientError) {
        const detail = error.detail as
          | { projects?: CompositeUsageProject[]; composites?: CompositeUsageComposite[] }
          | string
          | null
          | undefined;
        if (detail && typeof detail === "object") {
          const hasProjects = Array.isArray((detail as any).projects) && (detail as any).projects.length > 0;
          const hasComposites = Array.isArray((detail as any).composites) && (detail as any).composites.length > 0;
          if (hasProjects || hasComposites) {
            setUsageDialog({
              composite: summary,
              projects: ((detail as any).projects as CompositeUsageProject[]) || [],
              composites: ((detail as any).composites as CompositeUsageComposite[]) || [],
            });
            return;
          }
        }
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce composite."
      );
    }
  };

  const handleCreateComposite = () => {
    const trimmed = newCompositeName.trim();
    if (!trimmed) return;
    setCreateDialogOpen(false);
    const encoded = encodeURIComponent(trimmed);
    setNewCompositeName('');
    router.push(`/composites/new?name=${encoded}`);
  };

  const handleRenameSave = () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renameComposite.mutate({ id: renameTarget.id, name: trimmed });
  };

  const handleOpenProjectFromDialog = useCallback(
    (projectId: string) => {
      setCurrentProject(projectId);
      setUsageDialog(null);
      router.push('/graph');
    },
    [router, setCurrentProject]
  );

  const handleAiGenerate = async (prompt: string) => {
    try {
      await executeAi(prompt, "new_composite", undefined, undefined, "project", [], [], () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.composites });
      });
    } catch (e) {
      console.error(e);
    }
  };

  const filteredComposites = useMemo(() => {
    return composites.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [composites, searchQuery]);

  const toggleCompositeSelection = (compositeId: string) => {
    const newSelection = new Set(selectedComposites);
    if (newSelection.has(compositeId)) {
      newSelection.delete(compositeId);
    } else {
      newSelection.add(compositeId);
    }
    setSelectedComposites(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedComposites.size === filteredComposites.length) {
      setSelectedComposites(new Set());
    } else {
      setSelectedComposites(new Set(filteredComposites.map(c => c.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedComposites.size === 0) return;
    if (!confirm(`Supprimer ${selectedComposites.size} composite(s) ?`)) return;

    for (const compositeId of selectedComposites) {
      deleteComposite.mutate(compositeId);
    }
    setSelectedComposites(new Set());
  };

  const COMPOSITE_PLACEHOLDERS = [
    "Décrivez votre module réutilisable...",
    "Ex: Calcul de marge brute...",
    "Ex: Simulateur d'emprunt..."
  ];

  return (
    <div className="min-h-screen font-sans relative">
      <SubtleBackground variant="amber" />
      <div className="relative z-10">
        <ProtectedTopbar backHref="/dashboard" backLabel="Projets" />

        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 relative">
          {/* Gradient accent */}
          <div className="absolute left-0 -bottom-px h-0.5 w-24 bg-gradient-to-r from-amber-500 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 ring-1 ring-amber-200 dark:ring-amber-800">
              <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Bibliothèque</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Composites réutilisables dans tous vos projets
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
              {selectedComposites.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                >
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {selectedComposites.size} sélectionné{selectedComposites.size > 1 ? 's' : ''}
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
                    onClick={() => setSelectedComposites(new Set())}
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
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => setCreateDialogOpen(true)}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Nouveau
            </Button>
          </div>
        </div>

        {/* AI Bar */}
        <AiMagicBar
          onGenerate={handleAiGenerate}
          isPending={isAiPending}
          placeholder={COMPOSITE_PLACEHOLDERS[0]}
        />

        {/* AI Loading State */}
        <AnimatePresence>
          {isAiPending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-4 rounded-lg border border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    Génération IA en cours...
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    L'assistant structure votre composite
                  </p>
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {filteredComposites.length === 0 && !isAiPending && !isLoading && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 mb-4">
              {searchQuery ? (
                <Search className="h-6 w-6 text-zinc-400" />
              ) : (
                <Layers className="h-6 w-6 text-zinc-400" />
              )}
            </div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
              {searchQuery ? 'Aucun résultat' : 'Aucun composite'}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {searchQuery
                ? `Aucun composite ne correspond à "${searchQuery}"`
                : 'Créez des blocs réutilisables pour simplifier vos modèles'
              }
            </p>
            {!searchQuery && (
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Créer un composite
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        )}

        {/* Composites View */}
        {filteredComposites.length > 0 && !isLoading && (
          <>
            {viewMode === 'list' ? (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={selectedComposites.size === filteredComposites.length}
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
                    {filteredComposites.map((composite, index) => (
                      <CompositeRow
                        key={composite.id}
                        composite={composite}
                        index={index}
                        isSelected={selectedComposites.has(composite.id)}
                        onToggleSelect={() => toggleCompositeSelection(composite.id)}
                        onOpen={() => router.push(`/composites/${composite.id}`)}
                        onRename={() => {
                          setRenameTarget({ id: composite.id, name: composite.name });
                          setRenameValue(composite.name);
                        }}
                        onDelete={() => handleDeleteClick(composite)}
                        isDeleted={deletedIds.has(composite.id)}
                        flashActive={flashHighlightId === composite.id}
                        registerRef={registerCardRef}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredComposites.map((composite, index) => (
                  <CompositeCard
                    key={composite.id}
                    composite={composite}
                    index={index}
                    isSelected={selectedComposites.has(composite.id)}
                    onToggleSelect={() => toggleCompositeSelection(composite.id)}
                    onOpen={() => router.push(`/composites/${composite.id}`)}
                    onRename={() => {
                      setRenameTarget({ id: composite.id, name: composite.name });
                      setRenameValue(composite.name);
                    }}
                    onDelete={() => handleDeleteClick(composite)}
                    isDeleted={deletedIds.has(composite.id)}
                    flashActive={flashHighlightId === composite.id}
                    registerRef={registerCardRef}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      </div>

      {/* Dialogs */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) setNewCompositeName('');
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau composite</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nom</label>
            <Input
              value={newCompositeName}
              onChange={(e) => setNewCompositeName(e.currentTarget.value)}
              placeholder="Module TVA"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCompositeName.trim()) {
                  handleCreateComposite();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setNewCompositeName(''); }}>
              Annuler
            </Button>
            <Button onClick={handleCreateComposite} disabled={!newCompositeName.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(open) => {
        if (!open) {
          setRenameTarget(null);
          setRenameValue('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer le composite</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nom</label>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim()) {
                  handleRenameSave();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenameTarget(null); setRenameValue(''); }}>
              Annuler
            </Button>
            <Button onClick={handleRenameSave} disabled={!renameValue.trim() || renameComposite.isPending}>
              {renameComposite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => {
        if (!open) setDeleteConfirm(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le composite</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 py-4">
            Voulez-vous vraiment supprimer <strong className="text-zinc-900 dark:text-white">"{deleteConfirm?.name}"</strong> ?
            Cette action est irréversible.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteComposite.isPending}
            >
              {deleteComposite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!usageDialog} onOpenChange={(open) => {
        if (!open) setUsageDialog(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Composite utilisé</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Ce composite est utilisé dans {(usageDialog?.projects.length || 0) + (usageDialog?.composites.length || 0)}
              {' '}élément{usageDialog && ((usageDialog.projects.length + usageDialog.composites.length) > 1) ? 's' : ''}.
              Supprimez-le d'abord de ces usages.
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {usageDialog && usageDialog.projects.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <Network className="h-3.5 w-3.5" />
                    Projets ({usageDialog.projects.length})
                  </div>
                  <div className="space-y-2">
                    {usageDialog.projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2"
                      >
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">
                          {project.name}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenProjectFromDialog(project.id)}
                        >
                          Ouvrir
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {usageDialog && usageDialog.composites.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <Layers className="h-3.5 w-3.5" />
                    Composites ({usageDialog.composites.length})
                  </div>
                  <div className="space-y-2">
                    {usageDialog.composites.map((composite) => (
                      <div
                        key={composite.id}
                        className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                      >
                        {composite.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setUsageDialog(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CompositeRowProps {
  composite: CompositeSummary;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  isDeleted: boolean;
  flashActive: boolean;
  registerRef: (id: string, node: HTMLDivElement | null) => void;
}

function CompositeRow({
  composite,
  index,
  isSelected,
  onToggleSelect,
  onOpen,
  onRename,
  onDelete,
  isDeleted,
  flashActive,
  registerRef
}: CompositeRowProps) {
  const { data: detail } = useComposite(isDeleted ? null : composite.id, {
    enabled: !isDeleted,
    retry: false,
  });

  const stats = useMemo(() => {
    if (!detail?.graph_data) return { nodes: 0, edges: 0 };
    return {
      nodes: detail.graph_data.nodes?.length || 0,
      edges: detail.graph_data.edges?.length || 0,
    };
  }, [detail]);

  return (
    <motion.tr
      ref={(node) => registerRef(composite.id, node as any)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={cn(
        "group cursor-pointer transition-colors",
        isSelected
          ? 'bg-amber-50/50 dark:bg-amber-950/20'
          : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50',
        flashActive && 'bg-amber-100 dark:bg-amber-900/30'
      )}
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </td>

      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-amber-100 dark:group-hover:bg-amber-950 transition-colors">
            <Layers className="h-4 w-4 text-zinc-600 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {composite.name}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <Box className="h-3.5 w-3.5" />
          <span>{stats.nodes}</span>
        </div>
      </td>

      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <GitBranch className="h-3.5 w-3.5" />
          <span>{stats.edges}</span>
        </div>
      </td>

      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="h-3.5 w-3.5" />
          {new Date(composite.updated_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ArrowRight className="h-4 w-4 text-zinc-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </td>
    </motion.tr>
  );
}

interface CompositeCardProps {
  composite: CompositeSummary;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  isDeleted: boolean;
  flashActive: boolean;
  registerRef: (id: string, node: HTMLDivElement | null) => void;
}

function CompositeCard({
  composite,
  index,
  isSelected,
  onToggleSelect,
  onOpen,
  onRename,
  onDelete,
  isDeleted,
  flashActive,
  registerRef
}: CompositeCardProps) {
  const { data: detail } = useComposite(isDeleted ? null : composite.id, {
    enabled: !isDeleted,
    retry: false,
  });

  const stats = useMemo(() => {
    if (!detail?.graph_data) return { nodes: 0, edges: 0 };
    return {
      nodes: detail.graph_data.nodes?.length || 0,
      edges: detail.graph_data.edges?.length || 0,
    };
  }, [detail]);

  return (
    <motion.div
      ref={(node) => registerRef(composite.id, node as any)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onOpen}
      className={cn(
        "group relative rounded-lg border bg-white dark:bg-zinc-900/50 p-5 cursor-pointer transition-all hover:shadow-md",
        isSelected
          ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-100 dark:ring-amber-900'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
        flashActive && 'border-amber-400 ring-2 ring-amber-200'
      )}
    >
      <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-amber-100 dark:group-hover:bg-amber-950 transition-colors">
          <Layers className="h-5 w-5 text-zinc-600 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate mb-1">
            {composite.name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(composite.updated_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <Box className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.nodes} nœuds</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <GitBranch className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.edges} liens</span>
        </div>
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Renommer
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}
