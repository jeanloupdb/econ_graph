
import { AiActionableArea } from "@/components/graph/common/AiActionableArea";
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { AlertCircle, ChevronDown, ChevronRight, ChevronUp, Circle, Loader2, Network, Triangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CalculationsColumnProps {
  isLoading?: boolean;
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
  navigateToDependency,
  isLoading,
  compact = false,
}: CalculationsColumnProps & { compact?: boolean }) {
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
          "flex flex-col relative",
          compact ? "overflow-visible min-h-full" : "flex-1 overflow-hidden rounded-2xl shadow-sm",
          compact
            ? "bg-[#f5f5f7]"
            : "bg-[#f5f5f7] border border-zinc-200 shadow-zinc-200/60"
        )}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm animate-in fade-in duration-300">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <span className="sr-only">Chargement...</span>
          </div>
        )}
        {/* Scroll Indicators - Floating over the list */}
        {scrollHint && !selectedNodeIsIntermediate && (
            <div className={cn(
                "absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-none py-1.5 backdrop-blur-sm transition-all animate-in fade-in duration-300",
                scrollHint.direction === 'up' ? "top-[88px] border-b shadow-sm" : "bottom-0 border-t shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]",
                "bg-purple-50/95 text-purple-700 border-purple-100/70"
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
          "shrink-0 border-b flex items-center justify-center group/header bg-white border-zinc-200",
          compact ? "py-3" : "h-[88px]",
        )}>
          <div className="flex items-center gap-2">
            <AiActionableArea
                isLightMode={isLightMode}
                className="rounded-lg p-1 -m-1"
                context={{
                  label: "Calculs",
                  type: "calculation",
                  target: { kind: "section", id: "calculations" },
                }}
            >
              <span className="text-lg font-semibold flex items-center gap-2 text-zinc-700">
                <Triangle className="h-4 w-4 fill-current rotate-90 text-purple-500" />
                Calculs
              </span>
            </AiActionableArea>
            <span className="text-sm text-zinc-400">
              ({intermediates.length})
            </span>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className={cn("p-5 graph-light-scrollbar", !compact && "flex-1 overflow-y-auto", compact && "pb-24")}
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
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-zinc-400">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-zinc-100">
                    <Network className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium mb-1">Aucun calcul intermédiaire</p>
                  <p className="text-xs text-center max-w-[200px] text-zinc-400">
                    Les paramètres sont directement liés aux résultats
                  </p>
                </div>
              )}
          </div>
        </div>

          </>
        )}
      </div>

      {/* Chevron separator 2 — hidden on mobile */}
      {!compact && (
      <div className="flex flex-col pt-[88px]">
        <div className="flex-1 flex items-center justify-center px-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-200 text-zinc-500">
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </div>
      )}
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
        "rounded-xl transition-all duration-200 cursor-pointer border",
        "bg-white border-transparent hover:border-zinc-200 hover:shadow-sm",
        isFaded && "opacity-30",
        isFlashHighlight
          ? "bg-purple-50 border-purple-200 ring-2 ring-purple-100"
          : (isHighlighted && "ring-1 ring-purple-200 border-purple-100")
      )}
    >
      <AiActionableArea
          isLightMode={isLightMode}
          className="h-full rounded-xl flex flex-col"
          context={{
            label: node.label || node.slug,
            type: "calculation",
            target: { kind: "node", id: node.id },
          }}
      >
        {/* Header */}
        <div className="px-4 py-3 group/card">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {node.computation_error && (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" title={node.computation_error} />
              )}
              <span className={cn(
                "text-sm font-medium truncate",
                node.computation_error
                  ? "text-red-500"
                  : isHighlighted
                    ? "text-purple-700"
                    : "text-zinc-800"
              )}>
                {node.label || node.slug}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className={cn(
                "text-xl font-mono font-semibold tabular-nums",
                node.computation_error
                  ? "text-red-400"
                  : diff && Math.abs(diff) > 1e-9
                    ? (diff > 0 ? "text-green-600" : "text-red-600")
                    : "text-zinc-900"
              )}>
                {node.computation_error ? "—" : formatNumber(displayValue)}
              </span>
              {node.unit && !node.computation_error && (
                <span className="text-xs text-zinc-400">
                  {node.unit}
                </span>
              )}
              <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={isScenarioActive} />
            </div>
          </div>
          {node.computation_error && (
            <p className="text-[10px] text-red-400/80 mt-1 truncate" title={node.computation_error}>
              {node.computation_error}
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
