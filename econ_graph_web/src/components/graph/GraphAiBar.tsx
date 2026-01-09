"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useAiGraphAction } from "@/graph/hooks/useAiGraphAction";
import {
  useComposites,
  useNodeTones,
  useScenarios,
  useTheme,
} from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import {
  ArrowUp,
  ChevronDown,
  Circle,
  FileText,
  Loader2,
  MousePointer2,
  Plus,
  Sparkles,
  Wand2,
  X as XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Composite {
  id: string;
  name: string;
  description?: string;
  graph_data?: {
    nodes?: Array<{ id: string; slug?: string; label: string }>;
    edges?: Array<{ target: string }>;
  };
}

interface GraphNode {
  id: string;
  label: string;
  composite_id?: string;
  computation_error?: string;
}

export function GraphAiBar({
  mode = "project",
}: {
  mode?: "project" | "composite";
}) {
  // Store states
  const isExpanded = useUIStore((s) => s.aiAssistantOpen);
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);
  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const setNodeEditorNodeId = useUIStore((s) => s.setNodeEditorNodeId);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((s) => s.setSelectedNodeIds);
  const uiMode = useUIStore((s) => s.mode);
  const aiPromptPrefill = useUIStore((s) => s.aiPromptPrefill);
  const setAiPromptPrefill = useUIStore((s) => s.setAiPromptPrefill);
  const developerMode = useUIStore((s) => s.developerMode);

  // Local states
  const [prompt, setPrompt] = useState("");
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<"node" | "scenario" | null>(
    null
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Derive aiMode from uiMode or creationMode
  const aiMode: "global" | "selection" | "creation" = creationMode
    ? "creation"
    : uiMode === "ai-select"
    ? "selection"
    : "global";

  // Data hooks
  const { nodes } = useGraphData();
  const { data: composites = [] } = useComposites();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const graphActions = useGraphActions();
  const { execute, isPending } = useAiGraphAction();
  const { data: theme } = useTheme();
  const { data: toneEntries } = useNodeTones(currentProjectId);

  // Available composites for AI
  const availableComposites = (composites as Composite[]).map((c) => {
    const cNodes = c.graph_data?.nodes || [];
    const cEdges = c.graph_data?.edges || [];
    const targets = new Set(cEdges.map((e) => e.target));
    const inputs = cNodes.filter((n) => !targets.has(n.id));
    return {
      id: c.id,
      name: c.name,
      description: c.description || undefined,
      input_slugs: inputs.map(
        (n) => n.slug || n.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")
      ),
    };
  });

  const handleGenerate = async () => {
    if (!prompt.trim() || isPending) return;

    setLastExplanation(null);

    // Determine context based on creation mode
    let context =
      mode === "project" ? "graph_modification" : "composite_modification";
    if (creationMode === "node") {
      context = "node_creation";
    } else if (creationMode === "scenario") {
      context = "scenario_creation";
    }

    const explanation = await execute(
      prompt,
      context,
      nodes,
      scenarios,
      graphActions,
      mode,
      selectedNodeIds,
      availableComposites,
      []
    );

    if (explanation) {
      setLastExplanation(explanation);
    } else {
      setAiAssistantOpen(false);
      setCreationMode(null);
    }

    setPrompt("");

    if (uiMode === "ai-select") {
      useUIStore.setState({ mode: "select" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const toggleMode = (newMode: "global" | "selection") => {
    if (newMode === "selection") {
      useUIStore.setState({ mode: "ai-select" });
    } else {
      useUIStore.setState({ mode: "select" });
      setSelectedNodeIds([]);
    }
  };

  // Helper to get node color based on its tone
  const getNodeColor = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId) as GraphNode | undefined;
    if (!node) return { bg: "#e5e7eb", text: "#374151", border: "#9ca3af" };

    const isCompositeNode = !!node.composite_id;
    if (isCompositeNode) {
      return { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" };
    }

    const hasError =
      node.computation_error ||
      (node as GraphNode & { provider_last_error?: string })
        .provider_last_error;
    if (hasError) {
      return { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" };
    }

    const explicitTone = (
      toneEntries as Record<string, { tone: string }> | undefined
    )?.[nodeId]?.tone;
    const toneColors = explicitTone
      ? (
          theme as
            | {
                node_tone?: Record<
                  string,
                  { bg?: string; text?: string; border?: string }
                >;
              }
            | undefined
        )?.node_tone?.[explicitTone]
      : undefined;

    if (toneColors) {
      return {
        bg: toneColors.bg || "#e0e7ff",
        text: toneColors.text || "#3730a3",
        border: toneColors.border || "#6366f1",
      };
    }

    return { bg: "#e0e7ff", text: "#3730a3", border: "#6366f1" };
  };

  const removeNodeFromSelection = (nodeId: string) => {
    setSelectedNodeIds(selectedNodeIds.filter((id) => id !== nodeId));
  };

  // Handle pre-filled prompt when AI bar opens
  useEffect(() => {
    if (isExpanded && aiPromptPrefill) {
      // Use a microtask to avoid setState in effect
      Promise.resolve().then(() => {
        setPrompt(aiPromptPrefill);
        setAiPromptPrefill("");
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    }
  }, [isExpanded, aiPromptPrefill, setAiPromptPrefill]);

  // Handle Escape key to close AI bar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setAiAssistantOpen(false);
        setCreationMode(null);
        setLastExplanation(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isExpanded, setAiAssistantOpen]);

  // Auto-switch between global and selection mode based on node selection (in baseline mode)
  const viewMode = useUIStore((s) => s.viewMode);
  useEffect(() => {
    if (!isExpanded || viewMode !== "baseline" || creationMode) return;

    if (selectedNodeIds.length > 0 && uiMode !== "ai-select") {
      // Node(s) selected → switch to selection mode
      useUIStore.setState({ mode: "ai-select" });
    } else if (selectedNodeIds.length === 0 && uiMode === "ai-select") {
      // No selection → switch back to global mode
      useUIStore.setState({ mode: "select" });
    }
  }, [selectedNodeIds.length, isExpanded, viewMode, creationMode, uiMode]);

  if (!developerMode) {
    return null;
  }

  // No backdrop - canvas remains fully interactive
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
      <div className="flex flex-col gap-2">
        {/* Explanation Card */}
        {lastExplanation && !isPending && (
          <div
            className={cn(
              "bg-zinc-950/95 backdrop-blur-xl",
              "border border-white/[0.08] rounded-xl",
              "p-4 shadow-2xl shadow-black/50",
              "animate-in slide-in-from-bottom-2 duration-200"
            )}
          >
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <p className="flex-1 text-sm text-zinc-200 leading-relaxed">
                {lastExplanation}
              </p>
              <button
                onClick={() => setLastExplanation(null)}
                className="shrink-0 p-1.5 hover:bg-white/[0.06] rounded-md transition-colors"
              >
                <XIcon className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
          </div>
        )}

        {/* Main Input Panel */}
        <div
          className={cn(
            "bg-zinc-950/95 backdrop-blur-xl",
            "border border-white/[0.08] rounded-xl",
            "shadow-2xl shadow-black/50",
            "animate-in slide-in-from-bottom-2 duration-200",
            isPending && "opacity-60 pointer-events-none"
          )}
        >
          {/* Header with mode selector */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
            {/* Mode selector */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 h-8 px-3 text-sm rounded-lg transition-colors",
                    "hover:bg-white/[0.06]",
                    aiMode === "selection"
                      ? "bg-white/[0.08] text-zinc-100"
                      : "text-zinc-400"
                  )}
                >
                  {aiMode === "creation" ? (
                    <>
                      <Plus className="h-4 w-4 text-blue-400" />
                      <span>Créer</span>
                    </>
                  ) : aiMode === "global" ? (
                    <>
                      <Wand2 className="h-4 w-4 text-purple-400" />
                      <span>Global</span>
                    </>
                  ) : (
                    <>
                      <MousePointer2 className="h-4 w-4 text-cyan-400" />
                      <span>Sélection</span>
                    </>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    toggleMode("global");
                    setCreationMode(null);
                  }}
                >
                  <Wand2 className="h-4 w-4 mr-2 text-purple-400" />
                  <span className="text-sm">Mode global</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={selectedNodeIds.length === 0}
                  onClick={() => {
                    if (selectedNodeIds.length > 0) {
                      toggleMode("selection");
                      setCreationMode(null);
                    }
                  }}
                  className={cn(
                    selectedNodeIds.length === 0 &&
                      "opacity-50 cursor-not-allowed"
                  )}
                >
                  <MousePointer2
                    className={cn(
                      "h-4 w-4 mr-2",
                      selectedNodeIds.length === 0
                        ? "text-zinc-400"
                        : "text-cyan-400"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">Mode sélection</span>
                    {selectedNodeIds.length === 0 && (
                      <span className="text-[10px] text-zinc-400">
                        Sélectionnez un nœud d'abord
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCreationMode("node");
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                >
                  <Circle className="h-4 w-4 mr-2 text-blue-400" />
                  <span className="text-sm">Créer un nœud</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCreationMode("scenario");
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2 text-blue-400" />
                  <span className="text-sm">Créer un scénario</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Creation tag */}
            {aiMode === "creation" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                {creationMode === "node" ? "Nœud" : "Scénario"}
                <button
                  onClick={() => setCreationMode(null)}
                  className="hover:bg-white/10 rounded p-0.5 transition-colors"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Selected nodes list */}
            {aiMode === "selection" && selectedNodeIds.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedNodeIds.slice(0, 4).map((nodeId) => {
                  const node = nodes.find((n) => n.id === nodeId) as
                    | GraphNode
                    | undefined;
                  const colors = getNodeColor(nodeId);
                  return (
                    <span
                      key={nodeId}
                      className="inline-flex items-center gap-1 h-6 px-2 text-xs rounded-md border"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      <span className="truncate max-w-[60px]">
                        {node?.label || nodeId.slice(0, 6)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNodeFromSelection(nodeId);
                        }}
                        className="hover:opacity-70"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                {selectedNodeIds.length > 4 && (
                  <span className="text-xs text-zinc-500">
                    +{selectedNodeIds.length - 4}
                  </span>
                )}
                <button
                  onClick={() => setSelectedNodeIds([])}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Effacer
                </button>
              </div>
            )}

            <div className="flex-1" />

            {/* Manual creation button */}
            {aiMode === "creation" && (
              <button
                onClick={() => {
                  if (creationMode === "node") {
                    setNodeEditorNodeId(null);
                    setNodeEditorMode("create");
                    setAiAssistantOpen(false);
                    setCreationMode(null);
                  } else if (creationMode === "scenario") {
                    useScenarioStore.getState().triggerInlineScenarioCreation();
                    setViewMode("scenario");
                    setAiAssistantOpen(false);
                    setCreationMode(null);
                  }
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Manuellement →
              </button>
            )}

            <button
              onClick={() => {
                setAiAssistantOpen(false);
                setCreationMode(null);
                setLastExplanation(null);
              }}
              className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] flex items-center justify-center transition-colors"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Input area */}
          <div className="p-4">
            <div className="relative">
              {isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 rounded-lg z-10">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    <span className="text-sm text-zinc-400">Processing...</span>
                  </div>
                </div>
              )}

              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  aiMode === "creation"
                    ? creationMode === "node"
                      ? "Décrivez le nœud à créer..."
                      : "Décrivez le scénario..."
                    : aiMode === "global"
                    ? "Demandez, modifiez, analysez..."
                    : selectedNodeIds.length === 0
                    ? "Sélectionnez des nœuds sur le graphe..."
                    : `Action sur ${selectedNodeIds.length} nœud(s)...`
                }
                disabled={isPending}
                className={cn(
                  "w-full min-h-[80px] max-h-[160px] bg-transparent resize-none",
                  "text-sm text-zinc-100",
                  "placeholder:text-zinc-600",
                  "focus:outline-none",
                  "leading-relaxed",
                  isPending && "opacity-50"
                )}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600">
                  <kbd className="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-500 font-mono text-[9px]">
                    Enter
                  </kbd>{" "}
                  envoyer
                </span>
                <span className="text-[10px] text-zinc-600">
                  <kbd className="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-500 font-mono text-[9px]">
                    Esc
                  </kbd>{" "}
                  fermer
                </span>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isPending || !prompt.trim()}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all",
                  prompt.trim() && !isPending
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/20"
                    : "bg-white/[0.06] text-zinc-600 cursor-not-allowed"
                )}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )}
                <span>Envoyer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
