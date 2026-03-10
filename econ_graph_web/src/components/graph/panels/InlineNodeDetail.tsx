
import { AiActionableArea } from "@/components/graph/common/AiActionableArea";
import { DiffIndicator } from "@/components/graph/common/DiffIndicator";
import { FormulaSection } from "@/components/graph/FormulaSection"; // Check path
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";

interface InlineNodeDetailProps {
  nodeId: string;
  colorScheme: 'blue' | 'purple' | 'emerald';
  onClose: () => void;
  hideDependencies?: boolean;
  displayValueText?: string;

  // Data props
  nodeById: Map<string, Node>;
  getNodeValues: (id: string) => { baseline: number | null; scenario: number | null; diff: number | null };
  getNodeDependencies: (id: string) => { parents: Node[], children: Node[] };
  getNodeType?: (id: string) => 'parameter' | 'calculation' | 'result' | null;
  nodes?: Node[];

  // State & Style props
  isScenarioActive?: boolean;
  isLightMode?: boolean;

  // Interaction props
  onNodeClick: (nodeId: string) => void;
  onVariableHover?: (nodeId: string | null) => void;
  navigateToDependency?: (nodeId: string) => void;

  // Editing props (optional)
  isEditing?: boolean;
  editValue?: string;
  setEditValue?: (v: string) => void;
  onStartEdit?: (node: Node) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

import { Input } from "@/components/ui/input";
import { ChevronLeft, Pencil } from "lucide-react";
import { useState } from "react";

// ... other imports

export const InlineNodeDetail = ({
    nodeId,
    colorScheme,
    onClose,
    hideDependencies,
    displayValueText,
    nodeById,
    getNodeValues,
    getNodeDependencies,
    getNodeType,
    isScenarioActive,
    isLightMode,
    onNodeClick,
    onVariableHover,
    navigateToDependency,
    nodes,
    // Editing props
    isEditing,
    editValue,
    setEditValue,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    inputRef
}: InlineNodeDetailProps) => {
    const node = nodeById.get(nodeId);
    const [backButtonHint, setBackButtonHint] = useState<{ label: string; id: string } | null>(null);

    if (!node) return null;

    const { baseline, scenario, diff } = getNodeValues(nodeId);
    const resolvedDisplayValue = displayValueText ?? (isScenarioActive ? scenario : baseline);
    const { parents, children } = getNodeDependencies(nodeId);
    const currentNodeType = getNodeType?.(nodeId);
    const isParameter = currentNodeType === 'parameter';
    const nodeLabel = node.label || node.slug;

    // Wrapper for hover to detect if target is in hidden column
    const handleVariableHover = (id: string | null) => {
        if (!id) {
            setBackButtonHint(null);
            onVariableHover?.(null);
            return;
        }

        const targetType = getNodeType?.(id);
        const isHiddenByType = targetType === currentNodeType;

        // If target is same type as current detailed node, it's likely in the list hidden by this view
        if (isHiddenByType) {
            const targetNode = nodeById.get(id);
            if (targetNode) {
                setBackButtonHint({ label: targetNode.label || targetNode.slug, id });
            }
            onVariableHover?.(id);
        } else {
            setBackButtonHint(null);
            onVariableHover?.(id);
        }
    };

    // Handle variable click: navigate to the node, only close if target is in same column
    const handleVariableClick = (id: string) => {
        if (navigateToDependency) {
            const targetType = getNodeType?.(id);
            const isInSameColumn = targetType === currentNodeType;

            if (isInSameColumn) {
                // Target is in same column (hidden by detail view) - close and navigate
                onClose();
                setTimeout(() => {
                    navigateToDependency(id);
                }, 50);
            } else {
                // Target is in a different column (visible) - just navigate without closing
                navigateToDependency(id);
            }
        } else {
            // Fallback: just switch to the node's details
            onNodeClick(id);
        }
    };

    const colorClasses = {
      blue: isLightMode ? "text-blue-600" : "text-blue-400",
      purple: isLightMode ? "text-purple-600" : "text-purple-400",
      emerald: isLightMode ? "text-emerald-600" : "text-emerald-400"
    };


    return (
      <div className="flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
        {/* Header - same height as list header */}
        <div className={cn(
          "shrink-0 h-[88px] border-b flex flex-col justify-center px-4 relative z-10",
          isLightMode ? "bg-white border-zinc-100" : "bg-zinc-900 border-zinc-800"
        )}>
          <div className="relative flex items-center justify-center w-full h-full">
             {/* Back button styled like chevrons - Absolute Left */}
            <div className="absolute left-0 z-20 flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (backButtonHint) {
                    handleVariableClick(backButtonHint.id);
                  } else {
                    onClose();
                  }
                }}
                className={cn(
                  "h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 shrink-0 shadow-sm ring-1 ring-inset",
                  isLightMode
                    ? "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-800 hover:ring-zinc-300 hover:shadow-md"
                    : "bg-zinc-800 text-zinc-400 ring-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 hover:ring-zinc-600 hover:shadow-md",
                  backButtonHint ? "pl-2 pr-3 gap-1.5" : "w-8"
                )}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                {backButtonHint && (
                  <span className={cn(
                    "text-xs font-medium underline underline-offset-2 animate-in fade-in slide-in-from-left-1 duration-150 truncate max-w-[100px]",
                    colorClasses[colorScheme]
                  )}>
                    {backButtonHint.label}
                  </span>
                )}
              </button>
            </div>

            {/* Title - Absolute Centered (or effectively centered in flex since button is absolute) */}
            <div className="flex flex-col items-center justify-center max-w-[60%] text-center">
              <h3 className={cn(
                "text-lg font-semibold truncate w-full",
                colorClasses[colorScheme]
              )}>
                {node.label || node.slug}
              </h3>
              {node.unit && (
                <span className={cn("text-xs", isLightMode ? "text-zinc-500" : "text-zinc-500")}>
                  {node.unit}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto px-5 min-h-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="pt-2"> 
          {/* Value section */}
          <div className="py-4">
            {isEditing && setEditValue && onSaveEdit && onCancelEdit ? (
                <div className="flex items-center gap-2">
                    <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSaveEdit();
                          if (e.key === 'Escape') onCancelEdit();
                        }}
                        onBlur={onSaveEdit}
                        className={cn(
                          "h-10 text-xl font-mono",
                          isLightMode
                            ? "bg-white text-zinc-900 border-zinc-300"
                            : "bg-zinc-900 text-white border-zinc-700 focus-visible:ring-blue-500"
                        )}
                        autoFocus
                    />
                </div>
            ) : (
                  <div className="flex-1">
                    {/* AI Actionable Area for Value */}
                    <AiActionableArea
                        isLightMode={isLightMode}
                        className="rounded-lg p-2 -m-2 mt-0 hover:bg-transparent" // Negative margins to expand hit area without moving layout
                        context={{
                          label: `Valeur — ${nodeLabel}`,
                          type: currentNodeType || "calculation",
                          target: { kind: "node-field", id: node.id, field: "value" },
                        }}
                    >
                        <div className="flex items-baseline gap-2 flex-wrap group/value">
                            <div
                            id={`value-container-${node.id}`}
                            className={cn(
                                "flex items-baseline gap-2 transition-all duration-300 rounded-md py-1",
                                isParameter && onStartEdit ? (
                                    isLightMode
                                    ? "hover:bg-zinc-50 cursor-pointer px-2 -ml-2"
                                    : "hover:bg-zinc-800 cursor-pointer px-2 -ml-2"
                                ) : "px-0"
                            )}
                            onClick={(e) => {
                                if (isParameter && onStartEdit) {
                                    e.stopPropagation();
                                    onStartEdit(node);
                                }
                            }}
                            >
                                <span className={cn(
                                "text-3xl font-mono font-bold tabular-nums",
                                diff && Math.abs(diff) > 1e-9
                                    ? (diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                                    : colorClasses[colorScheme]
                                )}>
                                {typeof resolvedDisplayValue === 'number' ? formatNumber(resolvedDisplayValue) : resolvedDisplayValue}
                                </span>
                                {isParameter && onStartEdit && (
                                    <Pencil className={cn(
                                    "h-4 w-4 transition-opacity",
                                    isLightMode ? "text-zinc-400 opacity-0 group-hover/value:opacity-100" : "text-zinc-500 opacity-0 group-hover/value:opacity-100"
                                    )} />
                                )}
                            </div>

                            {node.unit && (
                            <span className={cn("text-sm", isLightMode ? "text-zinc-500" : "text-zinc-500")}>
                                {node.unit}
                            </span>
                            )}
                            <DiffIndicator diff={diff} baseline={baseline} isScenarioActive={!!isScenarioActive} />
                        </div>
                    </AiActionableArea>
                  </div>

            )}
            
            {isScenarioActive && baseline !== null && !isEditing && (
              <div className={cn("text-xs mt-2", isLightMode ? "text-zinc-500" : "text-zinc-500")}>
                Valeur de base: {formatNumber(baseline)}
              </div>
            )}
          </div>

          {/* Notes - emphasized */}
          {node.notes && (
            <div className="mb-4">
               <AiActionableArea
                  isLightMode={isLightMode}
                  className="rounded-xl"
                  context={{
                    label: `Notes — ${nodeLabel}`,
                    type: currentNodeType || "calculation",
                    target: { kind: "node-field", id: node.id, field: "notes" },
                  }}
               >
                <div className={cn(
                "py-4 px-4 rounded-xl group/notes",
                isLightMode ? "bg-zinc-50 border border-zinc-200" : "bg-zinc-800/50"
                )}>
                    <p className={cn(
                        "text-sm leading-relaxed",
                        isLightMode ? "text-zinc-700" : "text-zinc-300"
                    )}>
                        {node.notes}
                    </p>
                </div>
               </AiActionableArea>
            </div>
          )}

          {/* Formula - collapsible - HIDDEN FOR PARAMETERS */}
          {!isParameter && node.computation_definition && nodes && (
            <div className="py-2">
                <FormulaSection
                    code={node.computation_definition}
                    isLightMode={isLightMode || false}
                    nodes={nodes}
                    isScenarioActive={!!isScenarioActive}
                    context={{
                      label: `Formule — ${nodeLabel}`,
                      type: currentNodeType || "calculation",
                      target: { kind: "node-field", id: node.id, field: "formula" },
                    }}
                    getNodeValues={getNodeValues}
                    onVariableClick={handleVariableClick}
                    onVariableHover={handleVariableHover}
                    getNodeType={getNodeType}
                    selectedNode={node}
                    selectedNodeValue={resolvedDisplayValue}
                    nodeUnit={node.unit}
                />
            </div>
          )}

          {/* Dependencies */}
          {!hideDependencies && (parents.length > 0 || children.length > 0) && (
            <div className="py-4">
              {children.length > 0 && (
                <div>
                  <div className={cn("text-xs mb-1.5", isLightMode ? "text-zinc-500" : "text-zinc-600")}>
                    Utilisé par
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {children.map(c => (
                      <button
                        key={c.id}
                        onClick={(e) => { e.stopPropagation(); handleVariableClick(c.id); }}
                        onMouseEnter={() => handleVariableHover(c.id)}
                        onMouseLeave={() => handleVariableHover(null)}
                        className={cn(
                          "px-2 py-0.5 rounded text-xs transition-colors",
                          isLightMode ? "bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        )}
                      >
                        {c.label || c.slug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
       </div>
      </div>
    );
};
