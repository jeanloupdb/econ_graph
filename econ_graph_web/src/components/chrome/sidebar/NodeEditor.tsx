"use client";

import { FullscreenCodeEditor } from "@/components/panels/Inspector/FullscreenCodeEditor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { apiClient } from "@/lib/api/client";
import type { NodeToneKey } from "@/lib/api/hooks";
import { useComputeAll, useNodeTones } from "@/lib/api/hooks";
import type { Node, NodeCreate, NodeUnit, NodeUpdate } from "@/lib/types";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import Editor from "@monaco-editor/react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit2,
  Globe,
  Loader2,
  Maximize2,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SidebarContainer } from "./SidebarContainer";

interface NodeEditorProps {
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

const resolveCompositeSlug = (node?: Node | null) =>
  node?.slug ||
  (node as any)?.raw_internal_id ||
  node?.composite_roots?.[0]?.slug ||
  node?.composite_roots?.[0]?.label ||
  node?.composite_root_ids?.[0] ||
  node?.id ||
  "";

export function NodeEditor({ mode, nodeId }: NodeEditorProps) {
  const { nodes: availableNodes } = useGraphData();
  const graphActions = useGraphActions();
  const computeAll = useComputeAll();
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const computeAvailable = graphActions.computeNode;
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: toneMap } = useNodeTones(currentProjectId);

