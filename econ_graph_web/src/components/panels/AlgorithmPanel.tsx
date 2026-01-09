"use client";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useNodeTones } from "@/lib/api/hooks";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import {
  Calculator,
  Lightbulb,
  Loader2,
  Maximize2,
  Minimize2,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface AlgorithmPanelProps {
  nodeId: string;
}

export function AlgorithmPanel({ nodeId }: AlgorithmPanelProps) {
  const { nodes: availableNodes } = useGraphData();
  const graphActions = useGraphActions();
  const computeFn = graphActions.computeNode;
  const currentNode = availableNodes.find((n) => n.id === nodeId);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: toneMap } = useNodeTones(currentProjectId);

  const [definition, setDefinition] = useState<string>(
    currentNode?.computation_definition || ""
  );
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const popPanel = useUIStore((s) => s.popPanel);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleGenerateAi = async (force = false) => {
    if (!force) {
      setAiPromptOpen(true);
      return;
    }

    setAiPromptOpen(false);
    setIsGeneratingAi(true);
    setSuggestions([]); // Clear previous suggestions
    setDefinition(""); // Clear to show ghost text
    try {
      const context = {
        nodeId: currentNode?.id,
        label: currentNode?.label,
        unit: (currentNode as any)?.unit,
        description: (currentNode as any)?.notes,
        inputs: inputNodeOptions.map((n) => ({
          id: n.id,
          label: n.label,
          unit: (n as any)?.unit,
          description: (n as any)?.notes,
        })),
        currentCode: definition, // Pass existing code for modification
      };

      const res = await fetch("http://localhost:8000/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            aiPrompt ||
            `Generate a Python compute function for node '${
              currentNode?.label
            }' (${currentNode?.id}). Inputs: ${inputNodeOptions
              .map((n) => n.id)
              .join(", ")}.`,
          context,
        }),
      });

      const data = await res.json();
      if (data.text) {
        setDefinition(data.text);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("AI Generation failed", error);
      // setInlineError("Erreur lors de la génération IA"); // Assuming inlineError logic exists or is handled elsewhere
    } finally {
      setIsGeneratingAi(false);
    }
  };
  // Templates helpers
  const buildParams = (n: number) =>
    inputNodeOptions
      .slice(0, n)
      .map((x) => x.id)
      .join(", ") ||
    Array.from({ length: n })
      .map((_, i) => `x${i + 1}`)
      .join(", ");
  const insertTemplate = (
    tpl: "constant" | "expression" | "condition" | "math"
  ) => {
    if (tpl === "constant") {
      setDefinition("def compute():\n    return 42");
    } else if (tpl === "expression") {
      const params = buildParams(2) || "a, b";
      const [a, b] = params.split(",").map((s) => s.trim()) as string[];
      setDefinition(`def compute(${params}):\n    return ${a} + ${b}`);
    } else if (tpl === "condition") {
      const params = buildParams(2) || "signal, seuil";
      const [s, t] = params.split(",").map((s) => s.trim()) as string[];
      setDefinition(
        `def compute(${params}):\n    if ${s} is None or ${t} is None:\n        return 0\n    if ${s} > ${t}:\n        return 1\n    else:\n        return 0`
      );
    } else if (tpl === "math") {
      const p = buildParams(1) || "x";
      const varName = p.split(",")[0].trim();
      setDefinition(
        `def compute(${p}):\n    # Exemple: racine carrée sécurisée\n    v = ${varName} if ${varName} is not None else 0\n    return math.sqrt(abs(v))`
      );
    }
  };

  const inputNodeOptions = useMemo(
    () => availableNodes.filter((node) => node.id !== nodeId),
    [availableNodes, nodeId]
  );

  useEffect(() => {
    if (currentNode?.computation_definition) {
      setDefinition(currentNode.computation_definition);
    } else if (!definition.trim()) {
      // Pre-fill with standard default
      if (inputNodeOptions.length > 0) {
        const firstVar = inputNodeOptions[0].id;
        setDefinition(
          `def compute(${firstVar}):\n    # Exemple par défaut\n    return 42 * ${firstVar}`
        );
      } else {
        setDefinition(
          "def compute():\n    # Exemple par défaut\n    return 42"
        );
      }
    }
  }, [currentNode?.computation_definition, nodeId, inputNodeOptions]);

  const placeholder = "";

  const handleSave = async () => {
    setInlineError(null);
    const code = definition.trim();
    if (!code) return setInlineError("Veuillez saisir un algorithme.");
    if (!/\bdef\s+compute\s*\(/.test(code))
      return setInlineError(
        "L'algorithme doit définir une fonction 'compute(...)'."
      );
    if (!/\breturn\b/.test(code))
      return setInlineError(
        "Ajoutez une instruction 'return' qui renvoie le résultat."
      );

    const setIsComputing = useUIStore.getState().setIsComputing;
    try {
      setSaving(true);
      await graphActions.updateNode(nodeId, {
        computation_definition: code,
        value_computed: null,
      } as any);

      if (computeFn) {
        setIsComputing(true);
        await computeFn(nodeId);
      }
      popPanel();
    } catch (e) {
      console.error("Algorithm save error", e);
    } finally {
      setSaving(false);
      setIsComputing(false);
    }
  };

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        if (definition.trim() && !saving) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [definition, saving]);

  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  const variableOptions = useMemo(
    () =>
      inputNodeOptions.map((n) => ({
        id: n.id,
        label: n.label,
        tone: (toneMap as any)?.[n.id]?.tone,
        isComposite: Boolean(n.composite_id),
      })),
    [inputNodeOptions, toneMap]
  );

  const EditorBlock = (
    <div className="space-y-3 py-3">
      <div className="space-y-2 relative group">
        {/* AI Prompt Dialog */}
        <Dialog open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Générer avec l'IA</DialogTitle>
              <DialogDescription>
                Décrivez ce que le nœud doit calculer. L'IA utilisera les
                variables disponibles.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: Calcule la moyenne pondérée des entrées si elles sont positives..."
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAiPromptOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => handleGenerateAi(true)}
                disabled={isGeneratingAi}
              >
                {isGeneratingAi ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Générer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-2">
          <Label className="text-zinc-900 dark:text-zinc-100">
            Algorithme Python *
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            title="Aide: exemples de code pour démarrer"
            onClick={() => setHelpOpen(true)}
            aria-label="Aide algorithme"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 gap-1.5"
            onClick={() => setAiPromptOpen(true)}
            disabled={isGeneratingAi}
          >
            {isGeneratingAi ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            IA
          </Button>
        </div>
        {/* Discreet helper button (appears on hover) */}
        <button
          type="button"
          className="absolute right-0 -top-1 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 text-xs px-2 py-1"
          title="Aide: templates d'exemples (conseil: connaître les bases de Python)"
          aria-label="Templates d'exemples"
          onClick={() => setTemplateMenuOpen((v) => !v)}
        >
          •••
        </button>
        {templateMenuOpen && (
          <div className="absolute z-20 right-0 mt-6 w-56 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
            <div className="px-3 py-2 text-[12px] text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              Exemples pour démarrer. Idéalement, apprenez les bases de Python.
            </div>
            <ul className="py-1 text-sm text-zinc-900 dark:text-zinc-100">
              {[
                { id: "constant", label: "Constante" },
                { id: "expression", label: "Expression" },
                { id: "condition", label: "Condition" },
                { id: "math", label: "Math" },
              ].map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    onClick={() => {
                      insertTemplate(opt.id as any);
                      setTemplateMenuOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <CodeEditor
          value={definition}
          onChange={setDefinition}
          language="python"
          height={fullscreen ? "calc(100vh - 56px)" : "360px"}
          placeholder={placeholder}
          availableConstants={inputNodeOptions.map((n) => n.id)}
          variables={variableOptions}
          showVariablePalette
          enableCompletion={false}
          suggestions={isGeneratingAi ? [] : suggestions}
          isLoading={isGeneratingAi}
          showSnippets
        />
        {/* Help modal with example snippets */}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Exemples pour démarrer</DialogTitle>
              <DialogDescription>
                Inspirez-vous de ces modèles. Conseil: maîtriser les bases de
                Python rend l’outil plus efficace.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  t: "Somme simple",
                  c: `def compute(a, b):\n    return (a or 0) + (b or 0)`,
                },
                {
                  t: "Seuil (if/else)",
                  c: `def compute(signal, seuil):\n    if signal is None or seuil is None:\n        return 0\n    return 1 if signal > seuil else 0`,
                },
                {
                  t: "Normalisation",
                  c: `def compute(x):\n    v = 0 if x is None else x\n    return (v - 100) / 10`,
                },
                { t: "Constante", c: `def compute():\n    return 42` },
              ].map((ex, i) => (
                <div
                  key={i}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3"
                >
                  <div className="text-sm font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
                    {ex.t}
                  </div>
                  <pre className="text-xs bg-zinc-50 dark:bg-zinc-900 p-2 rounded overflow-auto text-zinc-900 dark:text-zinc-100">
                    <code>{ex.c}</code>
                  </pre>
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setDefinition(ex.c);
                        setHelpOpen(false);
                      }}
                    >
                      Insérer ce code
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        {inlineError && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 rounded p-2">
            {inlineError}
          </div>
        )}
        {!fullscreen && (
          <details className="text-xs text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <summary className="cursor-pointer select-none px-3 py-2 bg-zinc-50 dark:bg-zinc-900 flex items-center gap-2">
              <Lightbulb className="h-3 w-3" /> Guide rapide (optionnel)
            </summary>
            <div className="space-y-1 px-3 py-2">
              <p>• Utilisez Tab pour indenter votre code (4 espaces)</p>
              <p>
                • Opérations supportées : if/else, +, -, *, /, min/max, abs,
                round, etc.
              </p>
              <p>• Aucun import autorisé (restriction de sécurité)</p>
              <p>• Timeout : 5 secondes maximum</p>
              <p className="text-blue-600 dark:text-blue-400">
                • Exemple :{" "}
                <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">{`if PIB > 0: return PIB * 1.05 else: return 0`}</code>
              </p>
            </div>
          </details>
        )}
      </div>
    </div>
  );

  const Toolbar = (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        <Calculator className="h-4 w-4 text-blue-600" /> Algorithme
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullscreen((v) => !v)}
        >
          {fullscreen ? (
            <>
              <Minimize2 className="h-4 w-4 mr-1" />
              Réduire
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4 mr-1" />
              Plein écran
            </>
          )}
        </Button>
        <Button onClick={handleSave} disabled={!definition.trim() || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer & Calculer
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <Calculator className="h-4 w-4 text-blue-600" /> Algorithme — Plein
            écran
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullscreen(false)}
            >
              <Minimize2 className="h-4 w-4 mr-1" /> Réduire
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullscreen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {EditorBlock}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 flex justify-end">
          <Button onClick={handleSave} disabled={!definition.trim() || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer & Calculer
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {Toolbar}
      {EditorBlock}
      {/* Styles for compact ribbon scrollbars re-used here */}
      <style>{`
        .custom-scroll { scrollbar-gutter: stable both-edges; }
        .custom-scroll::-webkit-scrollbar { height: 8px; width: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(100,100,100,.35); border-radius: 8px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
