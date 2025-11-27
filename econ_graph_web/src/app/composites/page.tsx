'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, ArrowLeft, Layers, ChevronDown, Building, Network } from 'lucide-react';
import { useComposites, useDeleteComposite, useComposite } from '@/lib/api/hooks';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiClient, APIClientError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/hooks';
import type { Composite, CompositeSummary, CompositeUsage, CompositeUsageProject, CompositeUsageComposite } from '@/lib/types';
import { formatNumber, cn } from '@/lib/utils';
import { useProjectStore } from '@/store/projectState';
import { toast } from 'sonner';
import { DashboardCard } from '@/components/cards/DashboardCard';

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
const [usageDialog, setUsageDialog] = useState<null | {
  composite: CompositeSummary;
  projects: CompositeUsageProject[];
  composites: CompositeUsageComposite[];
}>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const queryClient = useQueryClient();

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

  const handleDelete = useCallback(
    async (summary: CompositeSummary) => {
      let usage: CompositeUsage | null = null;
      try {
        usage = await apiClient.get<CompositeUsage>(`/composites/${summary.id}/usage`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de vérifier l'utilisation de ce composite."
        );
        return;
      }
      if (
        usage &&
        ((usage.projects && usage.projects.length > 0) ||
          (usage.composites && usage.composites.length > 0))
      ) {
        setUsageDialog({ composite: summary, projects: usage.projects, composites: usage.composites });
        return;
      }
      if (!confirm(`Supprimer le composite « ${summary.name} » ?`)) return;
      try {
        await deleteComposite.mutateAsync(summary.id);
      } catch (error) {
        if (error instanceof APIClientError) {
          const detail = error.detail as
            | { projects?: CompositeUsageProject[] }
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
            return;
          }
        }
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer ce composite."
        );
      }
    },
    [deleteComposite]
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-950">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <button
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard
            </button>
            <h1 className="mt-4 text-4xl font-bold text-zinc-900 dark:text-white">Composites</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Sous-graphes réutilisables disponibles pour tous les projets.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button variant="secondary" onClick={() => router.refresh()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rafraîchir'}
            </Button>
            <Button className="w-full" onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nouveau composite
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : composites.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 p-12 text-center text-zinc-500 dark:text-zinc-400">
            Aucun composite enregistré pour le moment.
            <div className="mt-4">
              <Button onClick={() => router.push('/composites/new')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Créer le premier composite
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {composites.map((composite) => (
              <CompositeCard
                key={composite.id}
                summary={composite}
                onOpen={() => router.push(`/composites/${composite.id}`)}
                onRename={() => {
                  setRenameTarget({ id: composite.id, name: composite.name });
                  setRenameValue(composite.name);
                }}
                onDelete={() => handleDelete(composite)}
                isDeleting={deleteComposite.isPending && deleteComposite.variables === composite.id}
                flashActive={flashHighlightId === composite.id}
                registerRef={registerCardRef}
              />
            ))}
          </div>
        )}
      </div>
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) setNewCompositeName('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nom du nouveau composite</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Nom</label>
            <Input
              value={newCompositeName}
              onChange={(e) => setNewCompositeName(e.currentTarget.value)}
              placeholder="Bloc Inflation"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setNewCompositeName(''); }}>
              Annuler
            </Button>
            <Button onClick={handleCreateComposite} disabled={!newCompositeName.trim()}>
              Continuer
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le composite</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Nom</label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.currentTarget.value)} />
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

      <Dialog open={!!usageDialog} onOpenChange={(open) => {
        if (!open) setUsageDialog(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {usageDialog
                ? `Impossible de supprimer « ${usageDialog.composite.name} »`
                : 'Composite utilisé'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Ce composite est utilisé dans {(usageDialog?.projects.length || 0) + (usageDialog?.composites.length || 0)}
              {' '}élément{usageDialog && ((usageDialog.projects.length + usageDialog.composites.length) > 1) ? 's' : ''} (projets ou composites).
              Supprimez-le d’abord de ces usages pour pouvoir le retirer.
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-sm">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Network className="h-3.5 w-3.5" />
                  Projets ({usageDialog?.projects.length || 0})
                </div>
                {usageDialog?.projects.length ? (
                  <div className="space-y-2">
                    {usageDialog?.projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-100">
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
                ) : (
                  <p className="text-xs text-zinc-500">Aucun projet.</p>
                )}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Layers className="h-3.5 w-3.5" />
                  Composites ({usageDialog?.composites.length || 0})
                </div>
                {usageDialog?.composites.length ? (
                  <div className="space-y-2">
                    {usageDialog?.composites.map((composite) => (
                      <div
                        key={composite.id}
                        className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700"
                      >
                        {composite.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Aucun composite.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialog(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CompositeCardProps {
  summary: CompositeSummary;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  flashActive: boolean;
  registerRef: (id: string, node: HTMLDivElement | null) => void;
}

function CompositeCard({
  summary,
  onOpen,
  onRename,
  onDelete,
  isDeleting,
  flashActive,
  registerRef,
}: CompositeCardProps) {
  const compositeIdForQuery = isDeleting ? null : summary.id;
  const {
    data: compositeDetail,
    isLoading: detailLoading,
    isFetching: detailFetching,
  } = useComposite(compositeIdForQuery, {
    enabled: !!compositeIdForQuery,
  });
  const compositeValue = useMemo(() => extractCompositeValue(compositeDetail), [compositeDetail]);
  const valueLoading = detailLoading || detailFetching;
  const updatedDate = useMemo(() => new Date(summary.updated_at).toLocaleString(), [summary.updated_at]);

  return (
    <DashboardCard
      ref={(node) => registerRef(summary.id, node)}
      icon={<Layers className="h-5 w-5 text-amber-600 dark:text-amber-300" />}
      title={summary.name}
      subtitle={`Mis à jour le ${updatedDate}`}
      onOpen={onOpen}
      onRename={onRename}
      onDelete={onDelete}
      value={
        valueLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        ) : compositeValue.value != null ? (
          <>
            {formatNumber(compositeValue.value)}
            {compositeValue.unit && (
              <span className="ml-2 text-base text-amber-500 dark:text-amber-200">{compositeValue.unit}</span>
            )}
          </>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500 text-base">—</span>
        )
      }
      usageTrigger={<CompositeUsageAccordion compositeId={summary.id} />}
      className={cn(
        flashActive
          ? 'border-amber-400 shadow-md'
          : 'border-zinc-200 dark:border-zinc-800',
      )}
      iconWrapperClassName="bg-amber-50 p-2 dark:bg-amber-900/30"
      valueClassName="text-3xl font-semibold text-amber-600 dark:text-amber-300"
      footerLabel="Ouvrir"
    />
  );
}

function extractCompositeValue(composite?: Composite | null): { value: number | null; unit?: string } {
  if (!composite?.graph_data?.nodes?.length) return { value: null, unit: undefined };
  const { nodes = [], edges = [] } = composite.graph_data;
  const outgoingCount = new Map<string, number>();
  edges.forEach((edge) => {
    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) ?? 0) + 1);
  });
  const leaf = nodes.find((node) => (outgoingCount.get(node.id) ?? 0) === 0) ?? nodes[0];
  return {
    value: leaf?.value_computed ?? null,
    unit: leaf?.unit,
  };
}


function CompositeUsageAccordion({ compositeId }: { compositeId: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const {
    data: usage,
    isFetching,
    isLoading,
  } = useQuery({
    queryKey: ['composite-usage', compositeId],
    queryFn: () => apiClient.get<CompositeUsage>(`/composites/${compositeId}/usage`),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });
  const projects = usage?.projects ?? [];
  const composites = usage?.composites ?? [];
  const loading = isLoading || isFetching;

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="sm"
        className="text-zinc-500"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        Utilisé dans
        {usage && projects.length + composites.length > 0 && (
          <span className="ml-1 text-[11px] text-zinc-400">
            {projects.length + composites.length}
          </span>
        )}
        <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-2 w-64 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Chargement…
            </div>
          ) : (
            <UsageList projects={projects} composites={composites} />
          )}
        </div>
      )}
    </div>
  );
}

function UsageList({
  projects,
  composites,
}: {
  projects: CompositeUsageProject[];
  composites: CompositeUsageComposite[];
}) {
  const router = useRouter();
  const items = [
    ...projects.map((p) => ({ ...p, type: 'project' as const })),
    ...composites.map((c) => ({ ...c, type: 'composite' as const })),
  ];

  if (items.length === 0) {
    return <p className="text-xs text-zinc-400">Aucun usage</p>;
  }

  return (
    <ul className="space-y-2 text-xs">
      {items.map((item) => {
        const colorClasses =
          item.type === 'project'
            ? 'border-blue-400 bg-blue-100 text-blue-900 dark:border-blue-500/60 dark:bg-blue-900/40 dark:text-blue-100'
            : 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500/60 dark:bg-amber-900/40 dark:text-amber-100';
        const Icon = item.type === 'project' ? Network : Layers;
        return (
          <li
            key={item.id}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-medium ${colorClasses} cursor-pointer transition-colors hover:opacity-85`}
            onClick={() => {
              if (item.type === 'project') {
                const { setCurrentProject } = useProjectStore.getState();
                setCurrentProject(item.id);
                router.push('/graph');
                return;
              }
              router.push(`/composites/${item.id}`);
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
