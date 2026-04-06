
import { ColumnHeader, ColumnShell } from "@/components/graph/common/ColumnShell";
import { AiActionableArea } from "@/components/graph/common/AiActionableArea";
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { InlineNodeDetail } from "@/components/graph/panels/InlineNodeDetail";
import { Input } from "@/components/ui/input";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { Circle, GitCompare, Pencil, Plus, X } from "lucide-react";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

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

  // Direct value change (slider)
  handleDirectValueChange?: (nodeId: string, value: number) => Promise<void>;

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
  handleDirectValueChange,
  flashHighlightId,
  navigateToDependency,
  isLoading,
  compact = false,
}: ParametersColumnProps & { compact?: boolean }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollHint, setScrollHint] = useState<{ direction: 'up' | 'down'; label?: string } | null>(null);

  useEffect(() => {
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const targetId = settings.find(n => highlightedNodeIds.has(n.id))?.id;
      if (!targetId) { setScrollHint(null); return; }
      const element = document.getElementById(`node-param-${targetId}`);
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
  }, [highlightedNodeIds, settings, nodeById]);

  const selectedNodeIsParam = selectedCenterNodeId
    ? settings.some(s => s.id === selectedCenterNodeId)
    : false;

  return (
    <ColumnShell
      color="blue"
      compact={compact}
      isLoading={isLoading}
      scrollHint={scrollHint}
      scrollHintHidden={selectedNodeIsParam}
      onClick={() => { clearResultSelection(); clearCenterSelection(); }}
    >
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
          {/* Header (desktop only — compact hides via ColumnHeader null) */}
          <ColumnHeader compact={compact} stopPropagation className="z-10">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Circle className="h-4 w-4 fill-current text-blue-500" />
                Paramètres
              </span>
              <span className="text-sm text-muted-foreground">({settings.length})</span>
            </div>

            {/* Scenario selector (desktop) */}
            <div className="mt-2 w-full">
              {creatingScenario ? (
                <div className="flex items-center gap-2 w-full max-w-sm px-4">
                  <Input
                    value={newScenarioName}
                    onChange={(e) => setNewScenarioName(e.target.value)}
                    placeholder="Nom du scénario..."
                    className="h-7 text-xs flex-1 min-w-0"
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
                    className="p-1 rounded transition-colors shrink-0 hover:bg-accent text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  ref={scenariosContainerRef}
                  className="flex gap-1.5 items-center overflow-x-auto max-w-full"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {/* Left spacer — scrolls with content */}
                  <div className="shrink-0 w-4" aria-hidden />

                  {/* Base values pill */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleScenarioChange(null); }}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                      !activeScenarioId
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Valeurs de base
                  </button>

                  {/* Scenario pills */}
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
                            : "bg-muted hover:bg-accent"
                        )}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleScenarioChange(s.id); }}
                          className={cn(
                            "pl-2.5 pr-1 py-1 text-xs font-medium shrink-0",
                            activeScenarioId === s.id ? "text-white" : "text-muted-foreground"
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
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                  {/* Add scenario */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setCreatingScenario(true); }}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1 border border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
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
                        : "text-muted-foreground hover:bg-accent"
                    )}
                    title="Comparer les scénarios"
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </button>

                  {/* Right spacer — scrolls with content */}
                  <div className="shrink-0 w-4" aria-hidden />
                </div>
              )}
            </div>
          </ColumnHeader>

          {/* Parameters list */}
          <div
            ref={scrollContainerRef}
            className={cn(
              "p-5 flex flex-col",
              !compact && "flex-1 overflow-y-auto",
              compact && "pb-24"
            )}
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="space-y-1">
              {settings.map((node) => (
                <ParameterItem
                  key={node.id}
                  node={node}
                  isLightMode={isLightMode}
                  isEditing={editingParamId === node.id}
                  isHighlighted={highlightedNodeIds.has(node.id)}
                  isFaded={hasActiveInteraction && !highlightedNodeIds.has(node.id)}
                  isFlashHighlight={flashHighlightId === node.id}
                  isScenarioActive={isScenarioActive}
                  getNodeValues={getNodeValues}
                  onSelect={() => { setSelectedCenterNodeId(node.id); clearResultSelection(); }}
                  onStartEdit={() => handleStartEdit(node)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingParamId(null)}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  inputRef={inputRef}
                  onDirectValueChange={handleDirectValueChange}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </ColumnShell>
  );
}

// ── Parameter Item with inline slider ────────────────────────────────────────

function computeSliderBounds(value: number | null) {
  if (value === null || value === 0) return { min: -100, max: 100, step: 1 };
  const abs = Math.abs(value);
  const magnitude = Math.pow(10, Math.floor(Math.log10(abs)));
  const step = magnitude >= 100 ? magnitude / 10 : magnitude >= 10 ? 1 : magnitude >= 1 ? 0.1 : 0.01;
  // Fixed range: 0 to a round number above 2× the baseline value
  // This makes the initial thumb sit around 50%, giving room to move both directions
  const max = Math.ceil((abs * 2) / magnitude) * magnitude;
  const min = 0;
  return { min, max, step };
}

function ParameterItem({
  node,
  isLightMode,
  isEditing,
  isHighlighted,
  isFaded,
  isFlashHighlight,
  isScenarioActive,
  getNodeValues,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  editValue,
  setEditValue,
  inputRef,
  onDirectValueChange,
}: {
  node: Node;
  isLightMode: boolean;
  isEditing: boolean;
  isHighlighted: boolean;
  isFaded: boolean;
  isFlashHighlight: boolean;
  isScenarioActive: boolean;
  getNodeValues: (id: string) => { baseline: number | null; scenario: number | null; diff: number | null };
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  editValue: string;
  setEditValue: (v: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onDirectValueChange?: (nodeId: string, value: number) => Promise<void>;
}) {
  const { baseline, scenario, diff } = getNodeValues(node.id);
  const displayValue = isScenarioActive ? scenario : baseline;
  const [localSliderValue, setLocalSliderValue] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedValueRef = useRef<number | null>(null);
  // Freeze slider bounds on first non-null baseline so they never shift
  const frozenBoundsRef = useRef<{ min: number; max: number; step: number } | null>(null);
  if (frozenBoundsRef.current === null && baseline !== null) {
    frozenBoundsRef.current = computeSliderBounds(baseline);
  }

  // Only clear local slider value once displayValue has caught up to the committed value
  useEffect(() => {
    if (isDragging) return;
    if (committedValueRef.current !== null) {
      // Wait until the API response updates displayValue to match what we committed
      if (displayValue !== null && Math.abs(displayValue - committedValueRef.current) < 1e-9) {
        committedValueRef.current = null;
        setLocalSliderValue(null);
      }
      // Otherwise keep localSliderValue to prevent snap-back
    } else {
      setLocalSliderValue(null);
    }
  }, [displayValue, isDragging]);

  const sliderBounds = frozenBoundsRef.current ?? computeSliderBounds(baseline);
  const currentValue = localSliderValue ?? displayValue ?? 0;

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setLocalSliderValue(val);
  }, []);

  const handleSliderCommit = useCallback(() => {
    setIsDragging(false);
    if (localSliderValue !== null && onDirectValueChange) {
      committedValueRef.current = localSliderValue;
      if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
      commitTimeoutRef.current = setTimeout(() => {
        onDirectValueChange(node.id, localSliderValue);
      }, 50);
    }
  }, [localSliderValue, onDirectValueChange, node.id]);

  // Show slider bar fill percentage
  const fillPct = sliderBounds.max > sliderBounds.min
    ? ((currentValue - sliderBounds.min) / (sliderBounds.max - sliderBounds.min)) * 100
    : 0;

  const clampedFill = Math.max(0, Math.min(100, fillPct));

  return (
    <div
      id={`node-param-${node.id}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={cn(
        "group rounded-lg transition-all duration-200 cursor-pointer",
        isFaded && "opacity-30",
        isFlashHighlight
          ? "bg-blue-50 ring-1 ring-blue-300"
          : isHighlighted
            ? "bg-blue-50/50 ring-1 ring-blue-200"
            : "hover:bg-accent/50"
      )}
    >
      {isEditing ? (
        <div className="flex items-center gap-2 p-3" onClick={(e) => e.stopPropagation()}>
          <span className="text-sm flex-1 text-foreground">{node.label}</span>
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
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            onBlur={onSaveEdit}
            className="h-8 w-28 text-sm font-mono"
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
          <div className="px-3 pt-3 pb-2">
            {/* Label + value row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground truncate mr-2">
                {node.label || node.slug}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-transparent cursor-text transition-all hover:border-blue-300 hover:bg-blue-50/50 group/value"
                  onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
                  title="Cliquez pour saisir une valeur"
                >
                  <span className={cn(
                    "text-sm font-mono font-semibold tabular-nums transition-colors duration-150",
                    isDragging ? "text-blue-600" :
                    diff && Math.abs(diff) > 1e-9
                      ? (diff > 0 ? "text-green-600" : "text-red-600")
                      : "text-foreground"
                  )}>
                    {isDragging ? formatNumber(localSliderValue) : formatNumber(displayValue)}
                  </span>
                  {node.unit && (
                    <span className="text-xs text-muted-foreground">{node.unit}</span>
                  )}
                  <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/value:opacity-100 transition-opacity" />
                </div>
                <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={isScenarioActive} />
              </div>
            </div>

            {/* Slider */}
            {displayValue !== null && onDirectValueChange && (
              <div className="space-y-1">
                <div
                  className="relative h-5 flex items-center group/slider"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Track background */}
                  <div className="absolute inset-x-0 h-[3px] rounded-full bg-zinc-200/80" />
                  {/* Track fill */}
                  <div
                    className={cn(
                      "absolute left-0 h-[3px] rounded-full transition-colors duration-150",
                      isDragging
                        ? "bg-blue-500"
                        : "bg-blue-400/70 group-hover/slider:bg-blue-500"
                    )}
                    style={{
                      width: `${clampedFill}%`,
                      transition: isDragging ? 'none' : 'width 0.15s ease-out, background-color 0.15s',
                    }}
                  />
                  {/* Native range input — transparent, on top */}
                  <input
                    type="range"
                    min={sliderBounds.min}
                    max={sliderBounds.max}
                    step={sliderBounds.step}
                    value={currentValue}
                    onChange={handleSliderChange}
                    onPointerDown={() => setIsDragging(true)}
                    onPointerUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    className="absolute inset-0 w-full opacity-0 cursor-grab active:cursor-grabbing z-10"
                    aria-label={`Ajuster ${node.label || node.slug}`}
                  />
                  {/* Thumb */}
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-150",
                      isDragging
                        ? "w-[14px] h-[14px] bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)] scale-110"
                        : "w-3 h-3 bg-white border-[2px] border-blue-500 shadow-sm group-hover/slider:w-[14px] group-hover/slider:h-[14px] group-hover/slider:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                    )}
                    style={{ left: `calc(${clampedFill}% - ${isDragging ? 7 : 6}px)` }}
                  />
                  {/* Floating tooltip on drag */}
                  {isDragging && localSliderValue !== null && (
                    <div
                      className="absolute -top-8 pointer-events-none z-20"
                      style={{ left: `calc(${clampedFill}% - 20px)` }}
                    >
                      <div className="bg-zinc-800 text-white text-[11px] font-mono font-medium px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                        {formatNumber(localSliderValue)}
                        {node.unit ? ` ${node.unit}` : ''}
                      </div>
                      <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[4px] border-l-transparent border-r-transparent border-t-zinc-800 mx-auto" />
                    </div>
                  )}
                </div>
                {/* Min / Max labels */}
                <div className="flex justify-between px-0.5">
                  <span className="text-[10px] text-muted-foreground/50 tabular-nums font-mono">
                    {formatNumber(sliderBounds.min)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 tabular-nums font-mono">
                    {formatNumber(sliderBounds.max)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </AiActionableArea>
      )}
    </div>
  );
}
