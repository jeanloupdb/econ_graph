import { AiActionableArea } from "@/components/graph/common/AiActionableArea";
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { AlertCircle, ChevronDown, ChevronUp, Circle, Loader2, Triangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ResultsColumnProps {
  isLoading?: boolean;
  isLightMode: boolean;
  results: Node[];
  isScenarioActive: boolean;
  highlightedNodeIds: Set<string>;
  hasActiveInteraction: boolean;

  // Selection
  selectedResultId: string | null;
  setSelectedResultId: (id: string | null) => void;
  viewFullResultDetailId: string | null;
  setViewFullResultDetailId: (id: string | null) => void;

  // Hover
  setHoveredNodeId: (id: string | null) => void;

  // Data access
  nodeById: Map<string, Node>;
  getNodeValues: (id: string) => { baseline: number | null; scenario: number | null; diff: number | null };
  getNodeDependencies: (id: string) => { parents: Node[], children: Node[] };
  getNodeType: (id: string) => 'parameter' | 'calculation' | 'result' | null;
  nodes: Node[];

  // Actions
  setSelectedCenterNodeId?: (id: string | null) => void;

  // Flash highlight & navigation
  flashHighlightId: string | null;
  navigateToDependency: (nodeId: string) => void;
}

export function ResultsColumn({
  isLightMode,
  results,
  isScenarioActive,
  highlightedNodeIds,
  hasActiveInteraction,
  selectedResultId,
  setSelectedResultId,
  viewFullResultDetailId,
  setViewFullResultDetailId,
  setHoveredNodeId,
  nodeById,
  getNodeValues,
  getNodeDependencies,
  getNodeType,
  nodes,
  setSelectedCenterNodeId,
  flashHighlightId,
  navigateToDependency,
  isLoading,
  compact = false,
}: ResultsColumnProps & { compact?: boolean }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollHint, setScrollHint] = useState<{ direction: 'up' | 'down'; label?: string } | null>(null);

  // Scroll hint logic
  useEffect(() => {
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Find first highlighted node that belongs to THIS column
      const targetId = results.find(n => highlightedNodeIds.has(n.id))?.id;

      if (!targetId) {
        setScrollHint(null);
        return;
      }

      const element = document.getElementById(`node-res-${targetId}`);
      if (!element) return;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Get label for current target
      const node = nodeById.get(targetId);
      const label = node?.label || node?.slug;

      // Check if element is significantly out of view (allowing 10px margin)
      if (elementRect.top < containerRect.top - 10) {
        setScrollHint({ direction: 'up', label });
      } else if (elementRect.bottom > containerRect.bottom + 10) {
        setScrollHint({ direction: 'down', label });
      } else {
        setScrollHint(null);
      }
    };

    // Check on highlight change and scroll
    checkScroll();

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [highlightedNodeIds, results, nodeById]);

  return (
    /* DROITE — RÉSULTATS (1/3) */
      <div
        className={cn(
          "flex flex-col relative",
          compact ? "overflow-visible min-h-full" : "flex-1 overflow-hidden rounded-2xl shadow-sm",
          compact
            ? "bg-white"
            : "bg-white border border-zinc-200 shadow-zinc-200/60"
        )}
        onClick={() => {
          if (!viewFullResultDetailId) {
            setSelectedResultId(null);
          }
        }}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm animate-in fade-in duration-300">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <span className="sr-only">Chargement...</span>
          </div>
        )}
        {/* Scroll Indicators - Floating over the list */}
        {scrollHint && !viewFullResultDetailId && (
            <div className={cn(
                "absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-none py-1.5 backdrop-blur-sm transition-all animate-in fade-in duration-300",
                scrollHint.direction === 'up' ? "top-[88px] border-b shadow-sm" : "bottom-0 border-t shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]",
                "bg-emerald-50/95 text-emerald-700 border-emerald-100/70"
            )}>
                <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
                    {scrollHint.direction === 'up' && <ChevronUp className="h-3.5 w-3.5 animate-bounce" />}
                    <span className="max-w-[200px] truncate">
                      {scrollHint.label ? scrollHint.label : (scrollHint.direction === 'up' ? 'Voir plus haut' : 'Voir plus bas')}
                    </span>
                    {scrollHint.direction === 'down' && <ChevronDown className="h-3.5 w-3.5 animate-bounce" />}
                </div>
            </div>
        )}

        {viewFullResultDetailId ? (
          <InlineNodeDetail
            nodeId={viewFullResultDetailId}
            colorScheme="emerald"
            onClose={() => setViewFullResultDetailId(null)}
            nodeById={nodeById}
            getNodeValues={getNodeValues}
            getNodeDependencies={getNodeDependencies}
            getNodeType={getNodeType}
            isScenarioActive={isScenarioActive}
            isLightMode={isLightMode}
            onNodeClick={(id) => setSelectedCenterNodeId?.(id)}
            onVariableHover={setHoveredNodeId}
            navigateToDependency={navigateToDependency}
            nodes={nodes}
          />
        ) : (
          <>
        {/* Header - Fixed height for alignment */}
        <div className={cn(
          "shrink-0 border-b flex items-center justify-center group/header bg-white border-zinc-200",
          compact ? "py-3" : "h-[88px]",
        )} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <AiActionableArea
                isLightMode={isLightMode}
                className="rounded-lg p-1 -m-1"
                context={{
                  label: "Résultats",
                  type: "result",
                  target: { kind: "section", id: "results" },
                }}
            >
              <span className="text-lg font-semibold text-zinc-700">
                Résultats
              </span>
            </AiActionableArea>
            <span className="text-sm text-zinc-400">
              ({results.length})
            </span>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className={cn("p-5 graph-light-scrollbar", !compact && "flex-1 overflow-y-auto pb-28", compact && "pb-24")}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="space-y-2">
          {results.map((node) => (
            <ResultCard
              key={node.id}
              node={node}
              isLightMode={isLightMode}
              isHighlighted={highlightedNodeIds.has(node.id)}
              isFaded={hasActiveInteraction && !highlightedNodeIds.has(node.id)}
              isFlashHighlight={flashHighlightId === node.id}
              isScenarioActive={isScenarioActive}
              getNodeValues={getNodeValues}
              getNodeDependencies={getNodeDependencies}
              getNodeType={getNodeType}
              onSelect={() => setViewFullResultDetailId(node.id)}
              onHover={(hovered, nodeId) => setHoveredNodeId(hovered && nodeId ? nodeId : null)}
              onDependencyClick={navigateToDependency}
              domId={`node-res-${node.id}`}
            />
          ))}
          </div>
        </div>
          </>
        )}
      </div>
  );
}

