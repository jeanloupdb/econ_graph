"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Node } from "@/lib/types";
import { ArrowRight, Calculator, ExternalLink, X } from "lucide-react";

type InspectorEdge = {
  id: string;
  source: string;
  target: string;
  edge_type: string;
};

interface EdgeInspectorProps {
  selectedEdgeId: string;
  selectedEdgeIds: string[];
  edges: InspectorEdge[];
  nodes: Node[];
  onClose: () => void;
  onOpenNode: (nodeId: string) => void;
}

export function EdgeInspector({
  selectedEdgeId,
  selectedEdgeIds,
  edges,
  nodes,
  onClose,
  onOpenNode,
}: EdgeInspectorProps) {
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const selectedEdges = edges.filter((edge) =>
    selectedEdgeIds.includes(edge.id)
  );
  const targetNode = nodes.find((node) => node.id === selectedEdge?.target);
  const isComputedTarget = !!targetNode?.computation_definition;

  return (
    <div className="flex h-full w-80 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Inspector</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedEdge && (
          <div className="space-y-3 text-sm">
            {selectedEdges.length > 1 && (
              <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2 text-xs">
                {selectedEdges.length} relations sélectionnées
              </div>
            )}

            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{selectedEdge.edge_type}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {selectedEdge.source}
                </Badge>
                <ArrowRight className="h-4 w-4 text-zinc-400" />
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {selectedEdge.target}
                </Badge>
              </div>
            </div>

            {isComputedTarget && targetNode && (
              <div className="rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold">
                      Algorithme de la cible
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenNode(targetNode.id)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Ouvrir le nœud
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
