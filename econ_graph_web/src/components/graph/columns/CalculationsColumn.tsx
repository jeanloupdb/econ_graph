
import { ColumnHeader, ColumnShell } from "@/components/graph/common/ColumnShell";
import { AiActionableArea } from "@/components/graph/common/AiActionableArea";
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { useValueChanged } from "@/hooks/useValueChanged";
import { AlertCircle, Circle, Network, Triangle } from "lucide-react";
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

  useEffect(() => {
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const targetId = intermediates.find(n => highlightedNodeIds.has(n.id))?.id;
      if (!targetId) { setScrollHint(null); return; }
      const element = document.getElementById(`node-calc-${targetId}`);
      if (!element) return;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const node = nodeById.get(targetId);
      const label = node?.label || node?.slug;
      if (elementRect.top < containerRect.top - 10) {
        setScrollHint({ direction: 'up', label });
      } else if (elementRect.bottom > containerRect.bottom + 10) {
        setScrollHint({ direction: 'down', label });
      } else {
        setScrollHint(null);
      }
    };
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [highlightedNodeIds, intermediates, nodeById]);

  const selectedNodeIsIntermediate = selectedCenterNodeId
    ? intermediates.some(i => i.id === selectedCenterNodeId)
    : false;

  return (
    <ColumnShell
      color="purple"
      bg="muted"
      compact={compact}
      isLoading={isLoading}
      scrollHint={scrollHint}
      scrollHintHidden={selectedNodeIsIntermediate}
    >
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
          {/* Header */}
          <ColumnHeader compact={compact}>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Triangle className="h-4 w-4 fill-current rotate-90 text-purple-500" />
                Calculs
              </span>
              <span className="text-sm text-muted-foreground">({intermediates.length})</span>
            </div>
          </ColumnHeader>

          {/* Calculations list */}
          <div
            ref={scrollContainerRef}
            className={cn(
              "p-5",
              !compact && "flex-1 overflow-y-auto",
              compact && "pb-24"
            )}
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="space-y-2">
              {intermediates.map((node) => (
                <CalculationCard
                  key={node.id}
                  node={node}
                  isLightMode={isLightMode}
                  isLoading={isLoading}
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
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-muted-foreground">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-muted">
                    <Network className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium mb-1">Aucun calcul intermédiaire</p>
                  <p className="text-xs text-center max-w-[200px] text-muted-foreground">
                    Les paramètres sont directement liés aux résultats
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </ColumnShell>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────
function CalculationCard({
  node,
  isLightMode,
  isLoading,
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
  isLoading?: boolean;
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
  const { changed: valueChanged, direction } = useValueChanged(displayValue, isLoading);

  return (
    <div
      id={domId}
      onClick={onSelect}
      className={cn(
        "rounded-xl transition-all duration-200 cursor-pointer border relative overflow-hidden",
        "bg-card border-transparent hover:border-border hover:shadow-sm",
        isFaded && "opacity-30",
        isFlashHighlight
          ? "bg-purple-50 border-purple-200 ring-2 ring-purple-100"
          : valueChanged
            ? "ring-1 ring-purple-300 border-purple-200"
            : (isHighlighted && "ring-1 ring-purple-200 border-purple-100")
      )}
    >
      {/* Ripple overlay on value change */}
      {valueChanged && (
        <div className={cn(
          "absolute inset-0 pointer-events-none animate-card-ripple rounded-xl",
          direction === "up" ? "bg-emerald-100" : "bg-rose-100"
        )} />
      )}
      <AiActionableArea
        isLightMode={isLightMode}
        className="h-full rounded-xl flex flex-col relative"
        context={{
          label: node.label || node.slug,
          type: "calculation",
          target: { kind: "node", id: node.id },
        }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {node.computation_error && (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" title={node.computation_error} />
              )}
              <span className={cn(
                "text-sm font-medium truncate",
                node.computation_error
                  ? "text-red-500"
                  : isHighlighted ? "text-purple-700" : "text-foreground"
              )}>
                {node.label || node.slug}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span
                key={displayValue}
                className={cn(
                  "text-xl font-mono font-semibold tabular-nums inline-block",
                  valueChanged && "animate-value-pulse",
                  node.computation_error
                    ? "text-red-400"
                    : valueChanged
                      ? (direction === "up" ? "text-emerald-600" : "text-rose-600")
                      : diff && Math.abs(diff) > 1e-9
                        ? (diff > 0 ? "text-green-600" : "text-red-600")
                        : "text-foreground"
                )}
              >
                {node.computation_error ? "—" : formatNumber(displayValue)}
              </span>
              {node.unit && !node.computation_error && (
                <span className="text-xs text-muted-foreground">{node.unit}</span>
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

        {parents.length > 0 && (
          <div className="px-4 pb-3">
            <span className="text-xs text-muted-foreground">Dépend de</span>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {visibleParents.map(parent => (
                <div
                  key={parent.id}
                  onClick={(e) => { e.stopPropagation(); onDependencyClick(parent.id); }}
                  onMouseEnter={() => onHover(true, parent.id)}
                  onMouseLeave={() => onHover(false)}
                  className="flex items-center gap-1.5 cursor-pointer transition-colors hover:opacity-70 text-muted-foreground"
                  title={`${parent.label || parent.slug} (${getNodeType(parent.id) === 'parameter' ? 'Paramètre' : 'Calcul'})`}
                >
                  {getNodeType(parent.id) === 'parameter' ? (
                    <Circle className="h-2 w-2 fill-current shrink-0 text-blue-500" />
                  ) : (
                    <Triangle className="h-2 w-2 fill-current shrink-0 rotate-90 text-purple-500" />
                  )}
                  <span className="text-xs">{parent.label || parent.slug}</span>
                </div>
              ))}
              {hasMoreParents && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                  className="text-xs font-medium transition-colors hover:underline text-muted-foreground hover:text-foreground"
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
