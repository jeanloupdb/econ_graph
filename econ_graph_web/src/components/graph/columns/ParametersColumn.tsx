
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import { Input } from "@/components/ui/input";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { ChevronDown, ChevronRight, ChevronUp, Circle, GitCompare, Pencil, Plus, X } from "lucide-react";
import { RefObject, useEffect, useRef, useState } from "react";

interface ParametersColumnProps {
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
  navigateToDependency
}: ParametersColumnProps) {
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
          "flex-1 flex flex-col overflow-hidden rounded-2xl shadow-lg relative",
          isLightMode
            ? "bg-white border border-zinc-300 shadow-zinc-300/50"
            : "bg-zinc-900 border border-zinc-700 shadow-black/30"
        )}
        onClick={() => { clearResultSelection(); clearCenterSelection(); }}
      >
        {/* Scroll Indicators - Floating over the list */}
        {scrollHint && !selectedNodeIsParam && (
            <div className={cn(
                "absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-none py-1.5 backdrop-blur-sm transition-all animate-in fade-in duration-300",
                scrollHint.direction === 'up' ? "top-[88px] border-b shadow-sm" : "bottom-0 border-t shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]",
                isLightMode 
                  ? "bg-blue-50/95 text-blue-700 border-blue-100/50" 
                  : "bg-zinc-900/95 text-blue-400 border-blue-900/30"
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
              "shrink-0 h-[88px] border-b flex flex-col justify-center relative z-10",
              isLightMode ? "bg-white border-zinc-200" : "bg-zinc-900 border-zinc-800"
            )} onClick={(e) => e.stopPropagation()}>
              {/* Title - centered */}
              <div className="flex items-center justify-center">
                <span className={cn(
                  "text-lg font-semibold flex items-center gap-2",
                  isLightMode ? "text-blue-600" : "text-blue-400"
                )}>
                  <Circle className="h-4 w-4 fill-current" />
                  Paramètres
                </span>
                <span className={cn("text-sm ml-2", isLightMode ? "text-zinc-400" : "text-zinc-500")}>
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
                      className={cn(
                        "h-7 text-xs flex-1 min-w-0",
                        isLightMode 
                          ? "bg-white text-zinc-900 border-zinc-200 placeholder:text-zinc-400" 
                          : "bg-zinc-900 text-white border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-blue-500"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateScenario();
                        if (e.key === 'Escape') setCreatingScenario(false);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleCreateScenario}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-medium shrink-0",
                        isLightMode ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                      )}
                    >
                      Créer
                    </button>
                    <button
                      onClick={() => setCreatingScenario(false)}
                      className={cn(
                        "p-1 rounded transition-colors shrink-0",
                        isLightMode ? "hover:bg-zinc-200 text-zinc-500" : "hover:bg-zinc-700 text-zinc-500"
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div 
                    ref={scenariosContainerRef}
                    className="flex gap-1.5 items-center overflow-x-auto max-w-full"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {/* Valeurs de base */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleScenarioChange(null); }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                        !activeScenarioId
                          ? (isLightMode ? "bg-zinc-900 text-white" : "bg-white text-zinc-900")
                          : (isLightMode ? "bg-zinc-200 text-zinc-600 hover:bg-zinc-300" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")
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
                            ? (isLightMode ? "bg-blue-500" : "bg-blue-600")
                            : (isLightMode ? "bg-zinc-200 hover:bg-zinc-300" : "bg-zinc-800 hover:bg-zinc-700")
                        )}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleScenarioChange(s.id); }}
                          className={cn(
                            "pl-2.5 pr-1 py-1 text-xs font-medium shrink-0",
                            activeScenarioId === s.id
                              ? "text-white"
                              : (isLightMode ? "text-zinc-600" : "text-zinc-400")
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
                              : (isLightMode ? "text-zinc-400 hover:text-zinc-600" : "text-zinc-500 hover:text-zinc-300")
                          )}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add scenario button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setCreatingScenario(true); }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1",
                        isLightMode 
                          ? "border border-dashed border-zinc-300 text-zinc-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50" 
                          : "border border-dashed border-zinc-700 text-zinc-500 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                      )}
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
                          ? (isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400")
                          : (isLightMode ? "text-zinc-400 hover:bg-zinc-200" : "text-zinc-500 hover:bg-zinc-800")
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
              className="flex-1 overflow-y-auto p-2 flex flex-col"
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
                      "group rounded-lg transition-all duration-500 cursor-pointer",
                      isLightMode ? "hover:bg-zinc-50" : "hover:bg-zinc-800/50",
                      isFaded && "opacity-30",
                      // Soft Flash Highlight
                      isFlashHighlight 
                        ? (isLightMode ? "bg-blue-100 ring-1 ring-blue-300" : "bg-blue-500/20 ring-1 ring-blue-500/50")
                        : (isHighlighted && (isLightMode ? "bg-blue-50 ring-1 ring-blue-300" : "bg-blue-500/10 ring-1 ring-blue-500/30"))
                    )}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 p-3" onClick={(e) => e.stopPropagation()}>
                        <span className={cn("text-sm flex-1", isLightMode ? "text-zinc-700" : "text-zinc-300")}>
                          {node.label}
                        </span>
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingParamId(null);
                          }}
                          onBlur={handleSaveEdit}
                          className={cn(
                            "h-8 w-28 text-sm font-mono",
                            isLightMode 
                              ? "bg-white text-zinc-900 border-zinc-200" 
                              : "bg-zinc-900 text-white border-zinc-700 focus-visible:ring-blue-500"
                          )}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3">
                        <span className={cn(
                          "text-sm font-medium",
                          isLightMode ? "text-zinc-800" : "text-zinc-200"
                        )}>
                          {node.label || node.slug}
                        </span>
                        {/* Editable value container */}
                        <div 
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all cursor-text group/value",
                            isLightMode 
                              ? "border-dashed border-zinc-300 hover:border-blue-400 hover:bg-blue-50/50" 
                              : "border-dashed border-zinc-700 hover:border-blue-500 hover:bg-blue-500/10"
                          )}
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(node); }}
                          title="Cliquez pour modifier"
                        >
                          <span className={cn(
                            "text-sm font-mono font-semibold tabular-nums",
                            diff && Math.abs(diff) > 1e-9
                              ? (diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                              : (isLightMode ? "text-zinc-900" : "text-white")
                          )}
                          >
                            {formatNumber(displayValue)}
                          </span>
                          {node.unit && (
                            <span className={cn("text-xs", isLightMode ? "text-zinc-400" : "text-zinc-500")}>
                              {node.unit}
                            </span>
                          )}
                          <Pencil className={cn(
                            "h-3 w-3 transition-opacity",
                            isLightMode ? "text-zinc-400 opacity-0 group-hover/value:opacity-100" : "text-zinc-500 opacity-0 group-hover/value:opacity-100"
                          )} />
                          <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={isScenarioActive} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chevron separator 1 */}
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
