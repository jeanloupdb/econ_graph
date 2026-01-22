
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { ChevronDown, ChevronUp, Circle, Triangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ResultsColumnProps {
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
  navigateToDependency
}: ResultsColumnProps) {
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
      // Note: We check against the container's viewport
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
          "flex-1 flex flex-col overflow-hidden rounded-2xl shadow-lg relative",
          isLightMode
            ? "bg-zinc-50/50 border border-zinc-300 shadow-lg"
            : "bg-zinc-900/50 border border-zinc-700 shadow-lg shadow-black/20"
        )}
        onClick={() => {
          if (!viewFullResultDetailId) {
            setSelectedResultId(null);
          }
        }}
      >
        {/* Scroll Indicators - Floating over the list */}
        {scrollHint && !viewFullResultDetailId && (
            <div className={cn(
                "absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-none py-1.5 backdrop-blur-sm transition-all animate-in fade-in duration-300",
                scrollHint.direction === 'up' ? "top-[88px] border-b shadow-sm" : "bottom-0 border-t shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]",
                isLightMode 
                  ? "bg-emerald-50/95 text-emerald-700 border-emerald-100/50" 
                  : "bg-zinc-900/95 text-emerald-400 border-emerald-900/30"
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
          "shrink-0 h-[88px] border-b flex items-center justify-center",
          isLightMode ? "border-zinc-200" : "border-zinc-800"
        )} onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <span className={cn(
              "text-lg font-semibold",
              isLightMode ? "text-emerald-600" : "text-emerald-400"
            )}>
              Résultats
            </span>
            <span className={cn("text-sm ml-2", isLightMode ? "text-zinc-400" : "text-zinc-500")}>
              ({results.length})
            </span>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3"
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
        "rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border",
        isLightMode
          ? "bg-white border-transparent hover:border-zinc-300 hover:shadow-sm"
          : "bg-zinc-800/60 border-transparent hover:border-zinc-600 hover:shadow-md hover:shadow-black/20",
        isFaded && "opacity-30",
        isFlashHighlight
          ? (isLightMode ? "bg-emerald-100 border-emerald-300 ring-2 ring-emerald-200" : "bg-emerald-900/40 border-emerald-500/50 ring-2 ring-emerald-900/50")
          : (isHighlighted && (isLightMode ? "ring-1 ring-emerald-300 border-emerald-200" : "ring-1 ring-emerald-500/50 border-emerald-800"))
      )}
    >
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "text-xs font-medium uppercase tracking-wide",
            isHighlighted
              ? (isLightMode ? "text-emerald-700" : "text-emerald-300")
              : (isLightMode ? "text-zinc-500" : "text-zinc-400")
          )}>
            {node.label || node.slug}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-3xl font-mono font-bold tabular-nums tracking-tight",
            diff && Math.abs(diff) > 1e-9
              ? (diff > 0 ? "text-green-600" : "text-red-600")
              : (isLightMode ? "text-zinc-900" : "text-white")
          )}>
            {formatNumber(displayValue)}
          </span>
          {node.unit && (
            <span className={cn("text-sm", isLightMode ? "text-zinc-400" : "text-zinc-500")}>
              {node.unit}
            </span>
          )}
          <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={isScenarioActive} />
        </div>
        {/* Notes */}
        {node.notes && (
          <p className={cn(
            "text-xs mt-2 line-clamp-2",
            isLightMode ? "text-zinc-500" : "text-zinc-400"
          )}>
            {node.notes}
          </p>
        )}
      </div>

      {/* Parents list */}
      {parents.length > 0 && (
        <div className={cn(
          "px-4 pb-3 space-y-1",
          isLightMode ? "border-t border-zinc-100" : "border-t border-zinc-700"
        )}>
          <div className={cn(
            "text-[10px] uppercase tracking-wider pt-2 pb-1",
            isLightMode ? "text-zinc-400" : "text-zinc-600"
          )}>
            Calculé à partir de
          </div>
          {visibleParents.map((p) => {
            const parentValues = getNodeValues(p.id);
            const parentDisplay = isScenarioActive ? parentValues.scenario : parentValues.baseline;
            const parentType = getNodeType(p.id);

            return (
              <div
                key={p.id}
                onClick={(e) => { e.stopPropagation(); onDependencyClick(p.id); }}
                onMouseEnter={() => onHover(true, p.id)}
                onMouseLeave={() => onHover(false)}
                className={cn(
                  "flex items-center justify-between py-1.5 px-2 -mx-2 text-xs rounded-md cursor-pointer transition-colors group",
                  isLightMode
                    ? "text-zinc-600 hover:bg-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-700"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {parentType === 'parameter' && (
                    <Circle className={cn("h-1.5 w-1.5 fill-current shrink-0", isLightMode ? "text-blue-500" : "text-blue-400")} />
                  )}
                  {parentType === 'calculation' && (
                    <Triangle className={cn("h-1.5 w-1.5 fill-current shrink-0 rotate-90", isLightMode ? "text-purple-500" : "text-purple-400")} />
                  )}
                  <span className="truncate">{p.label || p.slug}</span>
                </div>
                <span className={cn(
                  "font-mono ml-2 shrink-0",
                  isLightMode ? "text-zinc-500" : "text-zinc-500"
                )}>
                  {formatNumber(parentDisplay)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Expansion footer */}
      {hasMoreParents && (
        <div
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className={cn(
            "px-4 py-2 text-[11px] font-medium text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
            isLightMode
              ? "border-t border-zinc-100 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              : "border-t border-zinc-700 text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300"
          )}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Réduire
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              +{parents.length - 2} autres dépendances
            </>
          )}
        </div>
      )}
    </div>
  );
}
