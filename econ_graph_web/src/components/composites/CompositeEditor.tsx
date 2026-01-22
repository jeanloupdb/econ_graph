"use client";

import { NewApiNodeModal } from "@/components/forms/NewApiNodeModal";
// import { NewNodeModal } from "@/components/forms/NewNodeModal"; // TODO: Removed, need to adapt CompositeEditor
import { GraphAddNodeMenu } from "@/components/graph/GraphAddNodeMenu";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { Inspector } from "@/components/panels/Inspector";
import { LibraryPanel } from "@/components/panels/LibraryPanel";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { CompositeGraphProvider } from "@/graph/providers/CompositeGraphProvider";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks";
import {
    PENDING_COMPOSITE_INSERT_KEY,
    PENDING_COMPOSITE_REFRESH_KEY
} from "@/lib/composites/constants";
import {
    normalizeCompositeNodes,
    serializeCompositeGraph,
} from "@/lib/composites/graph";
import type {
    PendingCompositeInsertPayload,
    PendingCompositeRefreshPayload,
    TransformCompositeSessionPayload,
} from "@/lib/composites/types";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import type {
    Composite,
    CompositeCreateInput,
    CompositeGraphData,
    CompositeUpdateInput,
    Node,
} from "@/lib/types";
import { useUIStore } from "@/store/uiState";
import { formatNumber } from "@/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Layers, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    type CompositeRootInfo
} from "./ExposedRootsManager";

interface CompositeEditorProps {
  initialComposite?: Composite | null;
  initialName?: string | null;
  initialGraphData?: CompositeGraphData | null;
  insertTargetProjectId?: string | null;
  shouldInsertAfterReturn?: boolean;
  transformContext?: TransformCompositeSessionPayload | null;
}

export function CompositeEditor({
  initialComposite,
  initialName,
  initialGraphData,
  insertTargetProjectId,
  shouldInsertAfterReturn = false,
  transformContext = null,
}: CompositeEditorProps) {
  const [graphMutated, setGraphMutated] = useState(!transformContext);
  const initialNodes = useMemo(
    () =>
      normalizeCompositeNodes(
        (initialGraphData?.nodes as unknown as Node[]) ||
          (initialComposite?.graph_data.nodes as Node[] | undefined)
      ),
    [initialComposite, initialGraphData]
  );

  return (
    <CompositeGraphProvider
      initialNodes={initialNodes}
      onGraphMutated={() => setGraphMutated(true)}
    >
      <CompositeEditorLayout
        initialComposite={initialComposite}
        initialName={initialName}
        insertTargetProjectId={insertTargetProjectId}
        shouldInsertAfterReturn={shouldInsertAfterReturn}
        transformContext={transformContext}
        graphMutated={graphMutated}
      />
    </CompositeGraphProvider>
  );
}