// Sub-component for expandable result cards
function ResultCard({
  node,
  isLightMode,
  isHighlighted,
  isFaded,
  isFlashHighlight,
  isScenarioActive,
  getNodeValues,
  getNodeDependencies,
  getNodeType,
  onSelect,
  onHover,
  onDependencyClick,
  domId,
}: {
  node: Node;
  isLightMode: boolean;
  isHighlighted: boolean;
  isFaded: boolean;
  isFlashHighlight: boolean;
  isScenarioActive: boolean;
  getNodeValues: (id: string) => { baseline: number | null; scenario: number | null; diff: number | null };
  getNodeDependencies: (id: string) => { parents: Node[]; children: Node[] };
  getNodeType: (id: string) => 'parameter' | 'calculation' | 'result' | null;
  onSelect: () => void;
  onHover: (hovered: boolean, nodeId?: string) => void;
  onDependencyClick: (nodeId: string) => void;
  domId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { baseline, scenario, diff } = getNodeValues(node.id);
  const displayValue = isScenarioActive ? scenario : baseline;
  const { parents } = getNodeDependencies(node.id);

  const visibleParents = isExpanded ? parents : parents.slice(0, 2);
  const hasMoreParents = parents.length > 2;

  return (
    <div
      id={domId}
      onClick={onSelect}
      className={cn(
        "rounded-xl transition-all duration-200 cursor-pointer border",
        "bg-white border-transparent hover:border-zinc-200 hover:shadow-sm",
        isFaded && "opacity-30",
        isFlashHighlight
          ? "bg-emerald-50 border-emerald-200 ring-2 ring-emerald-100"
          : (isHighlighted && "ring-1 ring-emerald-200 border-emerald-100")
      )}
    >
      <AiActionableArea
          isLightMode={isLightMode}
          className="h-full rounded-xl flex flex-col"
          context={{
            label: node.label || node.slug,
            type: "result",
            target: { kind: "node", id: node.id },
          }}
      >
        {/* Header */}
        <div className="px-4 py-3 group/card">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {node.computation_error && (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" title={node.computation_error} />
              )}
              <span className={cn(
                "text-xs font-medium uppercase tracking-wide truncate",
                node.computation_error
                  ? "text-red-500"
                  : isHighlighted
                    ? "text-emerald-700"
                    : "text-zinc-500"
              )}>
                {node.label || node.slug}
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-3xl font-mono font-bold tabular-nums tracking-tight",
              node.computation_error
                ? "text-red-400"
                : diff && Math.abs(diff) > 1e-9
                  ? (diff > 0 ? "text-emerald-600" : "text-red-500")
                  : "text-zinc-900"
            )}>
              {node.computation_error ? "—" : formatNumber(displayValue)}
            </span>
            {node.unit && !node.computation_error && (
              <span className="text-sm text-zinc-400">
                {node.unit}
              </span>
            )}
            <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={isScenarioActive} />
          </div>
          {node.computation_error && (
            <p className="text-[10px] text-red-400/80 mt-1 truncate" title={node.computation_error}>
              {node.computation_error}
            </p>
          )}
          {/* Notes */}
          {node.notes && (
            <p className="text-xs mt-2 text-zinc-500">
              {node.notes}
            </p>
          )}
        </div>

        {/* Parents list */}
        {parents.length > 0 && (
          <div className="px-4 pb-3">
            <span className="text-xs text-zinc-400">
              Dépend de
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {visibleParents.map(parent => (
              <div
                key={parent.id}
                onClick={(e) => { e.stopPropagation(); onDependencyClick(parent.id); }}
                onMouseEnter={() => onHover(true, parent.id)}
                onMouseLeave={() => onHover(false)}
                className="flex items-center gap-1.5 cursor-pointer transition-colors hover:opacity-70 text-zinc-600"
                title={`${parent.label || parent.slug} (${getNodeType(parent.id) === 'parameter' ? 'Paramètre' : 'Calcul'})`}
              >
                {getNodeType(parent.id) === 'parameter' ? (
                  <Circle className="h-2 w-2 fill-current shrink-0 text-blue-500" />
                ) : (
                  <Triangle className="h-2 w-2 fill-current shrink-0 rotate-90 text-purple-500" />
                )}
                <span className="text-xs">
                  {parent.label || parent.slug}
                </span>
              </div>
            ))}
            {hasMoreParents && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="text-xs font-medium transition-colors hover:underline text-zinc-400 hover:text-zinc-600"
              >
                {isExpanded ? "−" : `+${parents.length - 2}`}
              </button>
            )}
            </div>
          </div>
        )}
      </AiActionableArea>
    </div>
  );
}
