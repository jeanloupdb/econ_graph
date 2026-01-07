"use client";

import { ShareProjectModal } from "@/components/modals/ShareProjectModal";
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
  useComputeAll,
  useComputeWithScenario,
  useNodeTones,
  useScenarios,
  useTheme,
} from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Circle,
  FileText,
  Loader2,
  Maximize2,
  MousePointer2,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  Wand2,
  X as XIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useReactFlow } from "reactflow";

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

export function GraphToolbar({
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
  const [showShareModal, setShowShareModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const graphActions = useGraphActions();
  const { execute, isPending } = useAiGraphAction();
  const { data: theme } = useTheme();
  const { data: toneEntries } = useNodeTones(currentProjectId);
  const computeAll = useComputeAll();
  const computeWithScenario = useComputeWithScenario();
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setScenarioComputedValues = useScenarioStore(
    (s) => s.setScenarioComputedValues
  );
  const clearScenarioComputedValues = useScenarioStore(
    (s) => s.clearScenarioComputedValues
  );
  const setIsComputing = useUIStore((s) => s.setIsComputing);

  // ReactFlow instance for zoom/fit controls
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Count errors in nodes
  const errorCount = nodes.filter(
    (n) => (n as GraphNode).computation_error
  ).length;

  // Handle compute all
  const handleComputeAll = async () => {
    try {
      setIsComputing(true);
      if (activeScenarioId) {
        const result = await computeWithScenario.mutateAsync({
          projectId: currentProjectId || undefined,
          scenarioId: activeScenarioId,
        });
        setScenarioComputedValues(activeScenarioId, result.results);
      } else {
        await computeAll.mutateAsync();
        clearScenarioComputedValues();
      }
    } catch (error) {
      console.error("❌ Computation failed:", error);
    } finally {
      setIsComputing(false);
    }
  };

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
      Promise.resolve().then(() => {
        setPrompt(aiPromptPrefill);
        setAiPromptPrefill("");
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    }
  }, [isExpanded, aiPromptPrefill, setAiPromptPrefill]);

  if (!developerMode) return null;

  return (
    <div className="shrink-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
      {/* Explanation Card - Linear style */}
      {lastExplanation && !isPending && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-6 py-4">
          <div className="flex gap-4 items-start max-w-5xl mx-auto">
            <div className="shrink-0 w-8 h-8 rounded-md bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {lastExplanation}
              </p>
            </div>
            <button
              onClick={() => setLastExplanation(null)}
              className="shrink-0 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              <XIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded Mode - AI Input Area */}
      {isExpanded && (
        <div
          className={cn(
            "border-b border-zinc-200 dark:border-zinc-800",
            "bg-white dark:bg-zinc-950",
            isPending && "opacity-60 pointer-events-none"
          )}
        >
          <div className="px-6 py-4 space-y-4 max-w-5xl mx-auto">
            {/* Context: Close button + Mode selector + Selected nodes */}
            <div className="flex items-center gap-3 text-sm">
              {/* Close button */}
              <button
                onClick={() => {
                  setAiAssistantOpen(false);
                  setCreationMode(null);
                  setLastExplanation(null);
                }}
                className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                title="Fermer"
              >
                <XIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </button>

              {/* Separator */}
              <div className="h-5 w-px bg-zinc-400 dark:bg-zinc-800" />

              {/* Mode selector dropdown */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 h-8 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    {aiMode === "creation" ? (
                      <>
                        <Plus className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {creationMode === "node"
                            ? "Créer un nœud"
                            : "Créer un scénario"}
                        </span>
                      </>
                    ) : aiMode === "selection" ? (
                      <>
                        <MousePointer2 className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Sélection
                        </span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Global
                        </span>
                      </>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-52">
                  <DropdownMenuItem
                    onClick={() => {
                      useUIStore.setState({ mode: "select" });
                      setSelectedNodeIds([]);
                      setCreationMode(null);
                    }}
                  >
                    <Wand2 className="h-4 w-4 mr-3 text-zinc-700 dark:text-zinc-300" />
                    <div>
                      <div className="text-sm font-medium">Mode global</div>
                      <div className="text-xs text-zinc-500">
                        Modifier le graphe
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      useUIStore.setState({ mode: "ai-select" });
                      setCreationMode(null);
                    }}
                  >
                    <MousePointer2 className="h-4 w-4 mr-3 text-zinc-700 dark:text-zinc-300" />
                    <div>
                      <div className="text-sm font-medium">Mode sélection</div>
                      <div className="text-xs text-zinc-500">
                        Agir sur des nœuds
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCreationMode("node");
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-3 text-zinc-500" />
                    <div>
                      <div className="text-sm font-medium">Créer un nœud</div>
                      <div className="text-xs text-zinc-500">
                        Avec l&apos;IA
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCreationMode("scenario");
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-3 text-zinc-500" />
                    <div>
                      <div className="text-sm font-medium">
                        Créer un scénario
                      </div>
                      <div className="text-xs text-zinc-500">
                        Avec l&apos;IA
                      </div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Selected nodes tags */}
              {aiMode === "selection" && selectedNodeIds.length > 0 && (
                <>
                  <div className="h-5 w-px bg-zinc-400 dark:bg-zinc-800" />
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedNodeIds.slice(0, 4).map((nodeId) => {
                      const node = nodes.find((n) => n.id === nodeId) as
                        | GraphNode
                        | undefined;
                      const colors = getNodeColor(nodeId);
                      return (
                        <span
                          key={nodeId}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                          }}
                        >
                          <span className="truncate max-w-[100px]">
                            {node?.label || nodeId.slice(0, 8)}
                          </span>
                          <button
                            onClick={() => removeNodeFromSelection(nodeId)}
                            className="hover:opacity-70 transition-opacity"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                    {selectedNodeIds.length > 4 && (
                      <span className="text-sm font-medium text-zinc-500">
                        +{selectedNodeIds.length - 4}
                      </span>
                    )}
                    {selectedNodeIds.length > 0 && (
                      <button
                        onClick={() => setSelectedNodeIds([])}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2"
                      >
                        Effacer tout
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Manual creation option */}
              {aiMode === "creation" && (
                <>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      if (creationMode === "node") {
                        setNodeEditorNodeId(null);
                        setNodeEditorMode("create");
                        setAiAssistantOpen(false);
                        setCreationMode(null);
                      } else if (creationMode === "scenario") {
                        useScenarioStore
                          .getState()
                          .triggerInlineScenarioCreation();
                        setViewMode("scenario");
                        setAiAssistantOpen(false);
                        setCreationMode(null);
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Ou créer manuellement
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>

            {/* Input - Pro SaaS style */}
            <div className="relative">
              {isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-lg z-10">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Processing...
                    </span>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "flex items-center gap-2",
                  "bg-white dark:bg-zinc-900",
                  "border-2 border-zinc-200 dark:border-zinc-800",
                  "rounded-lg",
                  "focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/10",
                  "transition-all duration-200"
                )}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder={
                    aiMode === "creation"
                      ? creationMode === "node"
                        ? "Décrivez le nœud à créer..."
                        : "Décrivez le scénario à créer..."
                      : aiMode === "global"
                      ? "Que voulez-vous créer, modifier ou analyser ?"
                      : selectedNodeIds.length === 0
                      ? "Sélectionnez des nœuds sur le graphe..."
                      : `Action sur ${selectedNodeIds.length} nœud${
                          selectedNodeIds.length > 1 ? "s" : ""
                        }...`
                  }
                  disabled={isPending}
                  className={cn(
                    "flex-1 h-12 px-4",
                    "bg-transparent border-none",
                    "text-sm text-zinc-900 dark:text-zinc-100",
                    "placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
                    "focus:outline-none",
                    isPending && "opacity-50"
                  )}
                />

                {/* Send button - Linear style */}
                <button
                  onClick={handleGenerate}
                  disabled={isPending || !prompt.trim()}
                  className={cn(
                    "shrink-0 flex items-center justify-center h-10 w-10 mr-1 rounded-md transition-colors",
                    prompt.trim() && !isPending
                      ? "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  )}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Toolbar - Compact Mode (Linear style) */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* AI Button - Linear style */}
          {!isExpanded && (
            <button
              onClick={() => {
                setAiAssistantOpen(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={cn(
                "flex items-center gap-2 h-8 px-3 rounded-md text-sm font-medium",
                "bg-zinc-900 dark:bg-zinc-100",
                "hover:bg-zinc-800 dark:hover:bg-zinc-200",
                "text-white dark:text-zinc-900",
                "transition-colors"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI</span>
            </button>
          )}

          {/* Separator */}
          {!isExpanded && (
            <div className="h-4 w-px bg-zinc-400 dark:bg-zinc-800" />
          )}

          {/* Create Dropdown */}
          {!isExpanded && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 h-8 px-3 rounded-md text-sm font-medium",
                    "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                    "text-zinc-700 dark:text-zinc-300",
                    "transition-colors"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Créer</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    setCreationMode("node");
                    setAiAssistantOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                >
                  <Circle className="h-4 w-4 mr-2.5 text-zinc-500" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Créer un nœud</span>
                    <span className="text-xs text-zinc-500">
                      Avec l&apos;IA ou manuellement
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCreationMode("scenario");
                    setAiAssistantOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2.5 text-zinc-500" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      Créer un scénario
                    </span>
                    <span className="text-xs text-zinc-500">
                      Avec l&apos;IA ou manuellement
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Actions - separator */}
          {!isExpanded && (
            <div className="h-4 w-px bg-zinc-400 dark:bg-zinc-800" />
          )}

          {/* View Controls */}
          {!isExpanded && (
            <>
              <button
                onClick={() => fitView({ padding: 0.2, duration: 200 })}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-md",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                  "text-zinc-700 dark:text-zinc-300",
                  "transition-colors"
                )}
                title="Fit view (F)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => zoomIn({ duration: 200 })}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-md",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                  "text-zinc-700 dark:text-zinc-300",
                  "transition-colors"
                )}
                title="Zoom in (+)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => zoomOut({ duration: 200 })}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-md",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                  "text-zinc-700 dark:text-zinc-300",
                  "transition-colors"
                )}
                title="Zoom out (-)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {/* Actions separator */}
          {!isExpanded && (
            <div className="h-4 w-px bg-zinc-400 dark:bg-zinc-800" />
          )}

          {/* Compute All */}
          {!isExpanded && (
            <button
              onClick={handleComputeAll}
              disabled={computeAll.isPending || computeWithScenario.isPending}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-md",
                "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                "text-zinc-700 dark:text-zinc-300",
                "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Recalculer tout"
            >
              {computeAll.isPending || computeWithScenario.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Error indicator */}
          {!isExpanded && errorCount > 0 && (
            <button
              onClick={() => {
                // TODO: Navigate to first error or show errors panel
                console.log("Show errors");
              }}
              className={cn(
                "flex items-center gap-1.5 h-8 px-2.5 rounded-md",
                "bg-red-50 dark:bg-red-950/30",
                "hover:bg-red-100 dark:hover:bg-red-950/50",
                "text-red-600 dark:text-red-400",
                "transition-colors text-xs font-medium"
              )}
              title={`${errorCount} erreur${errorCount > 1 ? "s" : ""}`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errorCount}</span>
            </button>
          )}

          {/* Actions separator */}
          {!isExpanded && (
            <div className="h-4 w-px bg-zinc-400 dark:bg-zinc-800" />
          )}

          {/* Share button */}
          {!isExpanded && (
            <button
              onClick={() => setShowShareModal(true)}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-md",
                "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                "text-zinc-700 dark:text-zinc-300",
                "transition-colors"
              )}
              title="Partager le projet"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right side - Hint */}
        {!isExpanded && (
          <div className="text-xs text-zinc-500">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
              ⌘K
            </kbd>{" "}
            pour rechercher
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && currentProjectId && (
        <ShareProjectModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          projectId={currentProjectId}
          projectName={currentProject?.name || "Projet"}
        />
      )}
    </div>
  );
}
