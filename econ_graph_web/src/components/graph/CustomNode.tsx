'use client';

import { useMemo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { formatNumber } from '@/lib/utils';
import { Calculator, Layers } from 'lucide-react';
import type { Node } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/store/uiState';
import { useScenarioStore } from '@/store/scenarioState';
import { useTheme, useNodeTones } from '@/lib/api/hooks';
import { useGraphData } from '@/graph/context/GraphDataContext';
import { getNodeDisplayIdentifier } from '@/lib/nodes';
import { resolveTonePalette } from '@/lib/nodeStyles';
import { useProjectStore } from '@/store/projectState';
import { useGraphActions } from '@/graph/context/GraphActionsContext';

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
  const toneColors = theme?.node_tone?.[tone];
  const baseStyle: React.CSSProperties | undefined = toneColors
    ? { backgroundColor: toneColors.bg, borderColor: toneColors.border }
    : undefined;
  const compositeStyle: React.CSSProperties | undefined = isCompositeNode
    ? { backgroundColor: 'rgba(251, 191, 36, 0.18)', borderColor: '#f59e0b' }
    : undefined;

  const pushPanel = useUIStore((s) => s.pushPanel);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const highlightedNodeId = useUIStore((s) => s.highlightedNodeId);
  const isHighlighted = highlightedNodeId === id;

  // Selection ring matches tone
  const ringColor = isCompositeNode
    ? '#f59e0b'
    : (toneColors?.border || (hasError ? '#ef4444' : isRoot ? '#f59e0b' : isLeaf ? '#10b981' : '#3b82f6'));
  const containerSelected = selected ? `shadow-md` : 'shadow-sm';
  const highlightAnimationClass = isHighlighted ? 'animate-pulse' : '';
  const boxShadows: string[] = [];
  if (selected) {
    boxShadows.push(`0 0 0 2px ${ringColor}`);
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
    const explicitTone = toneEntries?.[nodeId]?.tone;
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

  return (
    <div
      className={`rounded-lg border p-3 ${containerSelected} ${highlightAnimationClass} min-w-[220px] relative transition-transform`}
      style={{ ...(baseStyle || {}), ...(compositeStyle || {}), boxShadow }}
    >

      {/* Algorithm label removed in graph view */}

      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-2 flex-wrap">
              <span>
                {displaySlug}
                {!comparisonEnabled && (
                  <>
                    {' = '}
                    <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                      {displayValue == null ? '—' : formatNumber(displayValue)}
                    </span>
                    <span className="text-[10px]">{data.unit}</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {isCompositeNode && (
                <Layers className="h-3 w-3 text-amber-600 dark:text-amber-300" />
              )}
              <h3 className="font-medium leading-tight truncate max-w-[180px]">
                {data.label}
              </h3>
              {isComputed && (
                <Calculator
                  className={`h-3 w-3 ${
                    hasError ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                  }`}
                />
              )}
            </div>
          </div>
        </div>

        {/* Comparison mode: show A/B values */}
        {comparisonEnabled && compareData && (
          <div className="mt-1 space-y-0.5 text-[11px] text-zinc-700 dark:text-zinc-200">
            <div className="flex items-baseline gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </span>
              <span className="font-mono">
                {compareData.value_a == null ? '—' : formatNumber(compareData.value_a)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono">
                {compareData.value_b == null ? '—' : formatNumber(compareData.value_b)}
              </span>
            </div>
          </div>
        )}

        {/* Hide verbose preview for decision leaves; keep for others */}
        {!comparisonEnabled && isComputed && !isLeaf && (
          <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">
            <div className="flex items-center gap-1">
              <span className="font-mono truncate max-w-[190px]">{(data.computation_definition || '').slice(0, 42)}{(data.computation_definition || '').length > 42 ? '…' : ''}</span>
            </div>
            {hasError && (
              <div className="mt-1">
                <Badge variant="destructive" className="text-[9px]">Erreur</Badge>
              </div>
            )}
            {inputs.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {inputs.slice(0,3).map((src, idx) => {
                  const sourceNode = nodesById.get(src);
                  const toneKey = getToneForNode(src);
                  const palette = resolveTonePalette(toneKey, theme?.node_tone);
                  const isCompositeSource = Boolean(sourceNode?.composite_id);
                  return (
                    <span
                      key={`${src}-${idx}`}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        isCompositeSource
                          ? 'shadow-[inset_0_0_0_1px_rgba(245,158,11,0.35)]'
                          : ''
                      }`}
                      style={{
                        backgroundColor: palette.bg,
                        borderColor: palette.border,
                        color: palette.text,
                      }}
                    >
                      {isCompositeSource && <Layers className="h-3 w-3 text-amber-600 dark:text-amber-300" />}
                      {resolveInputLabel(src)}
                    </span>
                  );
                })}
                {inputs.length > 3 && (
                  <Badge variant="secondary" className="text-[9px]">+{inputs.length - 3}</Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* No source handle for decision (leaf) nodes */}
      {!isLeaf && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      )}

      {/* Decision badge removed by request */}
    </div>
  );
}
