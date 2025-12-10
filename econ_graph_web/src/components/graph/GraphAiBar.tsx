import { AiInput } from "@/components/ui/ai-input";
import { useGraphActions } from "@/graph/context/GraphActionsContext";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useAiGraphAction } from "@/graph/hooks/useAiGraphAction";
import { useComposites, useNodeTones, useScenarios, useTheme } from "@/lib/api/hooks";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import { getBadgeToneClasses } from "@/lib/nodeStyles";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { ChevronUp, MousePointer2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function GraphAiBar({ mode = 'project' }: { mode?: 'project' | 'composite' }) {
  // Use store for visibility
  const isExpanded = useUIStore((s) => s.aiAssistantOpen);
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);
  
  const [isFocused, setIsFocused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { nodes } = useGraphData();
  const { data: theme } = useTheme();
  const { data: composites = [] } = useComposites();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const graphActions = useGraphActions();
  const { execute, isPending } = useAiGraphAction();

  // Selection state from UI Store
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((s) => s.setSelectedNodeIds);
  const uiMode = useUIStore((s) => s.mode);
  
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  // --- Tone Calculation Logic (replicated from CustomNode) ---
  const { data: toneEntries } = useNodeTones(currentProjectId);

  const slugToId = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((node) => {
      if (node.slug) map.set(node.slug, node.id);
      map.set(node.id, node.id);
    });
    return map;
  }, [nodes]);

  const edges = useMemo(() => {
    return nodes.flatMap((n) =>
      deriveEdgesFromCompute(
        { id: n.id, computation_definition: (n as any).computation_definition || undefined },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );
  }, [nodes, slugToId]);

  const edgeStats = useMemo(() => {
    const stats = new Map<string, { incoming: number; outgoing: number }>();
    edges.forEach((edge) => {
      if (!stats.has(edge.source)) {
        stats.set(edge.source, { incoming: 0, outgoing: 0 });
      }
      if (!stats.has(edge.target)) {
        stats.set(edge.target, { incoming: 0, outgoing: 0 });
      }
      stats.get(edge.source)!.outgoing += 1;
      stats.get(edge.target)!.incoming += 1;
    });
    return stats;
  }, [edges]);

  const getToneForNode = (nodeId: string): 'root' | 'leaf' | 'intermediate' | 'error' => {
    const explicitTone = (toneEntries as any)?.[nodeId]?.tone;
    if (explicitTone) {
      return explicitTone;
    }
    const nodeRef = nodes.find(n => n.id === nodeId);
    if (nodeRef?.computation_error || (nodeRef as any)?.provider_last_error) {
      return 'error';
    }
    const stat = edgeStats.get(nodeId);
    if (!stat) return 'intermediate';
    if (stat.incoming === 0) return 'root';
    if (stat.outgoing === 0) return 'leaf';
    return 'intermediate';
  };
  // -----------------------------------------------------------

  // Prepare available composites for AI context
  const availableComposites = useMemo(() => {
    return composites.map(c => {
       const comp = c as any;
       const cNodes = comp.graph_data?.nodes || [];
       const cEdges = comp.graph_data?.edges || [];
       // Find nodes with no incoming edges (Inputs)
       const targets = new Set(cEdges.map((e: any) => e.target));
       const inputs = cNodes.filter((n: any) => !targets.has(n.id));
       return {
         id: comp.id,
         name: comp.name,
         description: comp.description || undefined,
         input_slugs: inputs.map((n: any) => n.slug || n.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
       };
    });
  }, [composites]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLastExplanation(null);
    
    // Always send ALL nodes as context, but specify focus if selection exists
    const explanation = await execute(
        prompt, 
        mode === 'project' ? "graph_modification" : "composite_modification", 
        nodes, 
        scenarios,
        graphActions, 
        mode,
        selectedNodeIds,
        availableComposites
    );
    
    if (explanation) {
        setLastExplanation(explanation);
    }
    
    setPrompt("");
    setAiAssistantOpen(false);
    
    // Reset selection mode if active
    if (uiMode === 'ai-select') {
        useUIStore.setState({ mode: 'select' });
    }
  };

  // Close when clicking outside the CONTAINER (Input + Chips)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If we click outside the container, we should close
      // BUT NOT if we are in selection mode!
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!isPending && uiMode !== 'ai-select') {
          setAiAssistantOpen(false);
        }
      }
    };
    // Use capture=true to ensure we catch the event before it's stopped by other handlers
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [isPending, uiMode, setAiAssistantOpen]);

  return (
    <>
      {/* Blocking Overlay during Generation */}
      {/* Blocking Overlay during Generation */}
      {isPending && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] cursor-wait flex items-end justify-end p-8 pointer-events-auto transition-all duration-500">
            <div className="relative flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-2xl">
                {/* Spinner */}
                <div className="relative w-10 h-10 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                    </div>
                </div>
                
                <div className="flex flex-col min-w-[140px]">
                    <p className="text-sm font-medium text-white tracking-tight">
                        L&apos;IA travaille...
                    </p>
                    <p className="text-xs text-zinc-400">
                        Construction en cours
                    </p>
                </div>
            </div>
        </div>
      )}

      <div 
        className="fixed bottom-0 left-0 w-full flex justify-center z-50 pointer-events-none"
      >
        {/* Stable Detection Zone - Always present to prevent flickering */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-10 pointer-events-auto bg-transparent" />

        <div 
          ref={containerRef}
          className={cn(
            "relative pointer-events-auto transition-all duration-500 ease-out w-full max-w-2xl flex flex-col items-center",
            (isExpanded || isPending) ? "mb-8" : "mb-0"
          )}
        >
          {/* Explanation Card */}
          {lastExplanation && !isPending && (
            <div className="mb-4 w-full max-w-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
                    <div className="relative flex gap-3 items-start">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                {lastExplanation}
                            </p>
                        </div>
                        <button 
                            onClick={() => setLastExplanation(null)}
                            className="shrink-0 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors -mr-1 -mt-1"
                        >
                            <X className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* Idle Bar (Bottom Docked) */}
          <div 
            onClick={() => {
                if (!isPending) setAiAssistantOpen(true);
            }}
            className={cn(
              "absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-8 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-x border-blue-200 dark:border-blue-900/50 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300",
              "rounded-t-xl rounded-b-none",
              (isExpanded || isPending) ? "opacity-0 translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
            )}
          >
            <div className="absolute inset-0 rounded-t-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10" />
            <ChevronUp className="w-4 h-4 text-blue-500 animate-bounce relative z-10" />
            <span className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider relative z-10">Assistant IA</span>
          </div>

          {/* Context Selection Panel */}
          <div className={cn(
            "w-full max-w-2xl transition-all duration-300 ease-out overflow-hidden",
            (isExpanded && !isPending && (selectedNodeIds.length > 0 || uiMode === 'ai-select')) ? "opacity-100 mb-3 translate-y-0" : "opacity-0 h-0 translate-y-4 pointer-events-none"
          )}>
             <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-3 mx-4">
                 <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <MousePointer2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
                            {uiMode === 'ai-select' ? 'Mode Sélection Actif' : 'Contexte Sélectionné'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedNodeIds.length > 0 && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNodeIds([]);
                                }}
                                className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors font-medium mr-2"
                            >
                                VIDER
                            </button>
                        )}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNodeIds([]);
                                // Delay mode switch to allow ReactFlow to clear selection first
                                // preventing onSelectionChange from restoring the old selection
                                setTimeout(() => {
                                    useUIStore.setState({ mode: 'select' });
                                }, 10);
                            }}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                            title="Fermer le mode sélection"
                        >
                            <X className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>
                 </div>

                 {uiMode === 'ai-select' && selectedNodeIds.length === 0 && (
                     <div className="text-center py-2 text-zinc-500 dark:text-zinc-400 text-sm italic px-4">
                         Aucune sélection : L&apos;assistant analysera l&apos;ensemble du projet, mais cibler des nœuds permet d&apos;obtenir des réponses plus précises.
                     </div>
                 )}
                 
                 {selectedNodeIds.length > 0 && (
                     <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {selectedNodeIds.map(id => {
                            const node = nodes.find(n => n.id === id);
                            if (!node) return null;
                            
                            // Determine tone based on graph topology (same logic as CustomNode)
                            const tone = getToneForNode(id);
                            const badgeClasses = getBadgeToneClasses(tone);
                            
                            return (
                                <div 
                                    key={id} 
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shadow-sm group transition-all",
                                        badgeClasses
                                    )}
                                >
                                    <span>{node.label}</span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedNodeIds(selectedNodeIds.filter(nid => nid !== id));
                                        }}
                                        className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors opacity-50 group-hover:opacity-100"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}
                     </div>
                 )}
             </div>
          </div>

          {/* Suggestions Chips + Selection Button */}
          <div className={cn(
            "flex justify-center gap-2 transition-all duration-300 overflow-hidden w-full",
            (isExpanded && !isPending && uiMode !== 'ai-select') ? "opacity-100 max-h-10 mb-3" : "opacity-0 max-h-0"
          )}>
            {/* Selection Button */}
            <button
                onClick={() => {
                    useUIStore.setState({ mode: 'ai-select' });
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all font-medium"
            >
                <MousePointer2 className="w-3 h-3" />
                Sélectionner
            </button>

            {[
              { label: "Créer", prompt: "Ajoute un nœud..." },
              { label: "Corriger", prompt: "Corrige le calcul de..." },
              { label: "Question", prompt: "Explique-moi..." }
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                    setPrompt(chip.prompt);
                    if (inputRef.current?.querySelector('input')) {
                        (inputRef.current.querySelector('input') as HTMLInputElement).focus();
                    }
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Expanded Input */}
          <div 
            ref={inputRef}
            className={cn(
              "w-full transition-all duration-500 origin-bottom flex items-end justify-center gap-3",
              (isExpanded || isPending) ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-8 pointer-events-none"
            )}
          >
             <div className="relative group flex-1 max-w-xl">
                {/* Glow effect */}
                <div className={cn(
                  "absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur transition-opacity duration-500",
                  isFocused ? "opacity-20" : "opacity-0"
                )} />
                
                <div 
                  className={cn(
                    "relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-full border border-zinc-200/50 dark:border-zinc-700/50 p-1 transition-shadow duration-300 flex items-center gap-1",
                    isFocused ? "shadow-2xl" : "shadow-md"
                  )}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                >
                  <AiInput
                    value={prompt}
                    onChange={setPrompt}
                    onGenerate={handleGenerate}
                    isGenerating={isPending}
                    placeholder="Ajoutez un nœud..."
                    className="shadow-none border-none bg-transparent flex-1"
                  />
                </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
