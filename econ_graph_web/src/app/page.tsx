"use client";
import Link from 'next/link';
import { Network, PlusCircle, Trash2, Layers, Pencil, Loader2, ChevronDown } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import type { Node } from '@/lib/types';
import { DashboardCard } from '@/components/cards/DashboardCard';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

export default function Home() {
  const router = useRouter();
  const { projects, currentProjectId, load, createProject, setCurrentProject, renameProject, deleteProject } = useProjectStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<null | { id: string; name: string }>(null);
  const [name, setName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState<null | { id: string; name: string }>(null);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!createOpen) setName(''); }, [createOpen]);
  useEffect(() => { if (!editOpen) setName(''); }, [editOpen]);

  const handleCreate = () => {
    if (!name.trim()) return;
    const p = createProject(name.trim());
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 font-sans dark:from-black dark:to-zinc-900">
      <main className="flex w-full max-w-5xl flex-col items-center gap-12 py-16 px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-950">
            <Network className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-6xl font-bold tracking-tight text-black dark:text-white">
            Econ Graph
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Economic graph visualization and coherency checking platform
          </p>
        </div>

        <div className="w-full max-w-4xl space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-black dark:text-white">Graph Projects</h2>
                <p className="text-zinc-600 dark:text-zinc-400">Open an existing graph or start a new one.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  onClick={() => router.push('/composites')}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Composites
                </Button>
                <Button variant="default" onClick={() => setCreateOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" /> New Project
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500 dark:text-zinc-400">
                No projects yet. Create your first project.
              </div>
            )}
            {projects.map((p) => (
              <DashboardCard
                key={p.id}
                icon={<Network className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                title={p.name}
                subtitle={`Updated ${new Date(p.updatedAt).toLocaleString()}`}
                badge={
                  currentProjectId === p.id ? (
                    <span className="text-[11px] px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                      Current
                    </span>
                  ) : null
                }
                onOpen={() => {
                  setCurrentProject(p.id);
                  router.push('/graph');
                }}
                onRename={() => {
                  setName(p.name);
                  setEditOpen({ id: p.id, name: p.name });
                }}
                onDelete={() => setDeleteOpen({ id: p.id, name: p.name })}
                className={cn(
                  currentProjectId === p.id
                    ? 'border-blue-300 dark:border-blue-700'
                    : 'border-zinc-200 dark:border-zinc-800'
                )}
                iconWrapperClassName="bg-blue-100 p-2 dark:bg-blue-950"
                footerLabel="Ouvrir"
                usageTrigger={<ProjectCompositeTrigger projectId={p.id} />}
              >
                {/* No additional content */}
              </DashboardCard>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>
            API: {process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}
          </p>
          {/* API docs link removed to keep focus on projects */}
        </div>

        {/* Create project dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-300">Name</label>
              <Input value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="My Strategy Graph" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rename project dialog */}
        <Dialog open={!!editOpen} onOpenChange={(open) => setEditOpen(open ? editOpen : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-300">Name</label>
              <Input value={name} onChange={(e) => setName(e.currentTarget.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(null)}>Cancel</Button>
              <Button onClick={handleRename} disabled={!name.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete project confirmation */}
        <Dialog open={!!deleteOpen} onOpenChange={(open) => setDeleteOpen(open ? deleteOpen : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete project</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Are you sure you want to delete “{deleteOpen?.name}”? This will remove all nodes and edges in this project.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => { if (deleteOpen) { deleteProject(deleteOpen.id); setDeleteOpen(null); } }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function useProjectComposites(projectId: string) {
  return useQuery({
    queryKey: ['project-composites', projectId],
    queryFn: async () => {
      const nodes = await apiClient.get<Node[]>(`/nodes?project=${encodeURIComponent(projectId)}`);
      const unique = new Map<string, string>();
      (nodes || []).forEach((node) => {
        if (node.composite_id) {
          unique.set(node.composite_id, node.label || node.composite_id);
        }
      });
      return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    },
  });
}

function ProjectCompositeTrigger({ projectId }: { projectId: string }) {
  const { data = [], isLoading } = useProjectComposites(projectId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative mt-4 text-xs text-zinc-500 dark:text-zinc-400">
      <Button
        variant="ghost"
        size="sm"
        className="text-zinc-500"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        Composites
        {data.length > 0 && (
          <span className="ml-1 text-[11px] text-zinc-400">{data.length}</span>
        )}
        <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
          {isLoading ? (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Chargement…
            </div>
          ) : data.length === 0 ? (
            <p className="text-zinc-400">Aucun composite dans ce graph.</p>
          ) : (
            <ul className="space-y-2 text-zinc-700 dark:text-zinc-100">
              {data.map((comp) => (
                <li
                  key={comp.id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/80 px-2 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-900/70"
                >
                  <Layers className="h-3.5 w-3.5 text-amber-500" />
                  <button
                    type="button"
                    className="text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/composites/${comp.id}`);
                    }}
                  >
                    {comp.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
