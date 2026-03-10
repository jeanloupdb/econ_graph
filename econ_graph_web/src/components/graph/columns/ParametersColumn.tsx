
import { AiActionableArea } from "@/components/graph/common/AiActionableArea";
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import { Input } from "@/components/ui/input";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { ChevronDown, ChevronRight, ChevronUp, Circle, GitCompare, Loader2, Pencil, Plus, X } from "lucide-react";
import { RefObject, useEffect, useRef, useState } from "react";

interface ParametersColumnProps {
  isLoading?: boolean;
  isLightMode: boolean;
  settings: Node[];
  highlightedNodeIds: Set<string>;
  hasActiveInteraction: boolean;
  activeScenarioId: string | null;
  scenarios: any[];
  creatingScenario: boolean;
  setCreatingScenario: (v: boolean) => void;
  newScenarioName: string;
  setNewScenarioName: (v: string) => void;
  handleCreateScenario: () => void;
  handleScenarioChange: (id: string | null) => void;
  setScenarioToDelete: (v: { id: string; name: string } | null) => void;
  comparisonEnabled: boolean;
  setComparisonMode: (v: boolean) => void;
  scenariosContainerRef: RefObject<HTMLDivElement | null>;

  // Selection
  selectedCenterNodeId: string | null;
  setSelectedCenterNodeId: (id: string | null) => void;
  clearResultSelection: () => void;
  clearCenterSelection: () => void;

  // Hover
  setHoveredNodeId: (id: string | null) => void;

  // Editing
  editingParamId: string | null;
  setEditingParamId: (id: string | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  handleStartEdit: (node: Node) => void;
  handleSaveEdit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;

  // Data access
  nodeById: Map<string, Node>;
  getNodeValues: (id: string) => { baseline: number | null; scenario: number | null; diff: number | null };
  getNodeDependencies: (id: string) => { parents: Node[], children: Node[] };
  getNodeType: (id: string) => 'parameter' | 'calculation' | 'result' | null;
  isScenarioActive: boolean;
  nodes: Node[];

  // Flash highlight & navigation
  flashHighlightId: string | null;
  navigateToDependency: (nodeId: string) => void;
}

export function ParametersColumn({
  isLightMode,
  settings,
  highlightedNodeIds,
  hasActiveInteraction,
  activeScenarioId,
  scenarios,
  creatingScenario,
  setCreatingScenario,
  newScenarioName,
  setNewScenarioName,
  handleCreateScenario,
  handleScenarioChange,
  setScenarioToDelete,
  comparisonEnabled,
  setComparisonMode,
  scenariosContainerRef,
  selectedCenterNodeId,
  setSelectedCenterNodeId,
  clearResultSelection,
  clearCenterSelection,
  setHoveredNodeId,
  editingParamId,
  setEditingParamId,
  editValue,
  setEditValue,
  handleStartEdit,
  handleSaveEdit,
  inputRef,
  nodeById,
  getNodeValues,
  getNodeDependencies,
  getNodeType,
  isScenarioActive,
  nodes,
  flashHighlightId,
  navigateToDependency,
  isLoading,
  compact = false,
}: ParametersColumnProps & { compact?: boolean }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollHint, setScrollHint] = useState<{ direction: 'up' | 'down'; label?: string } | null>(null);

  // Scroll hint logic
  useEffect(() => {
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Find first highlighted node that belongs to THIS column
      const targetId = settings.find(n => highlightedNodeIds.has(n.id))?.id;

      if (!targetId) {
        setScrollHint(null);
        return;
      }

      const element = document.getElementById(`node-param-${targetId}`);
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
  }, [highlightedNodeIds, settings, nodeById]);

  // Helper to check if selected node is a parameter
  const selectedNodeIsParam = selectedCenterNodeId ? settings.some(s => s.id === selectedCenterNodeId) : false;

