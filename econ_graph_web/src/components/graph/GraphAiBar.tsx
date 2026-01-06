'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useAiGraphAction } from "@/graph/hooks/useAiGraphAction";
import { useComposites, useNodeTones, useScenarios, useTheme } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import {
  ArrowUp,
  ChevronDown,
  Circle,
  FileText,
  Info,
  Loader2,
  MousePointer2,
  Plus,
  Sparkles,
  Wand2,
  X as XIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function GraphAiBar({ mode = 'project' }: { mode?: 'project' | 'composite' }) {
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
  const [creationMode, setCreationMode] = useState<'node' | 'scenario' | null>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive aiMode from uiMode or creationMode
  const aiMode: 'global' | 'selection' | 'creation' =
    creationMode ? 'creation' :
    uiMode === 'ai-select' ? 'selection' :
    'global';

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
  const availableComposites = composites.map(c => {
    const comp = c as any;
    const cNodes = comp.graph_data?.nodes || [];
    const cEdges = comp.graph_data?.edges || [];
    const targets = new Set(cEdges.map((e: any) => e.target));
    const inputs = cNodes.filter((n: any) => !targets.has(n.id));
    return {
      id: comp.id,
      name: comp.name,
      description: comp.description || undefined,
      input_slugs: inputs.map((n: any) => n.slug || n.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
    };
  });

  const handleGenerate = async () => {
    if (!prompt.trim() || isPending) return;

    setLastExplanation(null);

    // Determine context based on creation mode
    let context = mode === 'project' ? "graph_modification" : "composite_modification";
    if (creationMode === 'node') {
      context = 'node_creation';
    } else if (creationMode === 'scenario') {
      context = 'scenario_creation';
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

    console.log('AI Explanation:', explanation);

    if (explanation) {
      setLastExplanation(explanation);
      // Keep AI bar open if there's an explanation
      // Don't close or clear
    } else {
      // Only close if no explanation (action was performed)
      setAiAssistantOpen(false);
      setCreationMode(null);
    }

    setPrompt("");

    if (uiMode === 'ai-select') {
      useUIStore.setState({ mode: 'select' });
    }
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);

    // Detect "/" command
    if (value === '/') {
      setShowCommandMenu(true);
    } else if (showCommandMenu && !value.startsWith('/')) {
      setShowCommandMenu(false);
    }
  };

  const handleCommandSelect = (command: 'node' | 'scenario') => {
    setCreationMode(command);
    setPrompt('');
    setShowCommandMenu(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle command menu navigation
    if (showCommandMenu) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandMenu(false);
        setPrompt('');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!showCommandMenu) {
        handleGenerate();
      }
    }
  };

  // Don't close when clicking outside - user must click the close button
  // This allows selecting nodes on the canvas while keeping the AI bar open

  const toggleMode = (newMode: 'global' | 'selection') => {
    if (newMode === 'selection') {
      // Switch to ai-select mode to allow multi-selection
      useUIStore.setState({ mode: 'ai-select' });
    } else {
      // Switch back to normal select mode and clear selection
      useUIStore.setState({ mode: 'select' });
      setSelectedNodeIds([]);
    }
  };

  // Helper to get node color based on its tone
  const getNodeColor = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { bg: '#e5e7eb', text: '#374151', border: '#9ca3af' };

    const isCompositeNode = !!node.composite_id;
    if (isCompositeNode) {
      return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
    }

    // Determine tone
    const hasError = node.computation_error || (node as any).provider_last_error;
    if (hasError) {
      return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
    }

    // Check explicit tone
    const explicitTone = (toneEntries as any)?.[nodeId]?.tone;
    const toneColors = (theme as any)?.node_tone?.[explicitTone];

    if (toneColors) {
      return {
        bg: toneColors.bg || '#e0e7ff',
        text: toneColors.text || '#3730a3',
        border: toneColors.border || '#6366f1'
      };
    }

    // Default colors
    return { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' };
  };

  const removeNodeFromSelection = (nodeId: string) => {
    setSelectedNodeIds(selectedNodeIds.filter(id => id !== nodeId));
  };

  // Handle pre-filled prompt when AI bar opens
  useEffect(() => {
    if (isExpanded && aiPromptPrefill) {
      setPrompt(aiPromptPrefill);
      setAiPromptPrefill(''); // Clear the prefill after using it
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded, aiPromptPrefill, setAiPromptPrefill]);

  // Debug: log when explanation changes
  useEffect(() => {
    console.log('lastExplanation changed:', lastExplanation);
    console.log('isPending:', isPending);
    console.log('isExpanded:', isExpanded);
    console.log('Should show card:', lastExplanation && !isPending && isExpanded);
  }, [lastExplanation, isPending, isExpanded]);

  // Don't render AI bar in view mode
  if (!developerMode) {
    return null;
  }

  return (
    <>
      {/* Main AI Bar */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center z-[80] pointer-events-none">
        <div
          ref={containerRef}
          className="pointer-events-auto w-full max-w-3xl px-4 mb-4 flex flex-col gap-2"
        >
          {/* Explanation Card - positioned above the AI bar */}
          {lastExplanation && !isPending && isExpanded && (
            <div className="w-full max-w-lg mx-auto max-h-[40vh] overflow-y-auto">
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="flex gap-2.5 items-start">
                  <div className="shrink-0 w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {lastExplanation}
                  </p>
                  <button
                    onClick={() => setLastExplanation(null)}
                    className="shrink-0 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                  >
                    <XIcon className="h-4 w-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compact Mode */}
          {!isExpanded && (
            <div className="flex items-center gap-2 justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full transition-all shadow-sm hover:shadow"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Créer</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => {
                    setCreationMode('node');
                    setAiAssistantOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}>
                    <Circle className="h-4 w-4 mr-2.5 text-zinc-500" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Créer un nœud</span>
                      <span className="text-xs text-zinc-500">Avec l'IA ou manuellement</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setCreationMode('scenario');
                    setAiAssistantOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}>
                    <FileText className="h-4 w-4 mr-2.5 text-zinc-500" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Créer un scénario</span>
                      <span className="text-xs text-zinc-500">Avec l'IA ou manuellement</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative flex-1 max-w-md">
                <div className="flex items-center h-9 px-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-sm hover:shadow hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
                  <input
                    type="text"
                    readOnly
                    onFocus={() => {
                      setAiAssistantOpen(true);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    placeholder="Demander à l'IA..."
                    className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none cursor-text"
                  />
                  <button
                    disabled
                    className="shrink-0 h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 flex items-center justify-center"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Mode */}
          {isExpanded && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className={cn(
                "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-lg relative",
                isPending && "opacity-60 pointer-events-none"
              )}>
                {/* Header with mode selector */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  {/* Unified mode selector */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className={cn(
                        "flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-lg transition-all",
                        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                        aiMode === 'selection'
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                          : "text-zinc-600 dark:text-zinc-400"
                      )}>
                        {aiMode === 'creation' ? (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Créer</span>
                          </>
                        ) : aiMode === 'global' ? (
                          <>
                            <Wand2 className="h-3.5 w-3.5" />
                            <span>Mode global</span>
                          </>
                        ) : (
                          <>
                            <MousePointer2 className="h-3.5 w-3.5" />
                            <span>Mode sélection</span>
                          </>
                        )}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem onClick={() => {
                        toggleMode('global');
                        setCreationMode(null);
                      }} className="group">
                        <Wand2 className="h-4 w-4 mr-2 text-zinc-500" />
                        <span className="text-sm">Mode global</span>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" title="Modifier tout le graphe">
                          <Info className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toggleMode('selection');
                        setCreationMode(null);
                      }} className="group">
                        <MousePointer2 className="h-4 w-4 mr-2 text-zinc-500" />
                        <span className="text-sm">Mode sélection</span>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" title="Sélectionner des nœuds sur le graphe">
                          <Info className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCreationMode('node');
                        setTimeout(() => inputRef.current?.focus(), 100);
                      }} className="group">
                        <Plus className="h-4 w-4 mr-2 text-zinc-500" />
                        <span className="text-sm">Nœud</span>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" title="Créer avec l'IA ou manuellement">
                          <Info className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCreationMode('scenario');
                        setTimeout(() => inputRef.current?.focus(), 100);
                      }} className="group">
                        <Plus className="h-4 w-4 mr-2 text-zinc-500" />
                        <span className="text-sm">Scénario</span>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" title="Créer avec l'IA ou manuellement">
                          <Info className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Creation tag */}
                  {aiMode === 'creation' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 shadow-sm">
                      <Plus className="h-3.5 w-3.5" />
                      {creationMode === 'node' ? 'Créer un nœud' : 'Créer un scénario'}
                      <button
                        onClick={() => setCreationMode(null)}
                        className="ml-0.5 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 rounded p-0.5 transition-colors"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  )}

                  {/* Selected nodes list */}
                  {aiMode === 'selection' && selectedNodeIds.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                      {selectedNodeIds.slice(0, 5).map((nodeId) => {
                        const node = nodes.find(n => n.id === nodeId);
                        const colors = getNodeColor(nodeId);
                        return (
                          <span
                            key={nodeId}
                            className="inline-flex items-center gap-1 h-6 px-2 text-xs font-medium rounded-md border transition-all hover:shadow-sm"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              borderColor: colors.border
                            }}
                          >
                            <span className="truncate max-w-[80px]">
                              {node?.label || nodeId.slice(0, 8)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNodeFromSelection(nodeId);
                              }}
                              className="hover:opacity-70 transition-opacity"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                      {selectedNodeIds.length > 5 && (
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          +{selectedNodeIds.length - 5}
                        </span>
                      )}
                      {selectedNodeIds.length > 0 && (
                        <button
                          onClick={() => setSelectedNodeIds([])}
                          className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors underline"
                        >
                          Tout effacer
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* Manual creation button in creation mode */}
                  {aiMode === 'creation' && (
                    <button
                      onClick={() => {
                        if (creationMode === 'node') {
                          setNodeEditorNodeId(null);
                          setNodeEditorMode('create');
                          setAiAssistantOpen(false);
                          setCreationMode(null);
                        } else if (creationMode === 'scenario') {
                          // Trigger inline scenario creation
                          useScenarioStore.getState().triggerInlineScenarioCreation();
                          setViewMode('scenario');
                          setAiAssistantOpen(false);
                          setCreationMode(null);
                        }
                      }}
                      className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Créer manuellement</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setAiAssistantOpen(false);
                      setCreationMode(null);
                      setLastExplanation(null); // Clear explanation when closing
                    }}
                    className="h-7 w-7 rounded-lg text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Input area */}
                <div className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="relative min-h-[80px]">
                      {/* Loading message overlay */}
                      {isPending && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-lg z-10">
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              L'IA traite votre demande...
                            </span>
                          </div>
                        </div>
                      )}

                      <textarea
                        ref={inputRef}
                        value={prompt}
                        onChange={(e) => handlePromptChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                          aiMode === 'creation'
                            ? creationMode === 'node'
                              ? "Décrivez le nœud à créer..."
                              : "Décrivez le scénario à créer..."
                            : aiMode === 'global'
                              ? "Demandez, modifiez, créez avec l'IA..."
                              : aiMode === 'selection' && selectedNodeIds.length === 0
                              ? "Selectionnez des nœuds"
                              : `Que souhaitez-vous faire avec ${selectedNodeIds.length > 1 ? 'ces nœuds' : 'ce nœud'} ?`
                        }
                        disabled={isPending}
                        className={cn(
                          "w-full h-full bg-transparent border-none focus:outline-none resize-none text-[15px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                          "scrollbar-hide leading-relaxed",
                          isPending && "opacity-50 cursor-not-allowed"
                        )}
                      />

                      {/* Command menu */}
                      {showCommandMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-10 w-56">
                          <button
                            onClick={() => handleCommandSelect('node')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                          >
                            <Plus className="h-4 w-4 text-zinc-500" />
                            <span>Nœud</span>
                          </button>
                          <button
                            onClick={() => handleCommandSelect('scenario')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                          >
                            <Plus className="h-4 w-4 text-zinc-500" />
                            <span>Scénario</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleGenerate}
                        disabled={isPending || !prompt.trim()}
                        className={cn(
                          "shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all",
                          isPending
                            ? "bg-zinc-700 dark:bg-zinc-600 text-white cursor-wait shadow-lg"
                            : prompt.trim()
                              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 shadow-sm"
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

            </div>
          )}
        </div>
      </div>
    </>
  );
}
