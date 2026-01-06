'use client';

import { Badge } from '@/components/ui/badge';
import { useGraphActions } from '@/graph/context/GraphActionsContext';
import { useGraphData } from '@/graph/context/GraphDataContext';
import { useNodeTones, useTheme } from '@/lib/api/hooks';
import { deriveEdgesFromCompute } from '@/lib/layout/graph';
import { getNodeDisplayIdentifier } from '@/lib/nodes';
import type { Node } from '@/lib/types';
import { cn } from "@/lib/utils";
import { useProjectStore } from '@/store/projectState';
import { useScenarioStore } from '@/store/scenarioState';
import { useUIStore } from '@/store/uiState';
import { formatNumber } from "@/utils/format";
import { Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useMemo } from 'react';
import { Handle, NodeProps, Position, useReactFlow } from 'reactflow';

export function CustomNode({ data, id, selected }: NodeProps<Node>) {
  // Minimal: no explicit selection linkage here
  const isComputed = !!data.computation_definition;
  const hasError = (!!data.computation_error) || (!!(data as any).provider_last_error);
  const isCompositeNode = !!data.composite_id;

  // Determine leaf (decision) status: no outgoing edges
  const { getEdges } = useReactFlow();
  const edges = getEdges();
  const hasOutputs = edges.some((e) => e.source === id);
  const isLeaf = !hasOutputs;
  const inputs = edges.filter((e) => e.target === id).map((e) => e.source);
  const isRoot = inputs.length === 0; // no incoming edges

  // Get scenario state
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const scenarioComputedValues = useScenarioStore((s) => s.scenarioComputedValues);
  const scenarioValuesScenarioId = useScenarioStore((s) => s.scenarioValuesScenarioId);
  const comparisonEnabledGlobal = useScenarioStore((s) => s.comparisonEnabled);
  const comparisonValues = useScenarioStore((s) => s.comparisonValues);
  const graphActions = useGraphActions();
  const isProjectGraph = graphActions.mode === 'project';
  const comparisonEnabled = isProjectGraph && comparisonEnabledGlobal;

  const compareData = comparisonEnabled ? comparisonValues[id] : null;

  // Determine display value:
  // - In comparison mode: display both A/B values
  // - Otherwise: use scenario value if available, else computed value
  const scenarioData =
    !comparisonEnabled &&
    activeScenarioId &&
    scenarioValuesScenarioId === activeScenarioId
      ? scenarioComputedValues[id]
      : null;
  const displayValue = !comparisonEnabled
    ? (scenarioData?.scenario_value ?? data.value_computed ?? null)
    : null;

  const { data: theme } = useTheme();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: toneEntries } = useNodeTones(currentProjectId);
  // Determine unified tone
  const tone: 'error' | 'root' | 'leaf' | 'intermediate' = hasError ? 'error' : (isRoot ? 'root' : (isLeaf ? 'leaf' : 'intermediate'));
  const toneColors = (theme as any)?.node_tone?.[tone];
  const baseStyle: React.CSSProperties | undefined = toneColors
    ? { borderColor: toneColors.border }
    : undefined;
  const compositeStyle: React.CSSProperties | undefined = isCompositeNode
    ? { borderColor: '#f59e0b' }
    : undefined;

  // Tint style for the inner layer
  const tintStyle: React.CSSProperties | undefined = toneColors
    ? { backgroundColor: toneColors.bg }
    : (isCompositeNode ? { backgroundColor: 'rgba(251, 191, 36, 0.18)' } : undefined);

  const pushPanel = useUIStore((s) => s.pushPanel);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const highlightedNodeId = useUIStore((s) => s.highlightedNodeId);
  const isHighlighted = highlightedNodeId === id;

  // Check if this node is being edited
  const nodeEditorMode = useUIStore((s) => s.nodeEditorMode);
  const nodeEditorNodeId = useUIStore((s) => s.nodeEditorNodeId);
  const isBeingEdited = nodeEditorMode && nodeEditorNodeId === id;

  // Selection ring matches tone
  const ringColor = isCompositeNode
    ? '#f59e0b'
    : (toneColors?.border || (hasError ? '#ef4444' : isRoot ? '#f59e0b' : isLeaf ? '#10b981' : '#3b82f6'));
  const containerSelected = selected ? `shadow-md` : 'shadow-sm';
  const highlightAnimationClass = isHighlighted ? 'animate-pulse' : '';
  const boxShadows: string[] = [];

  // Enhanced selection with double ring (same for all selections)
  if (selected || isBeingEdited) {
    boxShadows.push(`0 0 0 4px ${ringColor}`, `0 0 0 8px ${ringColor}40`);
  }

  if (isHighlighted) {
    boxShadows.push('0 0 0 8px rgba(251, 191, 36, 0.35)');
  }
  const boxShadow = boxShadows.length > 0 ? boxShadows.join(', ') : undefined;

  const displaySlug = getNodeDisplayIdentifier(data);

  const { nodes: graphNodes } = useGraphData();
  const nodesById = useMemo(() => {
    const map = new Map<string, Node>();
    graphNodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [graphNodes]);

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
    const nodeRef = nodesById.get(nodeId);
    if (nodeRef?.computation_error || (nodeRef as any)?.provider_last_error) {
      return 'error';
    }
    const stat = edgeStats.get(nodeId);
    if (!stat) return 'intermediate';
    if (stat.incoming === 0) return 'root';
    if (stat.outgoing === 0) return 'leaf';
    return 'intermediate';
  };

  const resolveInputLabel = (sourceId: string) => {
    const sourceNode = nodesById.get(sourceId) || null;
    return getNodeDisplayIdentifier(sourceNode) || sourceId;
  };

  const router = useRouter();
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);
  const aiAssistantOpen = useUIStore((s) => s.aiAssistantOpen);
  const setSelectedNodeIds = useUIStore((s) => s.setSelectedNodeIds);
  const setMode = useUIStore((s) => s.setMode);
  const setEditNodeModalOpen = useUIStore((s) => s.setEditNodeModalOpen);

  const getAncestors = useCallback(() => {
    const slugToId = new Map<string, string>();
    graphNodes.forEach((n) => {
      if (n.slug) slugToId.set(n.slug, n.id);
      slugToId.set(n.id, n.id);
    });

    const derived = graphNodes.flatMap((n) =>
      deriveEdgesFromCompute(
        { id: n.id, computation_definition: (n as any).computation_definition || undefined },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );
    const inMap = new Map<string, string[]>();
    graphNodes.forEach((n) => inMap.set(n.id, []));
    derived.forEach((e) => {
      if (!inMap.has(e.target)) inMap.set(e.target, []);
      inMap.get(e.target)!.push(e.source);
    });
    
    const ancestors = new Set<string>();
    const stack = [...(inMap.get(id) || [])];
    while (stack.length) {
      const cur = stack.pop()!;
      if (ancestors.has(cur)) continue;
      ancestors.add(cur);
      (inMap.get(cur) || []).forEach((p) => {
        if (!ancestors.has(p)) stack.push(p);
      });
    }
    return Array.from(ancestors);
  }, [graphNodes, id]);

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <>


      <div
        className={cn(
          'relative rounded-xl border transition-all duration-200 group min-w-[250px] bg-white dark:bg-zinc-900 p-4 !overflow-visible', // Force overflow visible
          containerSelected,
          highlightAnimationClass
        )}
        style={{
          ...baseStyle,
          ...compositeStyle,
          boxShadow,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Tint Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none rounded-xl" style={tintStyle} />

        <Handle type="target" position={Position.Top} className="w-3 h-3 z-20" />

        <div className="space-y-3 relative z-10">
          <div className="flex flex-col gap-1.5">
            {/* Label (Name) at top */}
            <div className="flex items-center gap-2">
              {isCompositeNode && (
                <Layers className="h-4 w-4 text-amber-600 dark:text-amber-300" />
              )}
              <h3 className="font-medium leading-tight text-lg text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]">
                {data.label}
              </h3>

            </div>

            {/* ID = Value below */}
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-2 flex-wrap">
              <span>
                {!comparisonEnabled && (
                  <>
                    <span className="text-zinc-900 dark:text-zinc-100 font-bold text-xl">
                      {displayValue == null ? '—' : formatNumber(displayValue)}
                    </span>
                    <span className="text-xs ml-0.5">{data.unit}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Deviation Badge & Tooltip */}
          {(() => {
             let hasDeviation = false;
             let diffPercent: number | null = null;
             let refValue: number | null = null;
             let newValue: number | null = null;

             if (comparisonEnabled && compareData) {
                if (compareData.value_a != null && compareData.value_b != null) {
                   const diff = Math.abs(compareData.value_a - compareData.value_b);
                   if (diff > 0.000001) {
                      hasDeviation = true;
                      // User Request: "B en fonction de A" -> (B - A) / A
                      // So A is Reference, B is New Value
                      refValue = compareData.value_a; 
                      newValue = compareData.value_b;
                      if (refValue !== 0) {
                         diffPercent = ((newValue - refValue) / Math.abs(refValue)) * 100;
                      }
                   }
                }
             } else if (activeScenarioId && scenarioData) {
                const base = data.value_computed;
                const scen = scenarioData.scenario_value;
                if (base != null && scen != null) {
                   const diff = Math.abs(scen - base);
                   if (diff > 0.000001) {
                      hasDeviation = true;
                      // Scenario vs Baseline: Baseline is Reference
                      refValue = base;
                      newValue = scen;
                      if (refValue !== 0) {
                         diffPercent = ((newValue - refValue) / Math.abs(refValue)) * 100;
                      }
                   }
                }
             }

             if (!hasDeviation) return null;

             const isPositive = diffPercent !== null && diffPercent > 0; // Increase
             const isNegative = diffPercent !== null && diffPercent < 0; // Decrease
             
             // User Logic: Positive = Green, Negative = Red
             
             let badgeColorClass = "bg-amber-500"; // Default/Neutral
             let borderColorClass = "border-amber-500/50";
             let textColorClass = "text-amber-400";

             if (isPositive) {
                badgeColorClass = "bg-emerald-500"; // Positive -> Green
                borderColorClass = "border-emerald-500/50";
                textColorClass = "text-emerald-400";
             }
             if (isNegative) {
                badgeColorClass = "bg-red-500"; // Negative -> Red
                borderColorClass = "border-red-500/50";
                textColorClass = "text-red-400";
             }

             return (
               <>
                 <div className={`absolute -top-6 -right-6 w-7 h-7 rounded-full ${badgeColorClass} shadow-md ring-2 ring-white dark:ring-zinc-900 z-30 flex items-center justify-center animate-pulse`} />
                 
                 {/* Tooltip on Node Hover */}
                 {isHovered && (
                   <div className="absolute bottom-full right-0 mb-4 z-[100] w-max pointer-events-none">
                     <div className={`bg-zinc-950 text-white text-base rounded-xl p-4 shadow-[0_0_30px_-5px_rgba(0,0,0,0.6)] border ${borderColorClass} flex flex-col items-end gap-1 animate-in fade-in zoom-in-95 duration-150 slide-in-from-bottom-2 min-w-[220px]`}>
                       <div className="font-bold whitespace-nowrap flex items-center gap-2 text-lg">
                         {diffPercent != null ? (
                           <>
                             <span className={textColorClass}>
                               {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                             </span>
                             <span className="text-zinc-300 font-medium text-base">d&apos;écart</span>
                           </>
                         ) : (
                           'Valeur différente'
                         )}
                       </div>
                       <div className="text-sm text-zinc-400 whitespace-nowrap font-medium">
                         {comparisonEnabled ? 'Entre A et B' : 'Par rapport à la baseline'}
                       </div>
                     </div>
                     {/* Arrow */}
                     <div className={`w-4 h-4 bg-zinc-950 transform rotate-45 absolute bottom-[-8px] right-6 border-r border-b ${borderColorClass}`} />
                   </div>
                 )}
               </>
             );
          })()}

          {/* Comparison mode: show A/B values */}
          {comparisonEnabled && compareData && (
            <div className="mt-1 space-y-0.5 text-[11px] text-zinc-700 dark:text-zinc-200">
              <div className="flex items-baseline gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                </span>
                <span className="font-mono font-semibold">
                  {compareData.value_a == null ? '—' : formatNumber(compareData.value_a)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-mono font-semibold">
                  {compareData.value_b == null ? '—' : formatNumber(compareData.value_b)}
                </span>
              </div>
            </div>
          )}



          {/* Error Badge only */}
          {hasError && (
            <div className="mt-1">
              <Badge variant="destructive" className="text-[9px]">Erreur</Badge>
            </div>
          )}
        </div>

        {/* No source handle for decision (leaf) nodes */}
        {!isLeaf && (
          <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        )}
      </div>
    </>
  );
}
