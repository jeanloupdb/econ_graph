import { AiActionableArea } from "@/components/graph/common/AiActionableArea";
import { SmartFormulaViewer } from "@/components/graph/SmartFormulaViewer";
import { AlgorithmBlock } from "@/components/panels/Inspector/AlgorithmBlock";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { AiContextInfo } from "@/types/ai-context";
import { formatNumber } from "@/utils/format";
import { Code2, FunctionSquare } from "lucide-react";
import { useState } from "react";

interface FormulaSectionProps {
  code: string;
  isLightMode: boolean;
  nodes: Node[];
  isScenarioActive: boolean;
  context: AiContextInfo;
  getNodeValues: (nodeId: string) => { baseline: number | null; scenario: number | null };
  onVariableClick?: (nodeId: string) => void;
  onVariableHover?: (nodeId: string | null) => void;
  getNodeType?: (nodeId: string) => 'parameter' | 'calculation' | 'result' | null;
  selectedNode?: Node;
  selectedNodeValue?: string | number | null;
  nodeUnit?: string;
}

export function FormulaSection({ 
  code, 
  isLightMode, 
  nodes, 
  isScenarioActive, 
  context, 
  getNodeValues, 
  onVariableClick, 
  onVariableHover, 
  getNodeType,
  selectedNode,
  selectedNodeValue,
  nodeUnit
}: FormulaSectionProps) {
  const [viewMode, setViewMode] = useState<'smart' | 'code'>('smart');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [fullScreenExpandedKeys, setFullScreenExpandedKeys] = useState<Set<string>>(new Set());
  const handleExpandedChange = (open: boolean) => {
    setIsExpanded(open);
    if (!open) {
      setShowValues(false);
      setFullScreenExpandedKeys(new Set());
    }
  };

  const getDisplayValue = (id: string) => {
    const vals = getNodeValues(id);
    return isScenarioActive ? (vals.scenario ?? vals.baseline) : vals.baseline;
  };

  const renderFormula = (displayMode: "labels" | "values", className?: string, expandedKeys?: Set<string>, onExpandedChange?: (keys: Set<string>) => void) =>
    viewMode === 'smart' ? (
      <SmartFormulaViewer
        code={code}
        nodes={nodes}
        displayMode={displayMode}
        allowExpand={isExpanded}
        getNodeValue={getDisplayValue}
        onVariableClick={onVariableClick}
        onVariableHover={onVariableHover}
        getNodeType={getNodeType}
        className={className}
        controlledExpandedKeys={expandedKeys}
        onExpandedChange={onExpandedChange}
      />
    ) : (
      <AlgorithmBlock
        code={code}
        variables={nodes.map(n => ({ id: n.id, label: n.label || n.slug }))}
      />
    );

  const formulaContent = renderFormula("labels");
  const expandedContent = renderFormula(showValues ? "values" : "labels", "p-6 min-h-full", fullScreenExpandedKeys, setFullScreenExpandedKeys);

  return (
    <>
      <AiActionableArea
        isLightMode={isLightMode}
        context={context}
        className="rounded-xl"
      >
        <div 
            id="formula-container" 
            onClick={() => setIsExpanded(true)}
            className={cn(
                "rounded-xl transition-colors duration-200 cursor-pointer p-4 group/formula",
                isLightMode
                    ? "bg-zinc-50 border border-zinc-200 hover:bg-zinc-100/80"
                    : "bg-zinc-800/50 hover:bg-zinc-800"
            )}
        >
          <div className="flex items-center gap-1.5 mb-3">
             <span className={cn(
               "text-[10px] font-medium uppercase tracking-wide",
               isLightMode ? "text-zinc-500" : "text-zinc-500"
             )}>
               Formule
             </span>
          </div>

          <div className="overflow-hidden">
            {formulaContent}
          </div>
        </div>
      </AiActionableArea>

      {/* Expanded modal */}
      <Dialog open={isExpanded} onOpenChange={handleExpandedChange}>
        <DialogContent className={cn(
          "w-[95vw] max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden",
          isLightMode ? "bg-zinc-50/95" : "bg-zinc-950/95"
        )}>
          {/* Header */}
          <div 
             className={cn(
               "flex items-center justify-between px-8 py-6 border-b shrink-0",
               isLightMode ? "bg-white/50 border-zinc-200/60" : "bg-zinc-900/50 border-zinc-800/60"
             )}
             onClick={() => setFullScreenExpandedKeys(new Set())}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-xl shadow-sm border",
                isLightMode ? "bg-white border-zinc-200 text-violet-600" : "bg-zinc-800 border-zinc-700 text-violet-400"
              )}>
                <FunctionSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-semibold tracking-tight",
                  isLightMode ? "text-zinc-900" : "text-zinc-100"
                )}>
                  Inspecteur de Formule
                </DialogTitle>
                <p className={cn("text-sm font-medium", isLightMode ? "text-zinc-500" : "text-zinc-400")}>
                  Mode plein écran
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 mr-10" onClick={(e) => e.stopPropagation()}>
              {/* Segmented Control */}
              <div className={cn(
                "flex p-1 rounded-lg border shadow-sm",
                isLightMode ? "bg-zinc-100/50 border-zinc-200" : "bg-zinc-900/50 border-zinc-800"
              )}>
                <button
                  onClick={() => setViewMode('smart')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    viewMode === 'smart'
                      ? (isLightMode ? "bg-white text-zinc-900 shadow-sm" : "bg-zinc-800 text-zinc-100 shadow-sm")
                      : (isLightMode ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200")
                  )}
                >
                  <FunctionSquare className="h-4 w-4" />
                  Smart
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    viewMode === 'code'
                      ? (isLightMode ? "bg-white text-zinc-900 shadow-sm" : "bg-zinc-800 text-zinc-100 shadow-sm")
                      : (isLightMode ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200")
                  )}
                >
                  <Code2 className="h-4 w-4" />
                  Code
                </button>
              </div>

              <div className={cn("w-px h-6", isLightMode ? "bg-zinc-200" : "bg-zinc-800")} />

              {/* Switch */}
              <div className={cn("flex items-center gap-3", viewMode !== 'smart' && "opacity-50 pointer-events-none")}>
                <span className={cn("text-sm font-medium", isLightMode ? "text-zinc-600" : "text-zinc-400")}>
                  Voir valeurs
                </span>
                <Switch checked={showValues} onCheckedChange={setShowValues} disabled={viewMode !== 'smart'} />
              </div>
            </div>
          </div>

          {/* Context Bar */}
          {selectedNode && (
            <div className={cn(
              "px-8 py-3 border-b shrink-0 flex items-center gap-3",
              isLightMode ? "bg-zinc-50/80 border-zinc-200/60" : "bg-zinc-900/30 border-zinc-800/60"
            )}>
              <span className={cn(
                "text-sm font-semibold",
                isLightMode ? "text-zinc-900" : "text-zinc-100"
              )}>
                {selectedNode.label || selectedNode.slug}
              </span>
              
              {selectedNodeValue !== undefined && selectedNodeValue !== null && (
                  <>
                  <div className={cn("h-4 w-px", isLightMode ? "bg-zinc-300" : "bg-zinc-700")} />
                  <span className={cn("font-mono text-sm font-medium", isLightMode ? "text-emerald-700" : "text-emerald-400")}>
                    {typeof selectedNodeValue === 'number' ? formatNumber(selectedNodeValue) : selectedNodeValue}
                  </span>
                  {nodeUnit && <span className={cn("text-xs", isLightMode ? "text-zinc-500" : "text-zinc-500")}>{nodeUnit}</span>}
                  </>
              )}
            </div>
          )}

          {/* Body */}
          <div 
            onClick={() => setFullScreenExpandedKeys(new Set())}
            className={cn(
            "flex-1 overflow-hidden p-6 sm:p-8",
            isLightMode ? "bg-zinc-50/50" : "bg-black/20"
          )}>
            <div className={cn(
              "h-full rounded-xl border shadow-sm overflow-hidden flex flex-col",
              isLightMode ? "bg-white border-zinc-200" : "bg-zinc-900/50 border-zinc-800"
            )}>
              <div className={cn(
                "flex-1 overflow-y-auto",
                isLightMode ? "graph-light-scrollbar" : "custom-scrollbar"
              )}>
                <AiActionableArea
                  isLightMode={isLightMode}
                  context={context}
                  className="min-h-full"
                >
                  {expandedContent}
                </AiActionableArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
