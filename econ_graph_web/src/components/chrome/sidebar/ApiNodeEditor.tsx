"use client";

import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { apiClient } from "@/lib/api/client";
import type { NodeCreate, NodeUpdate } from "@/lib/types";
import { useUIStore } from "@/store/uiState";
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Database,
    Globe,
    Loader2,
    Play,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SidebarContainer } from "./SidebarContainer";

interface ApiNodeEditorProps {
  mode: "create" | "edit";
  nodeId: string | null;
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

export function ApiNodeEditor({ mode, nodeId }: ApiNodeEditorProps) {
  const isEditing = mode === "edit";
  const { nodes } = useGraphData();
  const graphActions = useGraphActions();
  const computeFn = graphActions.computeNode;
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const [saving, setSaving] = useState(false);

  const editingNode = useMemo(
    () => nodes.find((n) => n.id === nodeId),
    [nodes, nodeId]
  );

  const setNodeCreationDraft = useUIStore((s) => s.setNodeCreationDraft);
  const nodeCreationDraft = useUIStore((s) => s.nodeCreationDraft);
  const resetNodeCreationDraft = useUIStore((s) => s.resetNodeCreationDraft);

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

  // Sync local state to draft when in create mode
  useEffect(() => {
    if (!nodeId) {
      const timer = setTimeout(() => {
        setNodeCreationDraft({ label, slug, unit, notes, url, jsonPath });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [nodeId, label, slug, unit, notes, url, jsonPath, setNodeCreationDraft]);

  useEffect(() => {
    if (!isEditing && !slugEdited) {
      setSlug(kebabify(label || "api-node"));
    }
  }, [label, isEditing, slugEdited]);

  useEffect(() => {
    if (nodeId && editingNode) {
      setLabel(editingNode.label || "");
      setSlug(editingNode.slug || editingNode.id || "");
      setSlugEdited(true);
      setUnit((editingNode.unit as any) || "");
      setNotes((editingNode.notes as any) || "");
      setUrl((editingNode.provider_url as any) || "");
      setJsonPath((editingNode.provider_json_path as any) || "");
    } else if (!nodeId) {
      // Load from draft
      setLabel(nodeCreationDraft.label || "");
      setSlug(nodeCreationDraft.slug || "");
      setUnit(nodeCreationDraft.unit || "");
      setNotes(nodeCreationDraft.notes || "");
      setUrl(nodeCreationDraft.url || "");
      setJsonPath(nodeCreationDraft.jsonPath || "");
      if (nodeCreationDraft.slug) setSlugEdited(true);
    }
  }, [nodeId, editingNode]); // Run when nodeId or editingNode changes (and on mount)

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
      setNodeEditorMode(null);
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

  const handleClose = () => {
    setNodeEditorMode(null);

    // If we were editing a node, reopen the inspector with that node selected
    if (mode === 'edit' && nodeId) {
      // Small delay to let the NodeEditor close first
      setTimeout(() => {
        useUIStore.getState().setInspectorOpen(true);
      }, 100);
    }
  };

  return (
    <SidebarContainer
      useFixedPosition={false}
      header={
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {nodeId ? "Modifier le nœud API" : "Nouveau nœud API"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!nodeId && (
              <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 mr-2">
                <button
                  onClick={() => setNodeEditorMode('create')}
                  className="px-2 py-1 text-[10px] font-medium rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Standard
                </button>
                <button
                  className="px-2 py-1 text-[10px] font-medium rounded-md bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm cursor-default flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  API
                </button>
              </div>
            )}
            <Separator orientation="vertical" className="h-4" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-7 px-2 text-xs hover:bg-zinc-400 dark:hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || saving}
              size="sm"
              className="h-7 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              {nodeId ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-0 overflow-y-auto custom-scrollbar">
        {/* General Info Section */}
        <div className="px-4 py-4 space-y-4 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-0.5 bg-blue-500 rounded-full" />
            <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
              Informations générales
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                Label
              </Label>
              <InfoHint title="Nom lisible">Nom affiché sur le graphe.</InfoHint>
            </div>
            <Input
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              placeholder="Ex: Taux de change USD/EUR"
              className="h-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  Code
                </Label>
                <InfoHint title="Identifiant unique">ID technique.</InfoHint>
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
                  className="h-8 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                />
                {isEditing && (
                  <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                    <span className="text-[9px] text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded">
                      Lecture seule
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                Unité
              </Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.currentTarget.value)}
                placeholder="%, €, level..."
                className="h-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
              Notes
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              placeholder="Description ou contexte..."
              className="h-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm"
            />
          </div>
        </div>

        {/* API Configuration Section */}
        <div className="px-4 py-4 space-y-4 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-0.5 bg-purple-500 rounded-full" />
            <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
              Configuration API
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                URL Endpoint
              </Label>
              <InfoHint title="URL HTTP">L'adresse de l'API qui retourne le JSON.</InfoHint>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Globe className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.currentTarget.value)}
                placeholder="https://api.example.com/data"
                className="h-8 pl-8 font-mono text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                Chemin JSON
              </Label>
              <InfoHint title="Extraction">Chemin pour extraire la valeur numérique.</InfoHint>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Database className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <Input
                value={jsonPath}
                onChange={(e) => setJsonPath(e.currentTarget.value)}
                placeholder="ex: data.values[0].price"
                className="h-8 pl-8 font-mono text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* Test Section */}
        <div className="px-4 py-4 space-y-3 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Test de connexion
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testLoading || !url.trim()}
              className="h-7 text-[11px] gap-1.5 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-400 dark:hover:bg-white/5"
            >
              {testLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {testLoading ? "Test..." : "Tester"}
            </Button>
          </div>

          {/* Test Results */}
          {(testValue || testError) && (
            <div
              className={`rounded-lg p-3 text-xs flex items-start gap-2.5 border ${
                testValue
                  ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-900/30"
                  : "bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-900/30"
              }`}
            >
              {testValue ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1 min-w-0">
                <div
                  className={`font-medium ${
                    testValue
                      ? "text-emerald-900 dark:text-emerald-100"
                      : "text-red-900 dark:text-red-100"
                  }`}
                >
                  {testValue ? "Valeur récupérée" : "Échec"}
                </div>
                {testValue && (
                  <div className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-300">
                    {testValue}{" "}
                    <span className="text-[10px] font-normal text-emerald-600/70">
                      {unit}
                    </span>
                  </div>
                )}
                {testError && (
                  <div className="text-[10px] text-red-700 dark:text-red-300 break-all">
                    {testError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raw JSON Preview */}
          {testRaw != null && (
            <details
              className="group rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 overflow-hidden"
              open={rawOpen}
              onToggle={(e) => setRawOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2 hover:bg-zinc-400 dark:hover:bg-white/5 transition-colors">
                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                Voir la réponse JSON brute
              </summary>
              <div className="px-3 pb-3 pt-0 border-t border-zinc-100/50 dark:border-zinc-800/50">
                <pre className="mt-2 text-[9px] font-mono text-zinc-600 dark:text-zinc-300 overflow-auto max-h-32 p-2 rounded bg-zinc-50/50 dark:bg-zinc-900/50">
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

        {/* Last Fetch Info (if editing) */}
        {nodeId && editingNode && (
          <div className="px-4 py-3 border-b border-white/10 dark:border-white/5">
            <div className="rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 text-[11px] space-y-2">
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">
                <InfoHint title="Statut">État de la dernière synchronisation.</InfoHint>
                <span className="text-[10px]">Dernière synchro</span>
              </div>

              {(editingNode.provider_last_fetched_at as any) ? (
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs">
                    {new Date(editingNode.provider_last_fetched_at as any).toLocaleString()}
                  </span>
                </div>
              ) : (
                <div className="text-zinc-400 italic text-xs">Jamais synchronisé</div>
              )}

              {editingNode.provider_last_error && (
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 p-2 rounded border border-red-100/50 dark:border-red-900/20">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span className="text-[10px]">{editingNode.provider_last_error}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Error */}
        {inlineError && (
          <div className="px-4 py-3">
            <div className="rounded-lg bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {inlineError}
              </p>
            </div>
          </div>
        )}
      </div>
    </SidebarContainer>
  );
}
