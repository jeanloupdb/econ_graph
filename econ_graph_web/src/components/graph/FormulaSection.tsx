import { SmartFormulaViewer } from "@/components/graph/SmartFormulaViewer";
import { AlgorithmBlock } from "@/components/panels/Inspector/AlgorithmBlock";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Code2, FunctionSquare, Maximize2 } from "lucide-react";
import { useState } from "react";

interface FormulaSectionProps {
  code: string;
  isLightMode: boolean;
  nodes: Node[];
  isScenarioActive: boolean;
  getNodeValues: (nodeId: string) => { baseline: number | null; scenario: number | null };
  onVariableClick?: (nodeId: string) => void;
  onVariableHover?: (nodeId: string | null) => void;
  getNodeType?: (nodeId: string) => 'parameter' | 'calculation' | 'result' | null;
}

export function FormulaSection({ code, isLightMode, nodes, isScenarioActive, getNodeValues, onVariableClick, onVariableHover, getNodeType }: FormulaSectionProps) {
  const [viewMode, setViewMode] = useState<'smart' | 'code'>('smart');
  const [isExpanded, setIsExpanded] = useState(false);

  const formulaContent = viewMode === 'smart' ? (
    <SmartFormulaViewer
      code={code}
      nodes={nodes}
      getNodeValue={(id: string) => {
        const vals = getNodeValues(id);
        return isScenarioActive ? (vals.scenario ?? vals.baseline) : vals.baseline;
      }}
      onVariableClick={onVariableClick}
      onVariableHover={onVariableHover}
      getNodeType={getNodeType}
    />
  ) : (
    <AlgorithmBlock
      code={code}
      variables={nodes.map(n => ({ id: n.id, label: n.label || n.slug }))}
    />
  );

  return (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Code2 className={cn("h-3.5 w-3.5", isLightMode ? "text-zinc-400" : "text-zinc-500")} />
          <span className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            isLightMode ? "text-zinc-500" : "text-zinc-500"
          )}>
            Formule
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Expand button */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
              isLightMode
                ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            )}
            title="Agrandir"
          >
            <Maximize2 className="h-3 w-3" />
          </button>

          {/* View toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'smart' ? 'code' : 'smart'); }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
              isLightMode
                ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
              viewMode === 'code' && (isLightMode ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300")
            )}
          >
            {viewMode === 'smart' ? (
              <>
                <Code2 className="h-3 w-3" />
                <span>Code</span>
              </>
            ) : (
              <>
                <FunctionSquare className="h-3 w-3" />
                <span>Smart</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div>{formulaContent}</div>

      {/* Expanded modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className={cn(
          "max-w-3xl max-h-[80vh] overflow-hidden flex flex-col",
          isLightMode
            ? "bg-white border-zinc-200"
            : "bg-zinc-900 border-zinc-700"
        )}>
          <DialogHeader className="shrink-0">
            <DialogTitle className={cn(
              "flex items-center gap-2",
              isLightMode ? "text-zinc-900" : "text-zinc-100"
            )}>
              <Code2 className="h-4 w-4" />
              Formule
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setViewMode('smart')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === 'smart'
                  ? (isLightMode ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900")
                  : (isLightMode ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-zinc-800")
              )}
            >
              <FunctionSquare className="h-3.5 w-3.5" />
              Vue Smart
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === 'code'
                  ? (isLightMode ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900")
                  : (isLightMode ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-zinc-800")
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              Vue Code
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {formulaContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
