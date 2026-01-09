"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InfoHint } from "@/components/ui/info-hint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { apiClient } from "@/lib/api/client";
import type { NodeCreate, NodeUpdate } from "@/lib/types";
import { useUIStore } from "@/store/uiState";
import { AlertCircle, CheckCircle2, ChevronDown, Database, Globe, Loader2, Play, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
        const updatePayload = {
          label,
          unit,
          notes,
          provider_enabled: true,
          provider_type: "http_json",
          provider_url: url,
          provider_json_path: jsonPath,
        } as any as NodeUpdate;
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
      <DialogContent className="max-w-3xl w-full !p-0 !gap-0 overflow-hidden !border-2 sm:rounded-xl shadow-2xl [&>button.absolute]:hidden">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                {nodeId ? "Modifier le nœud API" : "Nouveau nœud API"}
              </DialogTitle>
              <DialogDescription>
                Configurez une source de données externe via API HTTP/JSON.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="-mr-2">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-8 max-h-[75vh]">
          
          {/* General Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <div className="h-6 w-1 bg-blue-500 rounded-full" />
              Informations générales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Label</Label>
                  <InfoHint title="Nom lisible">Nom affiché sur le graphe.</InfoHint>
                </div>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.currentTarget.value)}
                  placeholder="Ex: Taux de change USD/EUR"
                  className="bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Code interne</Label>
                  <InfoHint title="Identifiant unique">ID technique unique.</InfoHint>
                </div>
                <div className="relative">
                  <Input
                    value={slug}
                    onChange={(e) => {
                      const v = kebabify(e.currentTarget.value);
                      setSlug(v);
                      if (!isEditing) setSlugEdited(true);
                    }}
                    disabled={isEditing}
                    placeholder="fx_rate_usd_eur"
                    className="font-mono text-xs bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                  />
                  {isEditing && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Lecture seule</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Unité</Label>
                </div>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.currentTarget.value)}
                  placeholder="%, bps, level, ..."
                  className="bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Notes</Label>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.currentTarget.value)}
                  placeholder="Description ou contexte..."
                  className="w-full h-20 resize-none rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* API Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <div className="h-6 w-1 bg-purple-500 rounded-full" />
              Configuration API
            </h3>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/30 p-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">URL Endpoint</Label>
                  <InfoHint title="URL HTTP">L'adresse de l'API qui retourne le JSON.</InfoHint>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Globe className="h-4 w-4 text-zinc-400" />
                  </div>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.currentTarget.value)}
                    placeholder="https://api.example.com/data"
                    className="pl-9 font-mono text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Chemin JSON (JSONPath)</Label>
                  <InfoHint title="Extraction">Chemin pour extraire la valeur numérique.</InfoHint>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Database className="h-4 w-4 text-zinc-400" />
                  </div>
                  <Input
                    value={jsonPath}
                    onChange={(e) => setJsonPath(e.currentTarget.value)}
                    placeholder="ex: data.values[0].price"
                    className="pl-9 font-mono text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              {/* Test Section */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/50">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-medium text-zinc-500">Test de connexion</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={testLoading || !url.trim()}
                    className="h-8 text-xs gap-2 border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800"
                  >
                    {testLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    {testLoading ? "Test en cours..." : "Lancer le test"}
                  </Button>
                </div>

                {/* Test Results */}
                {(testValue || testError) && (
                  <div className={`rounded-lg p-3 text-sm flex items-start gap-3 ${testValue ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30' : 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30'}`}>
                    {testValue ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className={`font-medium ${testValue ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>
                        {testValue ? "Valeur récupérée avec succès" : "Échec de la récupération"}
                      </div>
                      {testValue && (
                        <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
                          {testValue} <span className="text-xs font-normal text-emerald-600/70">{unit}</span>
                        </div>
                      )}
                      {testError && (
                        <div className="text-xs text-red-700 dark:text-red-300 break-all">
                          {testError}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Raw JSON Preview */}
                {testRaw != null && (
                  <div className="mt-3">
                    <details
                      className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden"
                      open={rawOpen}
                      onToggle={(e) => setRawOpen((e.currentTarget as HTMLDetailsElement).open)}
                    >
                      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        Voir la réponse JSON brute
                      </summary>
                      <div className="px-3 pb-3 pt-0 border-t border-zinc-100 dark:border-zinc-800/50">
                        <pre className="mt-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-300 overflow-auto max-h-40 p-2 rounded bg-zinc-50 dark:bg-zinc-900/50">
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Last Fetch Info (if editing) */}
          {nodeId && editingNode && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <InfoHint title="Statut">État de la dernière synchronisation automatique.</InfoHint>
                <span className="font-medium uppercase tracking-wider">Dernière synchro</span>
              </div>
              
              {(editingNode.provider_last_fetched_at as any) ? (
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {new Date(editingNode.provider_last_fetched_at as any).toLocaleString()}
                </div>
              ) : (
                <div className="text-zinc-400 italic">Jamais synchronisé</div>
              )}

              {editingNode.provider_last_error && (
                <div className="mt-2 flex items-start gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/20">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{editingNode.provider_last_error}</span>
                </div>
              )}
            </div>
          )}

          {/* Global Error */}
          {inlineError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2 animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{inlineError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" onClick={onClose} className="hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50">
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canCreate || saving}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{nodeId ? 'Enregistrement…' : 'Création…'}</>
            ) : (
              nodeId ? 'Enregistrer les modifications' : 'Créer le nœud API'
            )}
          </Button>
        </div>
      </DialogContent>
      <style>{`
        .custom-scroll { scrollbar-gutter: stable; }
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.3); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(161, 161, 170, 0.5); }
      `}</style>
    </Dialog>
  );
}