  return (
      /* GAUCHE — PARAMÈTRES (1/3) */
      <>
      <div
        className={cn(
          "flex flex-col relative",
          compact ? "overflow-visible min-h-full" : "flex-1 overflow-hidden rounded-2xl shadow-sm",
          compact
            ? "bg-white"
            : "bg-white border border-zinc-200 shadow-zinc-200/60"
        )}
        onClick={() => { clearResultSelection(); clearCenterSelection(); }}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm animate-in fade-in duration-300">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="sr-only">Chargement...</span>
          </div>
        )}

        {/* Scroll Indicators - Floating over the list */}
        {scrollHint && !selectedNodeIsParam && (
            <div className={cn(
                "absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-none py-1.5 backdrop-blur-sm transition-all animate-in fade-in duration-300",
                scrollHint.direction === 'up' ? "top-[88px] border-b shadow-sm" : "bottom-0 border-t shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]",
                "bg-blue-50/95 text-blue-700 border-blue-100/70"
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

        {selectedNodeIsParam && selectedCenterNodeId ? (
          <InlineNodeDetail
            nodeId={selectedCenterNodeId}
            colorScheme="blue"
            onClose={clearCenterSelection}
            nodeById={nodeById}
            getNodeValues={getNodeValues}
            getNodeDependencies={getNodeDependencies}
            getNodeType={getNodeType}
            isScenarioActive={isScenarioActive}
            isLightMode={isLightMode}
            onNodeClick={(id) => { setSelectedCenterNodeId(id); clearResultSelection(); }}
            onVariableHover={setHoveredNodeId}
            navigateToDependency={navigateToDependency}
            nodes={nodes}

            // Editing props
            isEditing={editingParamId === selectedCenterNodeId}
            editValue={editValue}
            setEditValue={setEditValue}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={() => setEditingParamId(null)}
            inputRef={inputRef}
          />
        ) : (
          <>
            {/* Header - Fixed height for alignment */}
            <div className={cn(
              "shrink-0 border-b flex flex-col justify-center relative z-10 group/header bg-white border-zinc-200",
              compact ? "py-3" : "h-[88px]",
            )} onClick={(e) => e.stopPropagation()}>
              {/* Title row with AI button */}
              <div className="flex items-center justify-center gap-2">
                <AiActionableArea
                    isLightMode={isLightMode}
                    className="rounded-lg p-1 -m-1"
                    context={{
                      label: "Paramètres",
                      type: "parameter",
                      target: { kind: "section", id: "parameters" },
                    }}
                >
                  <span className="text-lg font-semibold flex items-center gap-2 text-zinc-700">
                    <Circle className="h-4 w-4 fill-current text-blue-500" />
                    Paramètres
                  </span>
                </AiActionableArea>
                <span className="text-sm text-zinc-400">
                  ({settings.length})
                </span>
              </div>

              {/* Scenario row - no separator */}
              <div className="px-4 mt-2 flex items-center justify-center">
                {creatingScenario ? (
                  <div className="flex items-center gap-2 w-full max-w-sm">
                    <Input
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      placeholder="Nom du scénario..."
                      className="h-7 text-xs flex-1 min-w-0 bg-white text-zinc-900 border-zinc-300 placeholder:text-zinc-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateScenario();
                        if (e.key === 'Escape') setCreatingScenario(false);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleCreateScenario}
                      className="px-2.5 py-1 rounded text-xs font-medium shrink-0 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      Créer
                    </button>
                    <button
                      onClick={() => setCreatingScenario(false)}
                      className="p-1 rounded transition-colors shrink-0 hover:bg-zinc-100 text-zinc-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    ref={scenariosContainerRef}
                    className="flex gap-1.5 items-center overflow-x-auto max-w-full graph-light-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {/* Valeurs de base */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleScenarioChange(null); }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                        !activeScenarioId
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      )}
                    >
                      Valeurs de base
                    </button>

                    {/* Existing scenarios */}
                    {[...scenarios]
                      .sort((a, b) => {
                        if (a.id === activeScenarioId) return -1;
                        if (b.id === activeScenarioId) return 1;
                        return 0;
                      })
                      .map(s => (
                      <div
                        key={s.id}
                        className={cn(
                          "flex items-center gap-0.5 rounded-full transition-colors shrink-0 group/scenario",
                          activeScenarioId === s.id
                            ? "bg-blue-500"
                            : "bg-zinc-100 hover:bg-zinc-200"
                        )}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleScenarioChange(s.id); }}
                          className={cn(
                            "pl-2.5 pr-1 py-1 text-xs font-medium shrink-0",
                            activeScenarioId === s.id
                              ? "text-white"
                              : "text-zinc-600"
                          )}
                        >
                          {s.name}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setScenarioToDelete({ id: s.id, name: s.name });
                          }}
                          className={cn(
                            "pr-1.5 py-1 opacity-0 group-hover/scenario:opacity-100 transition-opacity",
                            activeScenarioId === s.id
                              ? "text-white/70 hover:text-white"
                              : "text-zinc-400 hover:text-zinc-600"
                          )}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add scenario button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setCreatingScenario(true); }}
                      className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1 border border-zinc-200 text-zinc-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter Scénario
                    </button>

                    {/* Compare toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setComparisonMode(!comparisonEnabled); }}
                      className={cn(
                        "p-1.5 rounded-full transition-colors shrink-0",
                        comparisonEnabled
                          ? "bg-blue-100 text-blue-600"
                          : "text-zinc-400 hover:bg-zinc-100"
                      )}
                      title="Comparer les scénarios"
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Parameters list */}
            <div
              ref={scrollContainerRef}
              className={cn("p-5 flex flex-col graph-light-scrollbar", !compact && "flex-1 overflow-y-auto", compact && "pb-24")}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="space-y-0.5">
              {settings.map((node) => {
                const isEditing = editingParamId === node.id;
                const isHighlighted = highlightedNodeIds.has(node.id);
                const isFaded = hasActiveInteraction && !isHighlighted;
                const isFlashHighlight = flashHighlightId === node.id;
                const { baseline, scenario, diff } = getNodeValues(node.id);
                const displayValue = isScenarioActive ? scenario : baseline;

                return (
                  <div
                    key={node.id}
                    id={`node-param-${node.id}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedCenterNodeId(node.id); clearResultSelection(); }}
                    className={cn(
                      "group rounded-lg transition-all duration-500 cursor-pointer hover:bg-zinc-50",
                      isFaded && "opacity-30",
                      // Soft Flash Highlight
                      isFlashHighlight
                        ? "bg-blue-100 ring-1 ring-blue-300"
                        : (isHighlighted && "bg-blue-50 ring-1 ring-blue-200")
                    )}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 p-3" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm flex-1 text-zinc-700">
                          {node.label}
                        </span>
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || val === "-" || /^-?\d*\.?\d*([eE][+-]?\d*)?$/.test(val)) {
                              setEditValue(val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingParamId(null);
                          }}
                          onBlur={handleSaveEdit}
                          className="h-8 w-28 text-sm font-mono bg-white text-zinc-900 border-zinc-300"
                        />
                      </div>
                    ) : (
                      <AiActionableArea
                          isLightMode={isLightMode}
                          className="rounded-lg"
                          context={{
                            label: node.label || node.slug,
                            type: "parameter",
                            target: { kind: "node", id: node.id },
                          }}
                      >
                        <div className="flex items-center justify-between p-3">
                            <span className="text-sm font-medium text-zinc-800">
                            {node.label || node.slug}
                            </span>
                            <div className="flex items-center gap-2">
                            {/* Editable value container */}
                            <div
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all cursor-text group/value border-zinc-200 hover:border-blue-400 hover:bg-blue-50/50"
                                onClick={(e) => { e.stopPropagation(); handleStartEdit(node); }}
                                title="Cliquez pour modifier"
                            >
                                <span className={cn(
                                "text-sm font-mono font-semibold tabular-nums",
                                diff && Math.abs(diff) > 1e-9
                                    ? (diff > 0 ? "text-green-600" : "text-red-600")
                                    : "text-zinc-900"
                                )}
                                >
                                {formatNumber(displayValue)}
                                </span>
                                {node.unit && (
                                <span className="text-xs text-zinc-400">
                                    {node.unit}
                                </span>
                                )}
                                <Pencil className="h-3 w-3 transition-opacity text-zinc-400 opacity-0 group-hover/value:opacity-100" />
                                <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={isScenarioActive} />
                            </div>
                            </div>
                        </div>
                      </AiActionableArea>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chevron separator 1 — hidden on mobile */}
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
