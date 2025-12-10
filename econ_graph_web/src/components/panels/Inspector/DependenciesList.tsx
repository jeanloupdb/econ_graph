"use client";

import { getNodeDisplayIdentifier } from "@/lib/nodes";
import type { Node } from "@/lib/types";
import { formatNumber } from "@/utils/format";
import { Layers } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
  const [hovered, setHovered] = useState<{
    node: Node;
    x: number;
    y: number;
  } | null>(null);

  const dependencies = useMemo(() => {
    if (!ids.length) return [];
    return nodes.filter((node) => ids.includes(node.id));
  }, [ids, nodes]);

  if (!dependencies.length) {
    return null;
  }

  return (
    <div className="relative rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="flex flex-wrap gap-1">
        {dependencies.map((node) => {
          const palette = getPaletteForNode(node.id);
          const isComposite = Boolean(node.composite_id);
          const style: React.CSSProperties = {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            color: palette.text,
            borderWidth: 1,
            borderStyle: "solid",
          };
          return (
            <span
              key={node.id}
              role="button"
              title={`Aller à ${node.label}`}
              tabIndex={0}
              onClick={() => onNavigate(node.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onNavigate(node.id);
                }
              }}
              onMouseEnter={(event) => {
                const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                setHovered({
                  node,
                  x: rect.left + rect.width / 2,
                  y: rect.bottom + 8,
                });
              }}
              onMouseLeave={() => setHovered(null)}
              className={`px-2 py-1 rounded border cursor-pointer select-none transition-colors relative overflow-hidden ${
                isComposite
                  ? "shadow-[inset_0_0_0_1px_rgba(245,158,11,0.35)]"
                  : ""
              }`}
              style={style}
            >
              <div className="flex items-center gap-1 text-[12px] font-medium leading-tight truncate max-w-[180px]">
                {isComposite && (
                  <Layers className="h-3 w-3 text-amber-600 dark:text-amber-300" />
                )}
                <span className="truncate">{node.label}</span>
              </div>
              <div className="text-[10px] font-mono opacity-70 leading-tight">
                {getNodeDisplayIdentifier(node) || node.id}
              </div>
            </span>
          );
        })}
      </div>

      {hovered &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none px-3 py-2 text-xs rounded-md shadow-lg border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            style={{
              left: Math.max(
                8,
                Math.min(hovered.x, (window.innerWidth || 0) - 8)
              ),
              top: Math.max(
                8,
                Math.min(hovered.y, (window.innerHeight || 0) - 8)
              ),
              transform: "translate(-50%, 0)",
            }}
            role="tooltip"
          >
            <div className="font-semibold leading-tight text-sm">
              {hovered.node.label || hovered.node.id}
            </div>
            <div className="text-[11px] font-mono text-zinc-500">
              {getNodeDisplayIdentifier(hovered.node) || hovered.node.id}
            </div>
            <div className="mt-2 text-[12px]">
              Valeur :{" "}
              <span className="font-mono">
                {hovered.node.value_computed == null
                  ? "—"
                  : formatNumber(hovered.node.value_computed)}
              </span>{" "}
              <span>{hovered.node.unit}</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
