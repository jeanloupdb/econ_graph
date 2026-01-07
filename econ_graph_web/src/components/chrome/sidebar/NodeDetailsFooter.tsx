import { Input } from "@/components/ui/input";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useComputeWithScenario, useScenarios, useTheme, useUpdateOverrides } from "@/lib/api/hooks";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import { resolveTonePalette } from "@/lib/nodeStyles";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { formatNumber } from "@/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import { Box, ChevronDown, Layers } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SidebarItem } from "./SidebarItem";

export function NodeDetailsFooter() {
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const canEdit = useProjectStore((s) => s.canEdit)();
  const { nodes = [] } = useGraphData();
  const { data: theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);

  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const scenarioComputedValues = useScenarioStore((s) => s.scenarioComputedValues);
  const setScenarioComputedValues = useScenarioStore((s) => s.setScenarioComputedValues);
  const setIsComputing = useUIStore((s) => s.setIsComputing);
  
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: scenarios = [] } = useScenarios(currentProjectId);

  const queryClient = useQueryClient();
  const updateOverrides = useUpdateOverrides();
  const computeWithScenario = useComputeWithScenario();

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedNode = useMemo(() => {
    if (selectedNodeIds.length !== 1) return null;
    return nodes.find((n) => n.id === selectedNodeIds[0]);
  }, [selectedNodeIds, nodes]);

  // Comparison Logic Hooks - Moved up to avoid conditional hook execution
  const viewMode = useUIStore((s) => s.viewMode);
  const comparisonValues = useScenarioStore((s) => s.comparisonValues);
  const scenarioAId = useScenarioStore((s) => s.scenarioAId);
  const scenarioBId = useScenarioStore((s) => s.scenarioBId);

  const scenarioAName = useMemo(() => {
      if (!scenarioAId || scenarioAId === 'baseline') return "Baseline";
      return scenarios.find(s => s.id === scenarioAId)?.name || "Unknown";
  }, [scenarioAId, scenarios]);

  const scenarioBName = useMemo(() => {
      if (!scenarioBId || scenarioBId === 'baseline') return "Baseline";
      return scenarios.find(s => s.id === scenarioBId)?.name || "Unknown";
  }, [scenarioBId, scenarios]);

  const comparisonData = selectedNode ? comparisonValues?.[selectedNode.id] : undefined;

  // Auto-expand when selection changes
  useEffect(() => {
    if (selectedNode) {
        setIsExpanded(true);
        setIsEditing(false); // Reset editing state when selection changes
    }
  }, [selectedNode?.id]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Compute edges locally to ensure consistent tone calculation with NodeExplorer
  const edges = useMemo(() => {
    const slugToId = new Map<string, string>();
    nodes.forEach((n) => {
      if (n.slug) slugToId.set(n.slug, n.id);
      slugToId.set(n.id, n.id);
    });

    return nodes.flatMap((n) =>
      deriveEdgesFromCompute(
        {
          id: n.id,
          computation_definition: n.computation_definition
        },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );
  }, [nodes]);

  if (!selectedNode) return null;

  const isComposite = !!selectedNode.composite_id;
  
  // Compute Tone/Color
  const isRoot = edges.every((e) => e.target !== selectedNode.id);
  const isLeaf = edges.every((e) => e.source !== selectedNode.id);
  const hasError = !!(selectedNode as any).data?.computation_error || !!selectedNode.computation_error || !!(selectedNode as any).data?.provider_last_error || !!selectedNode.provider_last_error;

  const tone = hasError ? 'error' : (isRoot ? 'root' : (isLeaf ? 'leaf' : 'intermediate'));
  const palette = resolveTonePalette(tone, (theme as any)?.node_tone);

  // Scenario Logic
  const baselineValue = selectedNode.value_computed;
  let currentValue = baselineValue;
  const isScenarioActive = !!activeScenarioId;

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const override = activeScenario?.overrides?.find((o: any) => o.node_id === selectedNode.id);

  // For parameters with override, use the override value
  if (override?.mode === 'value' && override.override_value !== null) {
      currentValue = override.override_value;
  }
  // For computed nodes or parameters without override, use scenario computed value
  else if (isScenarioActive && scenarioComputedValues) {
      const scenarioData = scenarioComputedValues[selectedNode.id];
      if (scenarioData !== undefined) {
          // Use scenario_value if available, otherwise fallback to value
          currentValue = (scenarioData as any).scenario_value !== undefined
              ? (scenarioData as any).scenario_value
              : (scenarioData as any).value;
      }
  }

  let deviationPercent: number | null = null;
  let dotClass = "bg-zinc-300 dark:bg-zinc-700"; // Default Gray

  if (isScenarioActive && baselineValue !== null && baselineValue !== undefined && currentValue !== null && currentValue !== undefined) {
      const diff = currentValue - baselineValue;
      if (Math.abs(diff) > 1e-9) {
          dotClass = diff > 0 ? "bg-green-500" : "bg-red-500";
      }
      
      if (Math.abs(baselineValue) > 1e-9) {
          deviationPercent = ((currentValue - baselineValue) / baselineValue) * 100;
      } else {
          // If baseline is 0, we can't calculate percent, but we can show diff if any
          deviationPercent = Math.abs(diff) > 1e-9 ? (diff > 0 ? 100 : -100) : 0;
      }
  } else if (isScenarioActive) {
      // Fallback if values are missing but we are in scenario mode
      deviationPercent = 0;
  }



  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!canEdit) {
        return; // Don't allow editing if user can't edit
    }
    
    if (!isScenarioActive) {
        return;
    }
    // Only allow editing if it's a root node (parameter)
    if (!isRoot) {
        toast.info("Seuls les paramètres (nœuds racines) peuvent être modifiés directement.");
        return;
    }

    setIsEditing(true);
    const val = currentValue ?? "";
    setInputValue(String(val));
  };

  const handleSave = async () => {
    if (!activeScenarioId) return;

    try {
        const numValue = parseFloat(inputValue);
        if (isNaN(numValue)) {
            setIsEditing(false);
            return;
        }

        await updateOverrides.mutateAsync({
            scenarioId: activeScenarioId,
            data: {
                overrides: [{
                    node_id: selectedNode.id,
                    mode: 'value',
                    override_value: numValue,
                    override_code: null,
                }]
            }
        });

        // Trigger recomputation to update all values
        setIsComputing(true);
        try {
            const result = await computeWithScenario.mutateAsync({
                projectId: currentProjectId || undefined,
                scenarioId: activeScenarioId,
            });
            setScenarioComputedValues(activeScenarioId, result.results);

            // Invalidate and refetch scenarios query to refresh the sidebar
            await queryClient.invalidateQueries({ queryKey: ['scenarios', 'project', currentProjectId] });
            await queryClient.refetchQueries({ queryKey: ['scenarios', 'project', currentProjectId] });
        } catch (computeError) {
            console.error("Failed to recompute:", computeError);
        } finally {
            setIsComputing(false);
        }

        toast.success("Modification enregistrée");
        setIsEditing(false);
    } catch (e) {
        console.error("Failed to save override", e);
        toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.stopPropagation();
        handleSave();
    } else if (e.key === 'Escape') {
        e.stopPropagation();
        setIsEditing(false);
    }
  };

  return (
    <div 
        className="border-t bg-white/40 dark:bg-black/20 backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300"
        style={{ borderColor: palette.border }}
    >
      {/* Header using SidebarItem for consistency */}
      <div className="p-2">
        <SidebarItem
            icon={
                <div className="flex items-center gap-2">
                    {isScenarioActive && (
                        <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                    )}
                    {isComposite ? (
                        <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                        <Box
                            className="h-3.5 w-3.5"
                            style={{ color: palette.border }}
                        />
                    )}
                </div>
            }
            label={selectedNode.label || selectedNode.id}
            isSelected={false}
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
            rightContent={
                <ChevronDown 
                    className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`} 
                />
            }
        />
      </div>

      {/* Details Grid */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 animate-in slide-in-from-top-1 duration-200">
            {/* Unit Section - Always visible if present */}
            {selectedNode.unit && (
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Unité:</span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium">
                        {selectedNode.unit}
                    </span>
                </div>
            )}

            {viewMode === 'comparison' ? (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Scenario A */}
                        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold truncate" title={scenarioAName}>
                                {scenarioAName}
                            </span>
                            <span className="font-mono text-lg font-medium text-zinc-900 dark:text-zinc-100">
                                {comparisonData?.value_a != null ? formatNumber(comparisonData.value_a) : "—"}
                            </span>
                        </div>

                        {/* Scenario B */}
                        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold truncate" title={scenarioBName}>
                                {scenarioBName}
                            </span>
                            <span className="font-mono text-lg font-medium text-zinc-900 dark:text-zinc-100">
                                {comparisonData?.value_b != null ? formatNumber(comparisonData.value_b) : "—"}
                            </span>
                        </div>
                    </div>
                    
                    {/* Difference */}
                    {comparisonData && comparisonData.value_a != null && comparisonData.value_b != null && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/50 dark:bg-black/20 border border-white/10 dark:border-white/5">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Différence</span>
                            <div className="flex items-baseline gap-2">
                                {/* Percentage First */}
                                {Math.abs(comparisonData.value_a) > 1e-9 ? (
                                    <span className={`font-mono text-lg font-bold ${
                                        (comparisonData.value_b - comparisonData.value_a) > 0 
                                            ? 'text-green-600 dark:text-green-400' 
                                            : (comparisonData.value_b - comparisonData.value_a) < 0 
                                                ? 'text-red-600 dark:text-red-400' 
                                                : 'text-zinc-500'
                                    }`}>
                                        {(comparisonData.value_b - comparisonData.value_a) > 0 ? '+' : ''}
                                        {((comparisonData.value_b - comparisonData.value_a) / comparisonData.value_a * 100).toFixed(1)}%
                                    </span>
                                ) : (
                                    <span className="text-zinc-400 text-sm">—</span>
                                )}
                                
                                {/* Absolute Difference in Parentheses */}
                                <span className={`text-xs font-medium ${
                                    (comparisonData.value_b - comparisonData.value_a) > 0 
                                        ? 'text-green-600/80 dark:text-green-400/80' 
                                        : (comparisonData.value_b - comparisonData.value_a) < 0 
                                            ? 'text-red-600/80 dark:text-red-400/80' 
                                            : 'text-zinc-500/80'
                                }`}>
                                    ({(comparisonData.value_b - comparisonData.value_a) > 0 ? '+' : ''}
                                    {formatNumber(comparisonData.value_b - comparisonData.value_a)})
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                            {isScenarioActive ? "Valeur Scénario" : "Valeur"}
                        </span>
                        
                        {isEditing ? (
                            <div className="flex items-center gap-1">
                                <Input
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="h-9 text-sm px-3 bg-white dark:bg-zinc-950 border-blue-500 ring-1 ring-blue-500/20"
                                    placeholder="Valeur"
                                />
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div 
                                className={`font-mono text-lg font-medium text-zinc-900 dark:text-zinc-100 bg-white/50 dark:bg-black/20 px-3 py-2 rounded-lg border border-white/10 dark:border-white/5 flex items-center justify-between transition-colors ${isScenarioActive && isRoot ? "cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-zinc-600" : ""}`}
                                onDoubleClick={handleDoubleClick}
                                title={isScenarioActive && isRoot ? "Double-cliquer pour modifier" : undefined}
                            >
                                <span>
                                    {currentValue != null
                                        ? formatNumber(currentValue)
                                        : "—"}
                                </span>
                                {deviationPercent !== null && (
                                    <span className={`text-xs font-bold ${deviationPercent > 0 ? 'text-green-600 dark:text-green-400' : deviationPercent < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'}`}>
                                        {deviationPercent > 0 ? '+' : ''}{deviationPercent.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {isScenarioActive && baselineValue != null && (
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                                Valeur de Base
                            </span>
                            <div className="font-mono text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100/50 dark:bg-zinc-800/30 px-3 py-2 rounded-lg border border-white/10 dark:border-white/5">
                                {formatNumber(baselineValue)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(selectedNode as any).description && (
                <div className="flex flex-col gap-1 pt-2 border-t border-white/10 dark:border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Description</span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-white/30 dark:bg-white/5 p-2 rounded-md border border-white/10 dark:border-white/5">
                        {(selectedNode as any).description}
                    </p>
                </div>
            )}

            {selectedNode.notes && (
                <div className="flex flex-col gap-1">
                    <span 
                        className="text-[10px] uppercase tracking-wider font-semibold"
                        style={{ color: palette.border }}
                    >
                        Notes
                    </span>
                    <p 
                        className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed p-2 rounded-md border"
                        style={{ 
                            backgroundColor: `${palette.border}1A`, // 10% opacity
                            borderColor: `${palette.border}40`      // 25% opacity
                        }}
                    >
                        {selectedNode.notes}
                    </p>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
