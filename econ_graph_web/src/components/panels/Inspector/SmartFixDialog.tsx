import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api/client";
import type { Node } from "@/lib/types";
import { AlertTriangle, ArrowRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SmartFixDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  currentCode: string;
  errorTrace: string;
  onApplyFix: (newCode: string) => void;
  errorInputNodes?: Node[];
  onNavigate?: (nodeId: string) => void;
}

interface SmartFixResponse {
  corrected_code: string;
  explanation: string;
  confidence_score?: number;
}

export function SmartFixDialog({
  isOpen,
  onClose,
  nodeId,
  currentCode,
  errorTrace,
  onApplyFix,
  errorInputNodes = [],
  onNavigate,
}: SmartFixDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fixData, setFixData] = useState<SmartFixResponse | null>(null);

  const hasUpstreamErrors = errorInputNodes.length > 0;

  const handleGenerateFix = async () => {
    setLoading(true);
    try {
      const data = await apiClient.post<SmartFixResponse>("/ai/smart-fix", {
        node_id: nodeId,
        current_code: currentCode,
        error_trace: errorTrace,
      });

      setFixData(data);
    } catch {
      toast.error("Failed to generate AI fix. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (fixData) {
      onApplyFix(fixData.corrected_code);
      onClose();
      toast.success("Fix Applied", {
        description: "The code has been updated.",
      });
    }
  };

  const handleNavigate = (id: string) => {
    onNavigate?.(id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Smart Fix
          </DialogTitle>
          <DialogDescription>
            AI-powered auto-correction for your node.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4">
          {hasUpstreamErrors ? (
            <div className="flex flex-col items-center justify-center h-60 gap-6 p-4 text-center">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-full">
                <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                  Upstream Error Detected
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  This node&apos;s error is likely caused by an issue in one of its input nodes. 
                  Please fix the input node first.
                </p>
              </div>
              
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {errorInputNodes.map(node => (
                  <Button 
                    key={node.id}
                    variant="outline" 
                    className="justify-between group border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20"
                    onClick={() => handleNavigate(node.id)}
                  >
                    <span className="font-medium text-amber-700 dark:text-amber-300">{node.label}</span>
                    <ArrowRight className="h-4 w-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {!fixData && !loading && (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <p className="text-muted-foreground">Ready to analyze the error.</p>
                  <Button onClick={handleGenerateFix}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Analyze & Fix
                  </Button>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-60 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Analyzing error and generating fix...
                  </p>
                </div>
              )}

              {fixData && (
                <div className="flex flex-col gap-4 h-full">
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                      Explanation
                    </h4>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
                      {fixData.explanation}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="flex flex-col gap-2 min-h-0">
                      <span className="text-xs font-medium text-muted-foreground">Original Code</span>
                      <div className="flex-1 border rounded-md bg-muted/50 p-4 overflow-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap text-red-600/80 dark:text-red-400/80">
                          {currentCode}
                        </pre>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-h-0">
                      <span className="text-xs font-medium text-muted-foreground text-green-600 dark:text-green-400">Suggested Fix</span>
                      <div className="flex-1 border rounded-md bg-muted/50 p-4 border-green-200 dark:border-green-900/50 bg-green-50/10 dark:bg-green-900/10 overflow-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap text-green-700 dark:text-green-300">
                          {fixData.corrected_code}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {hasUpstreamErrors ? "Close" : "Cancel"}
          </Button>
          {!hasUpstreamErrors && (
            <Button 
              onClick={handleApply} 
              disabled={!fixData || loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Apply Fix
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
