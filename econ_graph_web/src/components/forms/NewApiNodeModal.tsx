"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import type { NodeCreate, NodeUpdate } from "@/lib/types";
import { useUIStore } from "@/store/uiState";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useGraphActions } from "@/graph/context/GraphActionsContext";

interface Props {
  open: boolean;
  onClose: () => void;
  nodeId?: string;
}

function kebabify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 60);
}

export function NewApiNodeModal({ open, onClose, nodeId }: Props) {
  const isEditing = !!nodeId;
  const { nodes } = useGraphData();
  const graphActions = useGraphActions();
  const computeFn = graphActions.computeNode;
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const [saving, setSaving] = useState(false);

  const editingNode = useMemo(
    () => nodes.find((n) => n.id === nodeId),
    [nodes, nodeId]
  );

  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [jsonPath, setJsonPath] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testValue, setTestValue] = useState<string | null>(null);
  const [testRaw, setTestRaw] = useState<any>(null);
  const [rawOpen, setRawOpen] = useState(false);

  useEffect(() => {
    if (!isEditing && !slugEdited) {
      setSlug(kebabify(label || "api-node"));
    }
  }, [label, isEditing, slugEdited]);

  useEffect(() => {
    if (!open || !nodeId) return;
    if (editingNode) {
      setLabel(editingNode.label || "");
      setSlug(editingNode.slug || editingNode.id || "");
      setSlugEdited(true);
      setUnit((editingNode.unit as any) || "");
      setNotes((editingNode.notes as any) || "");
      setUrl((editingNode.provider_url as any) || "");
      setJsonPath((editingNode.provider_json_path as any) || "");
    }
  }, [open, nodeId, editingNode]);

  const canCreate =
    label.trim().length > 0 && slug.trim().length > 0 && url.trim().length > 0;

  const handleCreate = async () => {
    setInlineError(null);
    if (!canCreate) return;
    setSaving(true);
    try {
      if (!nodeId) {
        const payload: NodeCreate = {
          slug: slug.trim(),
          label,
          unit,
          status: "observed",
          confidence: 0.9,
          notes: notes || null,
          value_computed: null,
          computation_definition: null,
          provider_enabled: true as any,
          provider_type: "http_json" as any,
          provider_url: url as any,
          provider_json_path: jsonPath as any,
        } as any;
        const created = await graphActions.createNode(payload);
        if (computeFn) {
          await computeFn(created.id);
        }
        setSelectedNodeId(created.id);
      } else {
        const updatePayload: NodeUpdate = {
          label,
          unit: unit as any,
          notes,
          provider_enabled: true as any,
          provider_type: "http_json" as any,
          provider_url: url as any,
          provider_json_path: jsonPath as any,
        };
        await graphActions.updateNode(nodeId, updatePayload);
        if (computeFn) {
          await computeFn(nodeId);
        }
        setSelectedNodeId(nodeId);
      }
      onClose();
    } catch (e: any) {
      setInlineError(e?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestError(null);
    setTestValue(null);
    setTestRaw(null);
    try {
      const res = await apiClient.post<
        { ok: boolean; value?: number; raw?: any; error?: string },
        any
      >("/providers/test", { url, json_path: jsonPath || null, timeout: 5.0 });
      const raw = (res as any).raw;
      if ((res as any).ok) {
        setTestValue(String((res as any).value));
        setTestRaw(raw);
        setRawOpen(raw !== null && raw !== undefined);
      } else {
        setTestError((res as any).error || "Test failed");
        setTestRaw(raw);
        setRawOpen(raw !== null && raw !== undefined);
      }
    } catch (e: any) {
      setTestError(e?.message || "Test failed");
      setRawOpen(false);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden border-none sm:rounded-xl [&>button]:hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <DialogTitle>{nodeId ? "Modifier un nœud API" : "Nouveau nœud API"}</DialogTitle>
            <DialogDescription className="text-xs text-zinc-600 dark:text-zinc-400">
              Configurez l’URL et le chemin JSON pour alimenter ce nœud.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Label</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.currentTarget.value)}
                  placeholder="Ex: FX Rate USD/EUR"
                />
              </div>
              <div className="space-y-1">
                <Label>Code interne</Label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    const v = kebabify(e.currentTarget.value);
                    setSlug(v);
                    if (!isEditing) setSlugEdited(true);
                  }}
                  disabled={isEditing}
                  placeholder="fx_rate_usd_eur"
                />
                <p className="text-[11px] text-zinc-500 font-mono">
                  ID technique: {editingNode?.id ?? 'sera généré automatiquement'}
                </p>
              </div>
            <div className="space-y-1">
              <Label>Unité</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.currentTarget.value)}
                placeholder="%, bps, level, ..."
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                className="w-full min-h-[80px] rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="text-sm font-semibold">Source API</div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label>API URL (HTTP JSON)</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.currentTarget.value)}
                  placeholder="https://api.example.com/value"
                />
              </div>
              <div className="space-y-1">
                <Label>Chemin JSON (optionnel)</Label>
                <Input
                  value={jsonPath}
                  onChange={(e) => setJsonPath(e.currentTarget.value)}
                  placeholder="ex: data.price"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={testLoading || !url.trim()}
                >
                  {testLoading ? "Test…" : "Tester la source"}
                </Button>
                {testValue && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-300">
                    Valeur: <span className="font-mono">{testValue}</span>
                  </div>
                )}
                {testError && (
                  <div className="text-xs text-red-600 dark:text-red-300">
                    Erreur: {testError}
                  </div>
                )}
              </div>
              {testRaw != null && (
                <details
                  className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                  open={rawOpen}
                  onToggle={(e) =>
                    setRawOpen((e.currentTarget as HTMLDetailsElement).open)
                  }
                >
                  <summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition-transform group-open:rotate-180" />
                    Aperçu JSON
                  </summary>
                  <div className="px-3 pb-3 text-[11px] overflow-auto max-h-40">
                    <pre>
                      {(() => {
                        try {
                          return JSON.stringify(testRaw, null, 2);
                        } catch {
                          return String(testRaw);
                        }
                      })()}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>

          {nodeId && editingNode && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 rounded-md border border-zinc-200 dark:border-zinc-800 p-2">
              {(editingNode.provider_last_fetched_at as any) && (
                <div>
                  <span className="font-medium">Dernier fetch:</span>{" "}
                  {new Date(
                    editingNode.provider_last_fetched_at as any
                  ).toLocaleString()}
                </div>
              )}
              {editingNode.provider_last_error && (
                <div className="text-red-600 dark:text-red-300">
                  <span className="font-medium">Erreur de récupération:</span>{" "}
                  {editingNode.provider_last_error}
                </div>
              )}
              {!editingNode.provider_last_error &&
                !(editingNode.provider_last_fetched_at as any) && (
                  <div className="opacity-70">Aucun fetch encore réalisé.</div>
                )}
            </div>
          )}
          {inlineError && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 rounded p-2">
              {inlineError}
            </div>
          )}
          </div>
        <div className="flex items-center justify-end border-t border-zinc-200 p-4 dark:border-zinc-800 gap-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || saving}
            >
              {saving
                ? nodeId
                  ? "Enregistrement…"
                  : "Création…"
                : nodeId
                ? "Enregistrer"
                : "Créer"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