  const setNodeCreationDraft = useUIStore((s) => s.setNodeCreationDraft);
  const nodeCreationDraft = useUIStore((s) => s.nodeCreationDraft);
  const resetNodeCreationDraft = useUIStore((s) => s.resetNodeCreationDraft);
  const nodeEditorFullscreenOpen = useUIStore(
    (s) => s.nodeEditorFullscreenOpen
  );
  const setNodeEditorFullscreenOpen = useUIStore(
    (s) => s.setNodeEditorFullscreenOpen
  );
  const developerMode = useUIStore((s) => s.developerMode);

  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [code, setCode] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isCreatingNode, setIsCreatingNode] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const editorRef = useRef<unknown>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const existingNode = useMemo(() => {
    if (!nodeId) return undefined;
    return availableNodes.find((n) => n.id === nodeId);
  }, [availableNodes, nodeId]);

  // Sync local state to draft when in create mode
  useEffect(() => {
    if (mode === "create") {
      const timer = setTimeout(() => {
        setNodeCreationDraft({ label, slug, unit, notes, code });
      }, 300); // Debounce slightly
      return () => clearTimeout(timer);
    }
  }, [mode, label, slug, unit, notes, code, setNodeCreationDraft]);

  // Sync fullscreen state with global store
  useEffect(() => {
    if (nodeEditorFullscreenOpen && !isFullscreenOpen) {
      setIsFullscreenOpen(true);
      setNodeEditorFullscreenOpen(false); // Reset the trigger
    }
  }, [nodeEditorFullscreenOpen, isFullscreenOpen, setNodeEditorFullscreenOpen]);

  // Initialize form values once per open/nodeId
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = nodeId ? `edit:${nodeId}` : "create:new";
    // If we are just switching modes (create <-> create-api), we might not want to re-init if we want to persist?
    // Actually, the user wants persistence when switching.
    // So if we switch from create-api to create, we want to load from draft.

    // However, initKeyRef logic prevents re-running this effect if key hasn't changed.
    // 'create:new' is constant for create mode.
    // But if we unmount NodeEditor and mount ApiNodeEditor, then remount NodeEditor, this effect runs.

    if (initKeyRef.current === key) return;

    if (mode === "edit" && nodeId) {
      if (!existingNode) return;
      setLabel(existingNode.label);
      setSlug(resolveCompositeSlug(existingNode));
      setUnit((existingNode.unit as string) || "");
      setNotes((existingNode.notes as string) || "");
      const def = (
        (existingNode as any).computation_definition || ""
      ).toString();
      if (def) setCode(def);
    } else {
      // Load from draft
      setLabel(nodeCreationDraft.label || "");
      setSlug(nodeCreationDraft.slug || "");
      setUnit(nodeCreationDraft.unit || "");
      setNotes(nodeCreationDraft.notes || "");
      setCode(
        nodeCreationDraft.code ||
          "def compute():\n    # Write your code here\n    return 0"
      );
      setChatHistory([]);

      if (!nodeCreationDraft.slug && !nodeCreationDraft.label) {
        // Only auto-generate slug if draft is empty
        // setSlug(kebabify('nouveau-noeud'));
      }
    }
    initKeyRef.current = key;
  }, [mode, nodeId, availableNodes, existingNode]); // Removed nodeCreationDraft from deps to avoid loop, read from store directly or use ref if needed.
  // Actually, using the prop `nodeCreationDraft` in useEffect dependency might cause loops if we update it.
  // But we only run this effect when `initKeyRef` changes (mount).
  // So it should be fine to read the initial value.

  const canCreate =
    slug.trim().length > 0 && label.trim().length > 0 && code.trim().length > 0;

  const availableVariableIds = useMemo(() => {
    return availableNodes
      .map((n) => resolveCompositeSlug(n) || n.id || "")
      .filter((id): id is string => Boolean(id));
  }, [availableNodes]);

  const availableVariableOptions = useMemo(
    () =>
      availableNodes
        .map((n) => {
          const variableId = resolveCompositeSlug(n) || n.id;
          if (!variableId) {
            return null;
          }
          const tone = ((
            toneMap as Record<string, { tone?: NodeToneKey }> | undefined
          )?.[n.id]?.tone || undefined) as NodeToneKey | undefined;
          return {
            id: variableId,
            label: n.label,
            tone,
            isComposite: Boolean(n.composite_id),
          };
        })
        .filter(
          (
            entry
          ): entry is {
            id: string;
            label: string;
            tone: NodeToneKey | undefined;
            isComposite: boolean;
          } => Boolean(entry)
        ),
    [availableNodes, toneMap]
  );

  const detectedInputs = useMemo(() => {
    const used: string[] = [];
    const src = code || "";
    availableVariableIds.forEach((candidateRaw) => {
      const candidate = candidateRaw.trim();
      if (!candidate) return;
      const re = new RegExp(
        `\\b${candidate.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`,
        "g"
      );
      if (re.test(src)) used.push(candidate);
    });
    return used;
  }, [code, availableVariableIds]);

  const normalizedCode = useMemo(() => {
    const c = code.trim();
    if (!c) return "";
    if (/\bdef\s+compute\s*\(/.test(c)) return c;
    const fallbackParams =
      detectedInputs.length > 0
        ? detectedInputs
        : availableVariableIds.length > 0
        ? ["x", "y"]
        : [];
    const paramsSegment = fallbackParams.join(", ");
    if (paramsSegment.length === 0) {
      const body = c.includes("\n") ? c : `    return ${c}`;
      return `def compute():\n${body}`;
    }
    const body = c.includes("\n") ? c : `    return ${c}`;
    return `def compute(${paramsSegment}):\n${body}`;
  }, [code, detectedInputs, availableVariableIds.length]);

  const handleCreate = async () => {
    setInlineError(null);
    if (saving) return;
    if (!canCreate) return;

    if (!/\bdef\s+compute\s*\(/.test(normalizedCode)) {
      setInlineError("Le code doit définir une fonction 'compute(...)'.");
      return;
    }
    if (!/\breturn\b/.test(normalizedCode)) {
      setInlineError("Ajoutez une instruction 'return'.");
      return;
    }

    const payload: NodeCreate = {
      slug: slug.trim(),
      label,
      unit: (unit as NodeUnit) || "",
      status: "unknown",
      confidence: 0.5,
      notes: notes || null,
      value_computed: null,
      computation_definition: normalizedCode,
    };

    const setIsComputing = useUIStore.getState().setIsComputing;
    try {
      setSaving(true);
      if (mode === "create") {
        const created = await graphActions.createNode(payload);
        if (computeAvailable) {
          setIsComputing(true);
          await computeAvailable(created.id);
          setIsComputing(false);
        }
        setSelectedNodeId(created.id);
      } else if (nodeId) {
        const updatePayload: NodeUpdate = {
          label,
          unit: (unit as NodeUnit) || "",
          notes,
          value_computed: null,
          computation_definition: normalizedCode,
        };
        await graphActions.updateNode(nodeId, updatePayload);
        if (computeAvailable) {
          setIsComputing(true);
          await computeAvailable(nodeId);
          setIsComputing(false);
        }
      }
      // Close the editor and sidebar completely after save
      setNodeEditorMode(null);
      useUIStore.getState().clearPanels();
      useUIStore.getState().setInspectorOpen(false);
      useUIStore.getState().setSelectedNodeId(null);
    } catch (e) {
      setInlineError(
        (e as any)?.message ||
          (nodeId
            ? "Erreur lors de la mise à jour"
            : "Erreur lors de la création")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) return;

    // Build enriched context with all available nodes
    const context = {
      label: label || "Nouveau nœud",
      unit: unit,
      description: notes,
      inputs: availableNodes.map((n) => ({
        id: resolveCompositeSlug(n),
        label: n.label,
        unit: (n as any)?.unit,
        description: (n as any)?.notes,
      })),
      currentCode: mode === "edit" ? code : undefined,
      nodeId: mode === "edit" ? nodeId : undefined,
      graphContext: {
        totalNodes: availableNodes.length,
        availableNodes: availableNodes.map((n) => ({
          id: n.id,
          slug: resolveCompositeSlug(n),
          label: n.label,
          type: (n as any).composite_id
            ? "composite"
            : (n as any).computation_definition
            ? "computed"
            : "parameter",
          unit: (n as any)?.unit,
          value: (n as any)?.value_computed,
          description: (n as any)?.notes,
          hasError: Boolean((n as any)?.computation_error),
        })),
      },
    };

    // Mode création : créer le nœud directement
    if (mode === "create") {
      setIsCreatingNode(true);
      setChatHistory((prev) => [...prev, { role: "user", content: aiPrompt }]);

      try {
        const data = await apiClient.post<{
          node_id: string;
          label: string;
          slug: string;
          code: string;
          message: string;
        }>("/ai/create-node", {
          prompt: aiPrompt,
          project_id: currentProjectId,
          context,
        });

        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✓ Nœud "${data.label}" créé avec succès`,
          },
        ]);
        toast.success(`Nœud "${data.label}" créé`);
        setAiPrompt("");

        // 1. First trigger compute all to calculate the new node and dependents
        try {
          await computeAll.mutateAsync();
        } catch (e) {
          console.warn("Compute all after node creation failed:", e);
        }
        
        // 2. Then refresh nodes to get updated data from backend (await ensures we have fresh data)
        await graphActions.refreshNodes();

        // 3. Close node editor and open baseline panel with the new node selected
        setNodeEditorMode(null);
        setSelectedNodeId(data.node_id);
        useUIStore.getState().setScenarioPanelOpen(true);
      } catch (error) {
        console.error("AI Node Creation failed", error);
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: `✗ Erreur lors de la création` },
        ]);
        toast.error("Erreur lors de la création du nœud");
      } finally {
        setIsCreatingNode(false);
      }
    } else {
      // Mode édition : générer seulement le code
      setIsGeneratingAi(true);
      setChatHistory((prev) => [...prev, { role: "user", content: aiPrompt }]);

      try {
        const data = await apiClient.post<{ text: string }>("/ai/generate", {
          prompt: aiPrompt,
          context,
        });

        if (data.text) {
          setCode(data.text);
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: `✓ Code généré` },
          ]);
        }
        setAiPrompt("");
      } catch (error) {
        console.error("AI Generation failed", error);
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: `✗ Erreur lors de la génération` },
        ]);
        toast.error("Erreur lors de la génération IA");
      } finally {
        setIsGeneratingAi(false);
      }
    }
  };

  const handleClose = () => {
    // Close the node editor and the inspector sidebar completely
    setNodeEditorMode(null);
    useUIStore.getState().clearPanels();
    useUIStore.getState().setInspectorOpen(false);
    useUIStore.getState().setSelectedNodeId(null);
  };

  // Show loading overlay when creating node with AI
  if (isCreatingNode) {
    return (
      <SidebarContainer
        useFixedPosition={false}
        header={
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-500 animate-pulse" />
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Création en cours...
              </span>
            </div>
          </div>
        }
      >
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="flex flex-col items-center gap-6 max-w-sm text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative p-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl">
                <Sparkles className="h-12 w-12 text-white animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                L'IA crée votre nœud
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Génération du code, création dans le graph et calcul de la
                valeur...
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Cela peut prendre quelques secondes</span>
            </div>
          </div>
        </div>
      </SidebarContainer>
    );
  }

  return (
    <SidebarContainer
      useFixedPosition={false}
      header={
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2">
            {mode === "edit" ? (
              <Edit2 className="h-4 w-4 text-blue-500" />
            ) : (
              <Plus className="h-4 w-4 text-blue-500" />
            )}
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {mode === "edit" ? "Modifier le nœud" : "Nouveau nœud"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mode === "create" && (
              <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 mr-2">
                <button className="px-2 py-1 text-[10px] font-medium rounded-md bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm cursor-default">
                  Standard
                </button>
                <button
                  onClick={() => setNodeEditorMode("create-api")}
                  className="px-2 py-1 text-[10px] font-medium rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1"
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
            {mode === "edit" && (
              <Button
                onClick={handleCreate}
                disabled={!canCreate || saving}
                size="sm"
                className="h-7 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : null}
                Enregistrer
              </Button>
            )}
          </div>
        </div>
      }
      footer={
        developerMode && mode === "edit" && nodeId ? (
          <div className="p-3 pt-0">
            <button
              onClick={() => {
                // Open AI bar in selection mode with this node selected and pre-filled text
                const nodeName = existingNode?.label || "ce nœud";
                useUIStore.setState({
                  mode: "ai-select",
                  selectedNodeIds: [nodeId],
                  aiAssistantOpen: true,
                  aiPromptPrefill: `Apporte les modifications suivantes au nœud "${nodeName}" :\n- `,
                });
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-colors shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <span>Modifier avec l'IA</span>
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        {/* Error Section */}
        {inlineError && (
          <div className="px-4 py-3 border-b border-white/10 dark:border-white/5">
            <div className="rounded-lg bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {inlineError}
              </p>
            </div>
          </div>
        )}

        {/* Accordion Sections */}
        <Accordion type="multiple" defaultValue={["info"]} className="w-full">
          {/* Section: Informations générales */}
          <AccordionItem
            value="info"
            className="border-b border-white/10 dark:border-white/5"
          >
            <AccordionTrigger className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:no-underline hover:bg-zinc-400 dark:hover:bg-white/5">
              Informations générales
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="node-label"
                    className="text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    Nom
                  </Label>
                  <Input
                    id="node-label"
                    type="text"
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      if (!slug.trim() || slug === kebabify(label)) {
                        setSlug(kebabify(e.target.value || "nouveau-noeud"));
                      }
                    }}
                    placeholder="Ex: Chiffre d'affaires"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500 dark:text-zinc-400">
                    Code
                  </Label>
                  <code className="block text-zinc-900 dark:text-zinc-100 font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 rounded">
                    {slug || (
                      <span className="text-zinc-400 italic not-italic">
                        auto-généré
                      </span>
                    )}
                  </code>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="node-unit"
                    className="text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    Unité
                  </Label>
                  <Input
                    id="node-unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Ex: €, %, unité..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section: Notes */}
          <AccordionItem
            value="notes"
            className="border-b border-white/10 dark:border-white/5"
          >
            <AccordionTrigger className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:no-underline hover:bg-zinc-400 dark:hover:bg-white/5">
              Notes
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez des notes ou une description..."
                rows={4}
                className="text-xs resize-none"
              />
            </AccordionContent>
          </AccordionItem>

          {/* Section: Code Python */}
          <AccordionItem
            value="code"
            className="border-b border-white/10 dark:border-white/5"
          >
            <AccordionTrigger className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:no-underline hover:bg-zinc-400 dark:hover:bg-white/5">
              Code Python
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="relative rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-950">
                {/* Header avec boutons copier et plein écran */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                    Python
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFullscreenOpen(true)}
                      className="h-6 px-2 text-xs gap-1.5"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Plein écran
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (code.trim()) {
                          navigator.clipboard.writeText(code);
                          toast.success("Code copié");
                        }
                      }}
                      disabled={!code.trim()}
                      className="h-6 px-2 text-xs gap-1.5"
                    >
                      <Copy className="h-3 w-3" />
                      Copier
                    </Button>
                  </div>
                </div>
                {/* Monaco Editor */}
                <div
                  className="h-[400px]"
                  data-node-editor-monaco="true"
                  onKeyDown={(e) => {
                    // Empêche COMPLÈTEMENT la propagation
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  onKeyUp={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                >
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    language="python"
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    theme="vs-dark"
                    onMount={(editor) => {
                      editorRef.current = editor;
                      // Focus l'éditeur immédiatement
                      editor.focus();
                      // Re-focus après un court délai pour être sûr
                      setTimeout(() => editor.focus(), 50);
                      setTimeout(() => editor.focus(), 200);
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 4,
                      insertSpaces: true,
                      wordWrap: "off",
                      lineNumbersMinChars: 3,
                      folding: false,
                      renderLineHighlight: "line",
                      contextmenu: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      scrollbar: {
                        vertical: "visible",
                        horizontal: "visible",
                        useShadows: false,
                      },
                      padding: { top: 12, bottom: 12 },
                      // Désactive les suggestions mais garde la saisie normale
                      quickSuggestions: false,
                      suggestOnTriggerCharacters: false,
                      wordBasedSuggestions: "off",
                    }}
                    loading={
                      <div className="flex items-center justify-center h-full bg-zinc-900 text-zinc-400 text-sm">
                        Chargement...
                      </div>
                    }
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section: Dépendances détectées */}
          {detectedInputs.length > 0 && (
            <AccordionItem
              value="dependencies"
              className="border-b border-white/10 dark:border-white/5"
            >
              <AccordionTrigger className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:no-underline hover:bg-zinc-400 dark:hover:bg-white/5">
                Dépendances détectées
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-1">
                  {detectedInputs.map((varId) => {
                    const varInfo = availableVariableOptions.find(
                      (v) => v.id === varId
                    );
                    return (
                      <div
                        key={varId}
                        className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                      >
                        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-green-900 dark:text-green-100 font-medium truncate">
                            {varInfo?.label || varId}
                          </div>
                          <code className="text-[10px] font-mono text-green-700 dark:text-green-300">
                            {varId}
                          </code>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      <FullscreenCodeEditor
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        code={code}
        onCodeChange={setCode}
        variables={availableVariableOptions}
        nodeLabel={label || "Nouveau nœud"}
      />
    </SidebarContainer>
  );
}
