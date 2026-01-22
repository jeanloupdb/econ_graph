"use client";

import { useGraphData } from "@/graph/context/GraphDataContext";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiState";
import { formatNumber } from "@/utils/format";
import { Box, ChevronRight, Info } from "lucide-react";
import { useMemo, useState } from "react";

interface NodeGroup {
  id: string;
  title: string;
  description: string;
  colorClass: string;
  nodes: any[];
}

export function CausalPlanView() {
  const { nodes = [] } = useGraphData();
  const { isLightMode } = useGraphTheme();
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Derive edges to understand dependencies
  const { edges, adj, revAdj, incomingCount, outgoingCount } = useMemo(() => {
    const slugToId = new Map<string, string>();
    nodes.forEach((n) => {
      if (n.slug) slugToId.set(n.slug, n.id);
      slugToId.set(n.id, n.id);
    });

    const allEdges = nodes.flatMap((n) =>
      deriveEdgesFromCompute(
        { id: n.id, computation_definition: n.computation_definition },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );

    const adjMap = new Map<string, string[]>();
    const revAdjMap = new Map<string, string[]>();
    const inCount = new Map<string, number>();
    const outCount = new Map<string, number>();

    nodes.forEach((n) => {
      adjMap.set(n.id, []);
      revAdjMap.set(n.id, []);
      inCount.set(n.id, 0);
      outCount.set(n.id, 0);
    });

    allEdges.forEach((e) => {
      if (adjMap.has(e.source) && adjMap.has(e.target)) {
        adjMap.get(e.source)!.push(e.target);
        revAdjMap.get(e.target)!.push(e.source);
        inCount.set(e.target, (inCount.get(e.target) || 0) + 1);
        outCount.set(e.source, (outCount.get(e.source) || 0) + 1);
      }
    });

    return { 
      edges: allEdges, 
      adj: adjMap, 
      revAdj: revAdjMap, 
      incomingCount: inCount, 
      outgoingCount: outCount 
    };
  }, [nodes]);

  // Categorization Logic
  const groups = useMemo(() => {
    const res: NodeGroup[] = [
      { id: 'resources', title: 'Ressources', description: 'Vos moyens financiers', colorClass: 'border-blue-500/50 text-blue-600 dark:text-blue-400', nodes: [] },
      { id: 'constraints', title: 'Contraintes', description: 'Cadre réglementaire et marché', colorClass: 'border-orange-500/50 text-orange-600 dark:text-orange-400', nodes: [] },
      { id: 'transformations', title: 'Transformations', description: 'Calculs intermédiaires', colorClass: 'border-purple-500/50 text-purple-600 dark:text-purple-400', nodes: [] },
      { id: 'results', title: 'Résultats', description: 'Capacité et objectifs', colorClass: 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400', nodes: [] },
    ];

    const categorizers = {
      resources: [
        'apport', 'revenu', 'épargne', 'equity', 'income', 'savings', 'capital', 
        'cash', 'patrimoine', 'loan_amount', 'mt_pret', 'v_pret'
      ],
      constraints: [
        'taux', 'durée', 'assurance', 'debt', 'ratio', 'rate', 'duration', 
        'assurance', 'framework', 'loi', 'notaire', 'taxes', 'tax', 'fees'
      ],
      results: [
        'capacité', 'budget', 'prix', 'borrowing', 'capacity', 'target', 
        'total', 'max', 'limit', 'final', 'résultat', 'achat', 'acquisition'
      ],
    };

    nodes.forEach(node => {
      const slug = (node.slug || '').toLowerCase();
      const label = (node.label || '').toLowerCase();
      const isRoot = incomingCount.get(node.id) === 0;
      const isSink = outgoingCount.get(node.id) === 0;

      // Priority: Results (Sinks or specific names)
      if (categorizers.results.some(k => slug.includes(k) || label.includes(k))) {
        res[3].nodes.push(node);
      } else if (isSink && !isRoot) {
        res[3].nodes.push(node);
      } else if (isRoot) {
        // Roots: distinguish between User Resources and External Constraints
        const isResource = categorizers.resources.some(k => slug.includes(k) || label.includes(k));
        const isConstraint = categorizers.constraints.some(k => slug.includes(k) || label.includes(k));

        if (isConstraint) res[1].nodes.push(node);
        else if (isResource) res[0].nodes.push(node);
        else res[0].nodes.push(node); // Default to Resource if root and unidentified
      } else {
        res[2].nodes.push(node); // Transformations
      }
    });

    // Remove duplicates if any (though logic above is exclusive)
    // and sort alpha
    res.forEach(g => {
        g.nodes.sort((a,b) => (a.label || a.slug).localeCompare(b.label || b.slug));
    });

    return res;
  }, [nodes, incomingCount, outgoingCount]);

  // Dependency Highlighting Logic
  const { highlightedNodeIds, attenuatedNodeIds } = useMemo(() => {
    const targetId = hoveredNodeId || selectedNodeId;
    if (!targetId) return { highlightedNodeIds: new Set<string>(), attenuatedNodeIds: new Set<string>() };

    const highlighted = new Set<string>();
    highlighted.add(targetId);

    // Get all downstream nodes (dependents)
    const queue = [targetId];
    const visited = new Set<string>();
    visited.add(targetId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = adj.get(current) || [];
      children.forEach(child => {
        if (!visited.has(child)) {
          visited.add(child);
          highlighted.add(child);
          queue.push(child);
        }
      });
    }

    const attenuated = new Set<string>();
    nodes.forEach(n => {
      if (!highlighted.has(n.id)) {
        attenuated.add(n.id);
      }
    });

    return { highlightedNodeIds: highlighted, attenuatedNodeIds: attenuated };
  }, [hoveredNodeId, selectedNodeId, nodes, adj]);

  const activeNodeId = hoveredNodeId || selectedNodeId;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden p-6 gap-6">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Plan Causal</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Comprenez la structure économique de votre projet et l'impact de vos variables.</p>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {groups.map((group) => (
          <div 
            key={group.id} 
            className="flex-1 min-w-[280px] flex flex-col gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4"
          >
            <div className="flex flex-col gap-1">
              <div className={cn("text-xs font-bold uppercase tracking-wider", group.colorClass)}>
                {group.title}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase font-medium">
                {group.description}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 custom-scrollbar">
              {group.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHighlighted = highlightedNodeIds.has(node.id);
                const isAttenuated = activeNodeId && attenuatedNodeIds.has(node.id);
                const isSourceOfHighlight = activeNodeId === node.id;

                return (
                  <div
                    key={node.id}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                    className={cn(
                      "relative group cursor-pointer transition-all duration-300 rounded-xl p-3 border-2 flex flex-col gap-1.5 shadow-sm",
                      isLightMode ? "bg-white" : "bg-zinc-950",
                      isSelected || isSourceOfHighlight 
                        ? "border-blue-500 scale-[1.02] shadow-blue-500/20 z-10" 
                        : isHighlighted 
                        ? "border-blue-400/50 ring-2 ring-blue-500/10"
                        : "border-zinc-200 dark:border-zinc-800",
                      isAttenuated && "opacity-40 grayscale-[0.3] scale-[0.98]",
                      !activeNodeId && "hover:border-zinc-400 dark:hover:border-zinc-600"
                    )}
                  >
                    {/* Visual indicator of "Target" relative to selection */}
                    {(isSelected || isSourceOfHighlight) && (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 transform translate-x-full hidden lg:block">
                            <ChevronRight className="w-5 h-5 text-blue-500 animate-pulse" />
                        </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                       <span className={cn(
                         "text-xs font-semibold leading-tight",
                         isLightMode ? "text-zinc-900" : "text-zinc-100"
                       )}>
                         {node.label || node.slug || node.id}
                       </span>
                       <Box className={cn(
                         "h-3.5 w-3.5 shrink-0 opacity-50",
                         group.colorClass.split(' ')[1]
                       )} />
                    </div>

                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={cn(
                        "text-lg font-mono font-bold tracking-tight",
                        isLightMode ? "text-zinc-800" : "text-zinc-100"
                      )}>
                        {formatNumber(node.value_computed)}
                      </span>
                      {node.unit && (
                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500">
                          {node.unit}
                        </span>
                      )}
                    </div>

                    {node.computation_error && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                            <Info className="h-3 w-3" />
                            <span>Erreur de calcul</span>
                        </div>
                    )}
                  </div>
                );
              })}

              {group.nodes.length === 0 && (
                <div className="py-8 text-center text-[10px] text-zinc-400 dark:text-zinc-600 italic">
                  Aucun élément
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