function CompositeEditorLayout({
  initialComposite,
  initialName,
  insertTargetProjectId,
  shouldInsertAfterReturn = false,
  transformContext = null,
  graphMutated,
}: {
  initialComposite?: Composite | null;
  initialName?: string | null;
  insertTargetProjectId?: string | null;
  shouldInsertAfterReturn?: boolean;
  transformContext?: TransformCompositeSessionPayload | null;
  graphMutated: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { nodes } = useGraphData();
  const graphActions = useGraphActions();
  const setScenarioPanelOpen = useUIStore((s) => s.setScenarioPanelOpen);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [compositeId, setCompositeId] = useState(initialComposite?.id ?? null);
  const lastSavedSnapshot = useRef<string | null>(null);
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  // Exposed roots state removed as per user request
  const [exposedRoots, setExposedRoots] = useState<Record<string, CompositeRootInfo>>(
    (initialComposite?.graph_data as any)?.exposed_roots || {}
  );
  const toastRefs = useRef<Map<string, string | number>>(new Map());
  const blockingErrorToast = useRef<string | number | null>(null);

  useEffect(() => {
    setScenarioPanelOpen(false);
    resetDetailPanels();
  }, [resetDetailPanels, setScenarioPanelOpen]);
  useEffect(() => {
    return () => {
      toastRefs.current.forEach((id) => toast.dismiss(id));
      toastRefs.current.clear();
      if (blockingErrorToast.current) {
        toast.dismiss(blockingErrorToast.current);
        blockingErrorToast.current = null;
      }
    };
  }, []);

  const analysis = useMemo(() => analyzeComposite(nodes), [nodes]);
  const editorName = (initialComposite?.name ?? initialName ?? "").trim();
  const requireStructuralValidation = !transformContext || graphMutated;
  const hasInvalidLeaf =
    requireStructuralValidation && analysis.leaves.length !== 1;
  const canSave = !hasInvalidLeaf;

  useEffect(() => {
    if (lastSavedSnapshot.current === null && initialComposite) {
      lastSavedSnapshot.current = JSON.stringify(
        serializeCompositeGraph(nodes)
      );
    }
  }, [initialComposite, nodes]);

  useEffect(() => {
    if (!requireStructuralValidation) {
      toastRefs.current.forEach((id) => toast.dismiss(id));
      toastRefs.current.clear();
    }
  }, [requireStructuralValidation]);

  useEffect(() => {
    if (!requireStructuralValidation) {
      return;
    }
    const activeKeys = new Set<string>();

    analysis.invalidEdges.forEach((edge) => {
      const key = `missing-${edge.target}-${edge.source}`;
      activeKeys.add(key);
      if (toastRefs.current.has(key)) return;
      const id = toast.custom(
        (t) => (
          <WarningToast
            title="Variable non reliée"
            description={`Le nœud ${edge.target} utilise ${edge.source} qui n'est pas relié à un nœud.`}
            actionLabel="Voir le nœud >"
            onAction={() => {
              setSelectedNodeId(edge.target);
              toast.dismiss(t as string | number);
            }}
          />
        ),
        { duration: Infinity, position: "bottom-right" }
      );
      toastRefs.current.set(key, id);
    });

    if (analysis.leaves.length === 0) {
      const key = "leaf-none";
      activeKeys.add(key);
      if (!toastRefs.current.has(key)) {
        const id = toast.custom(
          () => (
            <ErrorToast
              title="Aucun nœud final"
              description="Ajoutez un nœud via le bouton + pour définir la valeur finale."
            />
          ),
          { duration: Infinity, position: "bottom-right" }
        );
        toastRefs.current.set(key, id);
      }
    } else if (analysis.leaves.length > 1) {
      analysis.leaves.forEach((leafId) => {
        const key = `leaf-${leafId}`;
        activeKeys.add(key);
        if (toastRefs.current.has(key)) return;
        const id = toast.custom(
          (t) => (
            <ErrorToast
              title="Plusieurs feuilles détectées"
              description={`Sélectionnez ${leafId} pour ajuster vos dépendances.`}
              actionLabel="Voir le nœud >"
              onAction={() => {
                setSelectedNodeId(leafId);
                toast.dismiss(t as string | number);
              }}
            />
          ),
          { duration: Infinity, position: "bottom-right" }
        );
        toastRefs.current.set(key, id);
      });
    }

    toastRefs.current.forEach((toastId, key) => {
      if (!activeKeys.has(key)) {
        toast.dismiss(toastId);
        toastRefs.current.delete(key);
      }
    });
  }, [analysis, requireStructuralValidation, setSelectedNodeId]);

  useEffect(() => {
    if (!error) {
      if (blockingErrorToast.current) {
        toast.dismiss(blockingErrorToast.current);
        blockingErrorToast.current = null;
      }
      return;
    }
    if (blockingErrorToast.current) {
      toast.dismiss(blockingErrorToast.current);
    }
    blockingErrorToast.current = toast.custom(
      () => <ErrorToast title="Erreur d'enregistrement" description={error} />,
      { duration: Infinity, position: "bottom-right" }
    );
  }, [error]);

  const persistComposite = useCallback(
    async (
      graphData: ReturnType<typeof serializeCompositeGraph>,
      snapshot: string
    ): Promise<Composite | null> => {
      setError(null);
      setSaving(true);
      try {
          const payload = {
            name: editorName,
            graph_data: {
              ...graphData,
              exposed_roots: exposedRoots,
            },
          };

        let saved: Composite;
        if (compositeId) {
          saved = await apiClient.patch<Composite, CompositeUpdateInput>(
            `/composites/${compositeId}`,
            payload
          );
        } else {
          saved = await apiClient.post<Composite, CompositeCreateInput>(
            "/composites",
            payload
          );
        }
        setCompositeId(saved.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.composites });
        queryClient.setQueryData(queryKeys.composite(saved.id), saved);
        lastSavedSnapshot.current = snapshot;
        return saved;
      } catch (err: any) {
        setError(err?.message || "Impossible d'enregistrer le composite.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [compositeId, editorName, queryClient]
  );

  useEffect(() => {
    if (transformContext && !graphMutated) {
      return;
    }
    if (!canSave || saving) return;
    const graphData = serializeCompositeGraph(nodes);
    const snapshot = JSON.stringify(graphData);
    if (snapshot === lastSavedSnapshot.current) return;

    const timeout = window.setTimeout(() => {
      persistComposite(graphData, snapshot);
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [canSave, graphMutated, nodes, persistComposite, saving, transformContext]);

  const handleAbandon = async () => {
    if (abandoning) return;
    setAbandoning(true);
    try {
      if (compositeId) {
        await apiClient.delete<void>(`/composites/${compositeId}`);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.composites });
      if (compositeId) {
        queryClient.removeQueries({
          queryKey: queryKeys.composite(compositeId),
        });
      }
      router.push("/composites");
    } catch (err: any) {
      toast.error(err?.message || "Impossible de supprimer le composite.");
      setAbandoning(false);
      return;
    }
    setAbandoning(false);
    setAbandonDialogOpen(false);
  };

  const handleRecompute = useCallback(async () => {
    if (!graphActions.computeNode) return;
    const targetId = analysis.leaves[0] ?? nodes[0]?.id;
    if (!targetId) {
      toast.error("Ajoutez au moins un nœud avant de recalculer.");
      return;
    }
    setRecomputing(true);
    try {
      await graphActions.computeNode(targetId);
    } catch (err: any) {
      toast.error(err?.message || "Recalcul impossible.");
    } finally {
      setRecomputing(false);
    }
  }, [graphActions, analysis.leaves, nodes]);

  // Auto-compute on mount
  const hasAutoComputed = useRef(false);
  useEffect(() => {
    if (!hasAutoComputed.current && nodes.length > 0) {
      hasAutoComputed.current = true;
      handleRecompute();
    }
  }, [nodes.length, handleRecompute]);

  const queueCompositeRefresh = useCallback(
    (projectId: string, compositeIdValue: string) => {
      if (typeof window === "undefined") return;
      const payload: PendingCompositeRefreshPayload = {
        projectId,
        compositeId: compositeIdValue,
      };
      window.sessionStorage.setItem(
        PENDING_COMPOSITE_REFRESH_KEY,
        JSON.stringify(payload)
      );
    },
    []
  );

  const finalLeaf = useMemo(() => {
    const targetId =
      analysis.leaves.length === 1 ? analysis.leaves[0] : nodes[0]?.id;
    if (!targetId) return null;
    return nodes.find((n) => n.id === targetId) ?? null;
  }, [analysis.leaves, nodes]);

  const finalValue = finalLeaf?.value_computed ?? null;
  const finalUnit = finalLeaf?.unit;

  const isProjectContext = !!insertTargetProjectId;
  const isAutoInsertFlow = isProjectContext && shouldInsertAfterReturn;
  const primaryActionLabel = useMemo(() => {
    if (isAutoInsertFlow) return "Valider et insérer";
    if (isProjectContext) return "Enregistrer et revenir";
    if (compositeId) return "Enregistrer";
    return "Valider";
  }, [isAutoInsertFlow, isProjectContext, compositeId]);

  const ensureCompositeSaved = useCallback(async (): Promise<Composite | null> => {
    const graphData = serializeCompositeGraph(nodes);
    const snapshot = JSON.stringify(graphData);
    if (snapshot === lastSavedSnapshot.current && compositeId) {
      return {
        ...(initialComposite || { id: compositeId }),
        id: compositeId,
        graph_data: graphData as any,
      } as Composite;
    }
    if (!canSave) {
      toast.error("Complétez votre composite avant de continuer.");
      return null;
    }
    return await persistComposite(graphData, snapshot);
  }, [canSave, compositeId, initialComposite, nodes, persistComposite]);

  const handleValidateAndReturn = useCallback(async () => {
    const saved = await ensureCompositeSaved();
    if (!saved) return;
    if (isProjectContext) {
      if (isAutoInsertFlow) {
        if (typeof window !== "undefined") {
          const payload: PendingCompositeInsertPayload = {
            compositeId: saved.id,
            projectId: insertTargetProjectId,
            mode: transformContext ? "transform" : "insert",
            replaceNodeId: transformContext?.replaceNodeId,
            replaceNodeSlug: transformContext?.replaceNodeSlug,
            nodesToDelete: transformContext?.nodesToDelete,
            position: transformContext?.originalPosition ?? null,
            dependentsToResync: transformContext?.dependentsToResync,
          };
          window.sessionStorage.setItem(
            PENDING_COMPOSITE_INSERT_KEY,
            JSON.stringify(payload)
          );
        }
      } else if (insertTargetProjectId) {
        queueCompositeRefresh(insertTargetProjectId, saved.id);
      }
      router.push("/graph");
    } else {
      router.push(`/composites?highlight=${saved.id}`);
    }
  }, [
    ensureCompositeSaved,
    insertTargetProjectId,
    isAutoInsertFlow,
    isProjectContext,
    queueCompositeRefresh,
    router,
    transformContext,
  ]);

  const handleReturn = useCallback(async () => {
    const saved = await ensureCompositeSaved();
    if (!saved) {
      return;
    }
    if (isProjectContext) {
      if (isAutoInsertFlow) {
        if (typeof window !== "undefined") {
          const payload: PendingCompositeInsertPayload = {
            compositeId: saved.id,
            projectId: insertTargetProjectId,
            mode: transformContext ? "transform" : "insert",
            replaceNodeId: transformContext?.replaceNodeId,
            replaceNodeSlug: transformContext?.replaceNodeSlug,
            nodesToDelete: transformContext?.nodesToDelete,
            position: transformContext?.originalPosition ?? null,
            dependentsToResync: transformContext?.dependentsToResync,
          };
          window.sessionStorage.setItem(
            PENDING_COMPOSITE_INSERT_KEY,
            JSON.stringify(payload)
          );
        }
      } else if (insertTargetProjectId) {
        queueCompositeRefresh(insertTargetProjectId, saved.id);
      }
      router.push("/graph");
      return;
    }
    router.push(`/composites?highlight=${saved.id}`);
  }, [
    ensureCompositeSaved,
    insertTargetProjectId,
    isAutoInsertFlow,
    isProjectContext,
    queueCompositeRefresh,
    router,
    transformContext,
  ]);

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white/95 px-6 py-4 dark:border-zinc-900 dark:bg-zinc-950/95">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              onClick={handleReturn}
            >
              <ArrowLeft className="h-4 w-4" />
              {insertTargetProjectId ? "Retour au projet" : "Retour"}
            </button>
            <div className="flex items-center gap-3">
              <div>
                <div className="flex flex-wrap items-baseline gap-2 text-xl font-semibold text-zinc-900 dark:text-white">
                  <span className="inline-flex items-center gap-2">
                    <Layers className="h-5 w-5 text-white-600 dark:text-white-300" />
                    {editorName || "Nom du composite manquant"}
                  </span>
                  {finalLeaf && (
                    <>
                      <span className="text-base font-normal text-zinc-400 dark:text-zinc-500">
                        =
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {finalValue != null ? formatNumber(finalValue) : "—"}
                      </span>
                      {finalUnit && (
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                          {finalUnit}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {!editorName && (
                  <div className="text-xs text-red-500 dark:text-red-400">
                    Définissez un nom pour activer la sauvegarde automatique.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {saving && (
                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sauvegarde…
                </div>
              )}
              {recomputing && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Recalcul…
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleValidateAndReturn}
              disabled={!canSave || saving}
            >
              {primaryActionLabel}
            </Button>
            <GraphAddNodeMenu
              onCreateNode={() => setShowNodeModal(true)}
              onCreateApiNode={() => setShowApiModal(true)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const { toggleLibraryPanel } = useUIStore.getState();
                toggleLibraryPanel();
              }}
              title="Bibliothèque de composites"
            >
              <Layers className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Recalculer le composite"
              onClick={() => handleRecompute()}
              disabled={recomputing || nodes.length === 0}
            >
              {recomputing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              title="Abandonner le composite"
              onClick={() => setAbandonDialogOpen(true)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <GraphCanvas />
          <LibraryPanelWrapper />
        </div>
        <Inspector />
      </div>

      {/* TODO: NewNodeModal has been removed, need to adapt CompositeEditor */}
      {/* <NewNodeModal
        open={showNodeModal}
        onClose={() => setShowNodeModal(false)}
      /> */}
      <NewApiNodeModal
        open={showApiModal}
        onClose={() => setShowApiModal(false)}
      />
      <Dialog open={abandonDialogOpen} onOpenChange={setAbandonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abandonner ce composite ?</DialogTitle>
            <DialogDescription>
              Cette action supprime définitivement ce composite et vous ramène à
              la liste. Les changements en cours seront perdus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAbandonDialogOpen(false)}
              disabled={abandoning}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleAbandon}
              disabled={abandoning}
            >
              {abandoning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression…
                </>
              ) : (
                "Supprimer et revenir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LibraryPanelWrapper() {
  const libraryPanelOpen = useUIStore((s) => s.libraryPanelOpen);
  if (!libraryPanelOpen) return null;
  return (
    <div className="absolute left-0 top-0 z-10 h-full shadow-xl">
      <LibraryPanel />
    </div>
  );
}

function ErrorToast({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg p-4 min-w-[260px] space-y-2">
      <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
        {title}
      </div>
      <div className="text-xs text-zinc-600 dark:text-zinc-300">
        {description}
      </div>
      {actionLabel && onAction && (
        <Button variant="link" className="px-0 text-sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function WarningToast({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 shadow-lg p-4 min-w-[260px] space-y-2">
      <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
        {title}
      </div>
      <div className="text-xs text-blue-600 dark:text-blue-300">
        {description}
      </div>
      {actionLabel && onAction && (
        <Button variant="link" className="px-0 text-sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function analyzeComposite(nodes: Node[]) {
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Create slug to id mapping for resolving references
  const slugToId = new Map<string, string>();
  nodes.forEach((node) => {
    slugToId.set(node.slug, node.id);
  });

  // Collect all composite root IDs that are expected to be missing
  const compositeRootIds = new Set<string>();
  nodes.forEach((node) => {
    if (node.composite_root_ids) {
      node.composite_root_ids.forEach((rootId) => compositeRootIds.add(rootId));
    }
  });

  const derivedEdges = nodes.flatMap((node) =>
    deriveEdgesFromCompute({
      id: node.id,
      computation_definition: node.computation_definition || undefined,
    })
  );

  // Filter out edges where source is a composite root (these are internal to the composite)
  const invalidEdges = derivedEdges.filter(
    (edge) => !nodeIds.has(edge.source) && !slugToId.has(edge.source) && !compositeRootIds.has(edge.source)
  );
  const missingSources = Array.from(
    new Set(invalidEdges.map((edge) => edge.source))
  );

  // Count outgoing edges, resolving slugs to IDs
  const outgoing = new Map<string, number>();
  nodes.forEach((node) => {
    if (node.id) outgoing.set(node.id, 0);
  });
  derivedEdges.forEach((edge) => {
    // Try to resolve source by ID first, then by slug
    const sourceId = nodeIds.has(edge.source) ? edge.source : slugToId.get(edge.source);
    if (sourceId) {
      outgoing.set(sourceId, (outgoing.get(sourceId) || 0) + 1);
    }
  });

  const leaves = nodes
    .filter((node) => node.id && (outgoing.get(node.id) || 0) === 0)
    .map((node) => node.id);

  return { edges: derivedEdges, missingSources, leaves, invalidEdges };
}
