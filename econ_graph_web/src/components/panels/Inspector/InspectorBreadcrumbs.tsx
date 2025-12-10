"use client";

import type { Node } from "@/lib/types";
import { formatNumber } from "@/utils/format";
import { ChevronLeft, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

interface InspectorBreadcrumbsProps {
  navHistory: string[];
  navIndex: number;
  nodes: Node[];
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (index: number, nodeId: string) => void;
}

export function InspectorBreadcrumbs({
  navHistory,
  navIndex,
  nodes,
  canGoBack,
  onBack,
  onNavigate,
}: InspectorBreadcrumbsProps) {
  const isFullNode = (node: Node | { id: string }): node is Node =>
    "slug" in node || "label" in node;

  const [hoverCrumb, setHoverCrumb] = useState<{
    node: Partial<Node> & { id: string };
    x: number;
    y: number;
  } | null>(null);

  const crumbs = useMemo(() => {
    if (navHistory.length === 0 || navIndex < 0) return [];
    return navHistory.slice(0, navIndex + 1).map((id) => {
      const node = nodes.find((n) => n.id === id);
      return node || { id };
    });
  }, [navHistory, navIndex, nodes]);

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-100 dark:border-zinc-900">
        <button
          type="button"
          title="Retour au nœud précédent"
          aria-label="Retour au nœud précédent"
          className={`inline-flex items-center justify-center h-7 w-7 rounded text-zinc-700 dark:text-zinc-200 ${
            canGoBack
              ? "hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={onBack}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="truncate text-[12px] text-zinc-800 dark:text-zinc-200">
          {crumbs.map((crumb, idx) => {
            const node = crumb as Node | { id: string };
            const isLast = idx === crumbs.length - 1;
            const composite = isFullNode(node) && !!node.composite_id;
            const label = isFullNode(node)
              ? node.slug || node.label || node.id
              : node.id;
            const commonHoverProps = {
              onMouseEnter: (event: React.MouseEvent) => {
                const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top;
                setHoverCrumb({
                  node: (node as Node) ?? ({ id: node.id } as Node),
                  x,
                  y,
                });
              },
              onMouseLeave: () => setHoverCrumb(null),
            };

            if (isLast) {
              return (
                <span
                  key={`${node.id}-${idx}`}
                  className="font-mono text-[12px] text-zinc-900 dark:text-zinc-100"
                  {...commonHoverProps}
                >
                  <span className="inline-flex items-center gap-1">
                    {composite && (
                      <Layers className="h-3 w-3 text-amber-500" />
                    )}
                    {label}
                  </span>
                </span>
              );
            }

            return (
              <span key={`${node.id}-${idx}`} className="whitespace-nowrap">
                <button
                  className="font-mono text-[12px] text-blue-600 hover:underline"
                  title={`Aller à ${label}`}
                  onClick={() => onNavigate(idx, node.id)}
                  {...commonHoverProps}
                >
                  <span className="inline-flex items-center gap-1">
                    {composite && (
                      <Layers className="h-3 w-3 text-amber-500" />
                    )}
                    {label}
                  </span>
                </button>
                {" / "}
              </span>
            );
          })}
        </div>
      </div>

      {hoverCrumb &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none px-3 py-2 text-xs rounded-md bg-zinc-900 text-zinc-50 shadow-xl border border-zinc-800"
            style={{
              left: Math.max(
                8,
                Math.min(hoverCrumb.x, (window.innerWidth || 0) - 8)
              ),
              top: Math.max(8, hoverCrumb.y),
              transform: "translate(-50%, -100%)",
            }}
            role="tooltip"
          >
            <div className="font-semibold leading-tight">
              {hoverCrumb.node.label || hoverCrumb.node.id}
            </div>
            <div className="opacity-70 text-[11px] leading-tight mt-0.5 font-mono">
              {hoverCrumb.node.id}
            </div>
            <div className="mt-1 leading-tight">
              {(() => {
                const value = hoverCrumb.node.value_computed;
                return (
                  <span>
                    Valeur:{" "}
                    <span className="font-mono">
                      {value == null ? "—" : formatNumber(value)}
                    </span>{" "}
                    <span>{hoverCrumb.node.unit || ""}</span>
                  </span>
                );
              })()}
            </div>
            {hoverCrumb.node.computation_error && (
              <div className="mt-1 text-red-300">
                Erreur: {hoverCrumb.node.computation_error}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
