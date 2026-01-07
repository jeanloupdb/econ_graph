"use client";

import type { Node } from "@/lib/types";
import { formatNumber } from "@/utils/format";
import { Box, Layers } from "lucide-react";
import { useMemo } from "react";

type Palette = { bg: string; border: string; text: string };

interface DependenciesListProps {
  title: string;
  nodes: Node[];
  ids: string[];
  onNavigate: (nodeId: string) => void;
  getPaletteForNode: (nodeId: string) => Palette;
}

export function DependenciesList({
  title,
  nodes,
  ids,
  onNavigate,
  getPaletteForNode,
}: DependenciesListProps) {
  const dependencies = useMemo(() => {
    if (!ids.length) return [];
    return nodes.filter((node) => ids.includes(node.id));
  }, [ids, nodes]);

  if (!dependencies.length) {
    return null;
  }

  return (
    <div className="flex flex-col pb-2">
      {title && (
        <div className="py-2 pl-3 text-[10px] uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-400">
          {title}
        </div>
      )}
      <div className="flex flex-col">
        {dependencies.map((node) => {
          const palette = getPaletteForNode(node.id);
          const isComposite = Boolean(node.composite_id);
          
          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigate(node.id);
                }
              }}
              className="flex items-center gap-2 py-1.5 pl-3 pr-4 hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <div 
                className={`flex items-center justify-center w-3.5 h-3.5 rounded-sm shrink-0 ${isComposite ? 'text-amber-500' : ''}`}
                style={{ color: !isComposite ? palette.border : undefined }}
              >
                {isComposite ? <Layers className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
              </div>
              
              <span className="text-sm text-zinc-800 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 truncate flex-1 transition-colors">
                {node.label || node.id}
              </span>

              {node.value_computed != null && (
                 <span className="text-xs font-mono text-zinc-700 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-400">
                    {formatNumber(node.value_computed)}
                    {node.unit && <span className="ml-1 text-[10px]">{node.unit}</span>}
                 </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
