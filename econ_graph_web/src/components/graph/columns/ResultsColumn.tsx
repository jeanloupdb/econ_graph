import { ColumnShell } from "@/components/graph/common/ColumnShell";
import { AiActionableArea } from "@/components/graph/common/AiActionableArea";
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { useUIStore } from "@/store/uiState";
import { ColumnHeader } from "@/components/graph/common/ColumnShell";
import { cva } from "class-variance-authority";
import { useValueChanged } from "@/hooks/useValueChanged";
import { AlertCircle, Circle, Triangle } from "lucide-react";
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
  const setColumnViewMode = useUIStore((s) => s.setColumnViewMode);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollHint, setScrollHint] = useState<{ direction: 'up' | 'down'; label?: string } | null>(null);

  useEffect(() => {
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const targetId = results.find(n => highlightedNodeIds.has(n.id))?.id;
      if (!targetId) { setScrollHint(null); return; }
      const element = document.getElementById(`node-res-${targetId}`);
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
  }, [highlightedNodeIds, results, nodeById]);

  return (
    <ColumnShell
      color="emerald"
      compact={compact}
      isLoading={isLoading}
      scrollHint={scrollHint}
      scrollHintHidden={!!viewFullResultDetailId}
      onClick={() => { if (!viewFullResultDetailId) setSelectedResultId(null); }}
      className={!compact ? "animate-in fade-in slide-in-from-right-3 duration-300" : undefined}
    >
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
          {/* Header */}
          <ColumnHeader compact={compact} stopPropagation>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <svg className="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 10 10" fill="currentColor">
                  <polygon points="5,0 9.3,2.5 9.3,7.5 5,10 0.7,7.5 0.7,2.5" />
                </svg>
                Résultats
              </span>
              <span className="text-sm text-muted-foreground">({results.length})</span>
            </div>

          </ColumnHeader>

          {/* Results list */}
          <div
            ref={scrollContainerRef}
            className={cn(
              "p-5",
              !compact && "flex-1 overflow-y-auto pb-6",
              compact && "pb-24"
            )}
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="space-y-2">
              {results.map((node) => (
                <ResultCard
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
    </ColumnShell>
  );
}

// ── ResultCard variants (cva) ─────────────────────────────────────────────────
const resultCardVariants = cva(
  "relative rounded-xl transition-all duration-200 cursor-pointer border",
  {
    variants: {
      state: {
        default:     "bg-card border-border hover:bg-accent/40",
        highlighted: "bg-card ring-1 ring-emerald-200 border-emerald-100",
        flash:       "bg-emerald-50 border-emerald-200 ring-2 ring-emerald-100",
        faded:       "bg-card border-border opacity-30",
      },
    },
    defaultVariants: { state: "default" },
  }
);

// ── Sub-component ─────────────────────────────────────────────────────────────
function ResultCard({
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

  // Visual differentiation by value sign
  const isError = !!node.computation_error;
  const isPositive = !isError && displayValue !== null && displayValue > 1e-9;
  const isNegative = !isError && displayValue !== null && displayValue < -1e-9;
  // Value text color — always colored by sign, overridden by scenario diff or value change flash
  const valueColorClass = isError
    ? "text-red-400"
    : valueChanged
      ? (direction === "up" ? "text-emerald-500" : "text-rose-500")
      : isScenarioActive && diff && Math.abs(diff) > 1e-9
        ? (diff > 0 ? "text-emerald-500" : "text-rose-500")
        : isPositive ? "text-emerald-500"
          : isNegative ? "text-rose-500"
            : "text-foreground";

  const cardState = isFlashHighlight ? "flash" : isFaded ? "faded" : isHighlighted ? "highlighted" : "default";

  return (
    <div
      id={domId}
      onClick={onSelect}
      className={cn(
        resultCardVariants({ state: cardState }),
        "relative overflow-hidden",
        valueChanged && !isFlashHighlight && "ring-1 ring-emerald-300 border-emerald-200"
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
          type: "result",
          target: { kind: "node", id: node.id },
        }}
      >
        <div className="pl-4 pr-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {isError && (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" title={node.computation_error} />
              )}
              <span className={cn(
                "text-xs font-medium uppercase tracking-wide truncate",
                isError ? "text-red-500" : isHighlighted ? "text-emerald-700" : "text-muted-foreground"
              )}>
                {node.label || node.slug}
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              key={displayValue}
              className={cn(
                "text-3xl font-mono font-bold tabular-nums tracking-tight inline-block",
                valueChanged && "animate-value-pulse",
                valueColorClass
              )}
            >
              {isError ? "—" : formatNumber(displayValue)}
            </span>
            {node.unit && !isError && (
              <span className="text-sm text-muted-foreground">{node.unit}</span>
            )}
            <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={isScenarioActive} />
          </div>
          {isError && (
            <p className="text-[10px] text-red-400/80 mt-1 truncate" title={node.computation_error}>
              {node.computation_error}
            </p>
          )}
          {node.notes && (
            <p className="text-xs mt-2 text-muted-foreground">{node.notes}</p>
          )}
        </div>

        {parents.length > 0 && (
          <div className="pl-5 pr-4 pb-3">
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

