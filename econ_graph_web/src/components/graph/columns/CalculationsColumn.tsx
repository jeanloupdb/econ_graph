
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { ChevronDown, ChevronRight, ChevronUp, Circle, Network, Triangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CalculationsColumnProps {
  isLightMode: boolean;
  intermediates: Node[];
  highlightedNodeIds: Set<string>;
  hasActiveInteraction: boolean;
  isScenarioActive: boolean;

  // Selection
  selectedCenterNodeId: string | null;
  setSelectedCenterNodeId: (id: string | null) => void;
  clearCenterSelection: () => void;

  // Hover
  setHoveredNodeId: (id: string | null) => void;

  // Data access
  nodeById: Map<string, Node>;
  getNodeValues: (id: string) => { baseline: number | null; scenario: number | null; diff: number | null };
  getNodeDependencies: (id: string) => { parents: Node[], children: Node[] };
  getNodeType: (id: string) => 'parameter' | 'calculation' | 'result' | null;
  nodes: Node[];

  // Flash highlight & navigation
  flashHighlightId: string | null;
  navigateToDependency: (nodeId: string) => void;
}

export function CalculationsColumn({
  isLightMode,
  intermediates,
  highlightedNodeIds,
  hasActiveInteraction,
  isScenarioActive,
  selectedCenterNodeId,
  setSelectedCenterNodeId,
  clearCenterSelection,
  setHoveredNodeId,
  nodeById,
  getNodeValues,
  getNodeDependencies,
  getNodeType,
  nodes,
  flashHighlightId,
  navigateToDependency
}: CalculationsColumnProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollHint, setScrollHint] = useState<{ direction: 'up' | 'down'; label?: string } | null>(null);

  // Scroll hint logic
  useEffect(() => {
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Find first highlighted node in this column
      const targetId = intermediates.find(n => highlightedNodeIds.has(n.id))?.id;
      
      if (!targetId) {
        setScrollHint(null);
        return;
      }

      const element = document.getElementById(`node-calc-${targetId}`);
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
  }, [highlightedNodeIds, intermediates, nodeById]);

  const selectedNodeIsIntermediate = selectedCenterNodeId ? intermediates.some(i => i.id === selectedCenterNodeId) : false;

  return (
    /* CENTRE — CALCULS / DÉTAIL (1/3) */
    <>
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden rounded-2xl shadow-lg relative",
          isLightMode
            ? "bg-zinc-50 border border-zinc-300 shadow-zinc-300/50"
            : "bg-zinc-950 border border-zinc-700 shadow-black/30"
        )}
      >
        {/* Scroll Indicators - Floating over the list */}
        {scrollHint && !selectedNodeIsIntermediate && (
            <div className={cn(
                "absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-none py-1.5 backdrop-blur-sm transition-all animate-in fade-in duration-300",
                scrollHint.direction === 'up' ? "top-[88px] border-b shadow-sm" : "bottom-0 border-t shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]",
                isLightMode 
                  ? "bg-purple-50/95 text-purple-700 border-purple-100/50" 
                  : "bg-zinc-900/95 text-purple-400 border-purple-900/30"
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

        {selectedNodeIsIntermediate && selectedCenterNodeId ? (
          <InlineNodeDetail
            nodeId={selectedCenterNodeId}
            colorScheme="purple"
            onClose={clearCenterSelection}
            nodeById={nodeById}
            getNodeValues={getNodeValues}
            getNodeDependencies={getNodeDependencies}
            getNodeType={getNodeType}
            isScenarioActive={isScenarioActive}
            isLightMode={isLightMode}
            onNodeClick={(id) => setSelectedCenterNodeId(id)}
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
        )}>
          <div className="text-center">
            <span className={cn(
              "text-lg font-semibold flex items-center gap-2",
              isLightMode ? "text-purple-600" : "text-purple-400"
            )}>
              <Triangle className="h-4 w-4 fill-current rotate-90" />
              Calculs
            </span>
            <span className={cn("text-sm ml-2", isLightMode ? "text-zinc-400" : "text-zinc-500")}>
              ({intermediates.length})
            </span>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="space-y-2">
              {intermediates.map((node) => (
                <CalculationCard
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
                  onSelect={() => setSelectedCenterNodeId(node.id)}
                  onHover={(hovered, nodeId) => setHoveredNodeId(hovered && nodeId ? nodeId : null)}
                  onDependencyClick={navigateToDependency}
                  domId={`node-calc-${node.id}`}
                />
              ))}

              {intermediates.length === 0 && (
                <div className={cn(
                  "flex-1 flex flex-col items-center justify-center py-12 px-4",
                  isLightMode ? "text-zinc-400" : "text-zinc-600"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                    isLightMode ? "bg-zinc-100" : "bg-zinc-800"
                  )}>
                    <Network className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium mb-1">Aucun calcul intermédiaire</p>
                  <p className={cn(
                    "text-xs text-center max-w-[200px]",
                    isLightMode ? "text-zinc-400" : "text-zinc-500"
                  )}>
                    Les paramètres sont directement liés aux résultats
                  </p>
                </div>
              )}
          </div>
        </div>

          </>
        )}
      </div>

      {/* Chevron separator 2 */}
      <div className="flex flex-col pt-[88px]">
        <div className="flex-1 flex items-center justify-center px-1">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isLightMode ? "bg-zinc-200 text-zinc-500" : "bg-zinc-800 text-zinc-400"
          )}>
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </>
  );
}

// Sub-component for expandable calculation cards
function CalculationCard({
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
          : "bg-zinc-900 border-transparent hover:border-zinc-700 hover:shadow-md hover:shadow-black/20",
        isFaded && "opacity-30",
        isFlashHighlight
          ? (isLightMode ? "bg-purple-100 border-purple-300 ring-2 ring-purple-200" : "bg-purple-900/40 border-purple-500/50 ring-2 ring-purple-900/50")
          : (isHighlighted && (isLightMode ? "ring-1 ring-purple-300 border-purple-200" : "ring-1 ring-purple-500/50 border-purple-800"))
      )}
    >
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-sm font-medium",
            isHighlighted
              ? (isLightMode ? "text-purple-700" : "text-purple-300")
              : (isLightMode ? "text-zinc-800" : "text-zinc-200")
          )}>
            {node.label || node.slug}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "text-sm font-mono font-semibold",
              diff && Math.abs(diff) > 1e-9
                ? (diff > 0 ? "text-green-600" : "text-red-600")
                : (isLightMode ? "text-zinc-900" : "text-white")
            )}>
              {formatNumber(displayValue)}
            </span>
            <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={isScenarioActive} />
          </div>
        </div>
      </div>

      {/* Parents list */}
      {parents.length > 0 && (
        <div className={cn(
          "px-4 pb-3 space-y-1",
          isLightMode ? "border-t border-zinc-100" : "border-t border-zinc-800"
        )}>
          <div className={cn(
            "text-[10px] uppercase tracking-wider pt-2 pb-1",
            isLightMode ? "text-zinc-400" : "text-zinc-600"
          )}>
            Dépend de
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
                    : "text-zinc-400 hover:bg-zinc-800"
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
              ? "border-t border-zinc-100 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
              : "border-t border-zinc-800 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
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
