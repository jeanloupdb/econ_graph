"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useScenarios, useTheme } from "@/lib/api/hooks";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import { resolveTonePalette } from "@/lib/nodeStyles";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { formatNumber } from "@/utils/format";
import { Box, ChevronDown, Loader2, MoreVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SidebarItem } from "./SidebarItem";
import { CollapsibleSection, NestedList } from "./SidebarSection";

function ComparisonNodeItem({
  node,
  diff,
  allEdges,
}: {
  node: any;
  diff: { diff: number; pct_diff: number };
  allEdges: any[];
}) {
  const { data: theme } = useTheme();
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setSelectedNodeIds = useUIStore((s) => s.setSelectedNodeIds);
  const developerMode = useUIStore((s) => s.developerMode);
  const [menuOpen, setMenuOpen] = useState(false);

  // Compute Tone/Color
  const isRoot = allEdges.every(e => e.target !== node.id);
  const isLeaf = allEdges.every(e => e.source !== node.id);
  const hasError = !!node.data?.computation_error || !!node.computation_error;

  const tone = hasError ? 'error' : (isRoot ? 'root' : (isLeaf ? 'leaf' : 'intermediate'));
  const palette = resolveTonePalette(tone, (theme as any)?.node_tone);

  const handleOpenInspector = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    console.log('[ComparisonSidebar] Opening inspector for node:', node.id);
    setSelectedNodeId(node.id);
    setInspectorOpen(true);
    setMenuOpen(false);
  };

  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const isSelected = selectedNodeIds.includes(node.id);

  return (
    <SidebarItem
      icon={
        <Box
          className="h-3.5 w-3.5"
          style={{ color: palette.border }}
        />
      }
      label={node.data?.label || node.label || node.id}
      isSelected={isSelected}
      onClick={() => setSelectedNodeIds([node.id])}
      rightContent={
        <>
          <span className={`text-xs font-mono ${isSelected ? "text-zinc-800 dark:text-zinc-300" : "text-zinc-700 dark:text-zinc-400"}`}>
            {diff.diff > 0 ? "+" : ""}{formatNumber(diff.diff)}
          </span>
          <span className={`text-xs font-semibold min-w-[3.5rem] text-right ${diff.pct_diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {diff.pct_diff > 0 ? "+" : ""}{(diff.pct_diff * 100).toFixed(1)}%
          </span>
          {developerMode && (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger
                className={`p-1 rounded transition-colors shrink-0 ${isSelected ? "hover:bg-blue-500/20" : "hover:bg-zinc-400 dark:hover:bg-white/10"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className={`h-3.5 w-3.5 ${isSelected ? "text-zinc-800 dark:text-zinc-300" : "text-zinc-700 dark:text-zinc-400"}`} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    console.log('[ComparisonSidebar] Menu item clicked');
                    handleOpenInspector(e);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Détails du nœud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      }
    />
  );
}

export function ComparisonSidebarContent({
    onCalculate,
    isComputing
}: {
    onCalculate: () => void;
    isComputing: boolean;
}) {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: scenarios = [] } = useScenarios(currentProjectId);
  const { nodes = [] } = useGraphData();

  const scenarioAId = useScenarioStore((s) => s.scenarioAId);
  const scenarioBId = useScenarioStore((s) => s.scenarioBId);
  const setComparisonScenarios = useScenarioStore((s) => s.setComparisonScenarios);
  const comparisonValues = useScenarioStore((s) => s.comparisonValues);

  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(false);

  // Auto-calculate when scenarios change
  useEffect(() => {
    if (scenarioAId && scenarioBId && scenarioAId !== scenarioBId) {
        onCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioAId, scenarioBId]);

  // All available scenarios including baseline
  const allScenarios = [
    { id: 'baseline', name: 'Baseline', color: '#94a3b8' },
    ...scenarios
  ];

  const scenarioA = allScenarios.find((s) => s.id === scenarioAId);
  const scenarioB = allScenarios.find((s) => s.id === scenarioBId);

  // Compute edges
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

  // Compute diffs grouped by type
  const { parameterDiffs, intermediateDiffs, resultDiffs } = useMemo(() => {
    if (!comparisonValues) return { parameterDiffs: [], intermediateDiffs: [], resultDiffs: [] };

    const incoming = new Set<string>();
    const outgoing = new Set<string>();

    edges.forEach(e => {
      outgoing.add(e.source);
      incoming.add(e.target);
    });

    const params: any[] = [];
    const inter: any[] = [];
    const res: any[] = [];

    for (const [nodeId, compResult] of Object.entries(comparisonValues)) {
        const delta = compResult.delta ?? 0;
        const valA = compResult.value_a ?? 0;
        const pctDiff = valA !== 0 ? delta / valA : 0;

        // Filter out negligible diffs
        if (Math.abs(pctDiff) > 0.001 || Math.abs(delta) > 0.001) {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) continue;

            const diffData = {
                node,
                diff: delta,
                pct_diff: pctDiff
            };

            const hasIncoming = incoming.has(nodeId);
            const hasOutgoing = outgoing.has(nodeId);

            if (!hasIncoming) {
                params.push(diffData);
            } else if (!hasOutgoing) {
                res.push(diffData);
            } else {
                inter.push(diffData);
            }
        }
    }

    // Sort by absolute % diff descending
    const sortFn = (a: any, b: any) => Math.abs(b.pct_diff) - Math.abs(a.pct_diff);

    return {
        parameterDiffs: params.sort(sortFn),
        intermediateDiffs: inter.sort(sortFn),
        resultDiffs: res.sort(sortFn)
    };
  }, [comparisonValues, nodes, edges]);

  const bothSelected = scenarioA && scenarioB;
  const canCompare = bothSelected && scenarioA.id !== scenarioB.id;
  const totalDiffs = parameterDiffs.length + intermediateDiffs.length + resultDiffs.length;

  return (
    <div className="flex flex-col h-full">
        {/* Compact Selector with VS Badge */}
        <div className="p-4 border-b border-zinc-400 dark:border-white/5">
            <div className="flex items-stretch gap-3">
                {/* Left: VS Badge */}
                <div className="flex items-center justify-center w-12 shrink-0">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-500 tracking-widest">VS</span>
                </div>

                {/* Right: Scenario selectors stacked */}
                <div className="flex-1 space-y-2">
                    {/* Scenario A */}
                    <Popover open={openA} onOpenChange={setOpenA}>
                        <PopoverTrigger asChild>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 hover:bg-white/40 dark:hover:bg-white/10 transition-all text-left">
                                {scenarioA ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                                        <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                                            {scenarioA.name}
                                        </span>
                                    </>
                                ) : (
                                    <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-400">
                                        Sélectionner un scénario
                                    </span>
                                )}
                                <ChevronDown className="h-4 w-4 text-zinc-700 dark:text-zinc-500 shrink-0" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-1 bg-white dark:bg-slate-950 border-zinc-200 dark:border-slate-800" align="start">
                            <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                                {allScenarios.map((scenario) => (
                                    <button
                                        key={scenario.id}
                                        onClick={() => {
                                            setComparisonScenarios(
                                                scenario.id,
                                                scenarioBId
                                            );
                                            setOpenA(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-left"
                                    >
                                        <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: scenario.color || '#94a3b8' }}
                                        />
                                        <span className="text-sm text-zinc-900 dark:text-white/90">{scenario.name}</span>
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Scenario B */}
                    <Popover open={openB} onOpenChange={setOpenB}>
                        <PopoverTrigger asChild>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 hover:bg-white/40 dark:hover:bg-white/10 transition-all text-left">
                                {scenarioB ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                                        <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                                            {scenarioB.name}
                                        </span>
                                    </>
                                ) : (
                                    <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-400">
                                        Sélectionner un scénario
                                    </span>
                                )}
                                <ChevronDown className="h-4 w-4 text-zinc-700 dark:text-zinc-500 shrink-0" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-1 bg-white dark:bg-slate-950 border-zinc-200 dark:border-slate-800" align="start">
                            <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                                {allScenarios
                                    .filter(s => s.id !== scenarioA?.id)
                                    .map((scenario) => (
                                        <button
                                            key={scenario.id}
                                            onClick={() => {
                                                setComparisonScenarios(
                                                    scenarioAId,
                                                    scenario.id
                                                );
                                                setOpenB(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-left"
                                        >
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: scenario.color || '#94a3b8' }}
                                            />
                                            <span className="text-sm text-zinc-900 dark:text-white/90">{scenario.name}</span>
                                        </button>
                                    ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>

        {/* Results Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {!canCompare ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                    <p className="text-xs text-zinc-800 dark:text-zinc-400">Sélectionnez deux scénarios différents pour comparer</p>
                </div>
            ) : isComputing ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-700 dark:text-zinc-400 mb-3" />
                    <p className="text-xs text-zinc-800 dark:text-zinc-400">Calcul en cours...</p>
                </div>
            ) : totalDiffs > 0 ? (
                <div className="space-y-0.5 p-2">
                    {parameterDiffs.length > 0 && (
                        <CollapsibleSection
                            title={`Paramètres (${parameterDiffs.length})`}
                            defaultOpen={true}
                        >
                            <NestedList
                                items={parameterDiffs.map((item) => (
                                    <ComparisonNodeItem
                                        key={item.node.id}
                                        node={item.node}
                                        diff={{ diff: item.diff, pct_diff: item.pct_diff }}
                                        allEdges={edges}
                                    />
                                ))}
                            />
                        </CollapsibleSection>
                    )}

                    {intermediateDiffs.length > 0 && (
                        <CollapsibleSection
                            title={`Intermédiaires (${intermediateDiffs.length})`}
                            defaultOpen={false}
                        >
                            <NestedList
                                items={intermediateDiffs.map((item) => (
                                    <ComparisonNodeItem
                                        key={item.node.id}
                                        node={item.node}
                                        diff={{ diff: item.diff, pct_diff: item.pct_diff }}
                                        allEdges={edges}
                                    />
                                ))}
                            />
                        </CollapsibleSection>
                    )}

                    {resultDiffs.length > 0 && (
                        <CollapsibleSection
                            title={`Résultats (${resultDiffs.length})`}
                            defaultOpen={true}
                        >
                            <NestedList
                                items={resultDiffs.map((item) => (
                                    <ComparisonNodeItem
                                        key={item.node.id}
                                        node={item.node}
                                        diff={{ diff: item.diff, pct_diff: item.pct_diff }}
                                        allEdges={edges}
                                    />
                                ))}
                            />
                        </CollapsibleSection>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                    <p className="text-xs text-zinc-800 dark:text-zinc-300">Aucune différence détectée</p>
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-400 mt-1">Les scénarios produisent les mêmes résultats</p>
                </div>
            )}
        </div>
    </div>
  );
}
