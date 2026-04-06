"use client";

import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";

// ── Typed accent colors for the 3 columns ────────────────────────────────────
export type ColumnColor = "blue" | "purple" | "emerald";

// ── cva variants ─────────────────────────────────────────────────────────────
const scrollHintVariants = cva(
  [
    "absolute left-0 right-0 z-20",
    "flex items-center justify-center pointer-events-none",
    "py-1.5 border backdrop-blur-sm",
    "animate-in fade-in duration-300 transition-all",
  ].join(" "),
  {
    variants: {
      color: {
        blue:    "bg-blue-50/95    text-blue-700    border-blue-100/70",
        purple:  "bg-purple-50/95  text-purple-700  border-purple-100/70",
        emerald: "bg-emerald-50/95 text-emerald-700 border-emerald-100/70",
      },
      direction: {
        up:   "top-[88px] border-b shadow-sm",
        down: "bottom-0 border-t shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]",
      },
    },
  }
);

const loaderVariants = cva("w-8 h-8 animate-spin", {
  variants: {
    color: {
      blue:    "text-blue-500",
      purple:  "text-purple-500",
      emerald: "text-emerald-500",
    },
  },
});

// ── Props ─────────────────────────────────────────────────────────────────────
interface ColumnShellProps {
  children: ReactNode;
  /** Accent color: drives loader + scroll hint tint */
  color: ColumnColor;
  /** compact = mobile single-column view (no border/rounded/shadow) */
  compact?: boolean;
  /** bg-card (white) for Params & Results, bg-muted (light gray) for Calcs */
  bg?: "card" | "muted";
  isLoading?: boolean;
  scrollHint?: { direction: "up" | "down"; label?: string } | null;
  /** When true, scroll hint is suppressed (e.g. detail panel is open) */
  scrollHintHidden?: boolean;
  onClick?: () => void;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ColumnShell({
  children,
  color,
  compact = false,
  bg = "card",
  isLoading,
  scrollHint,
  scrollHintHidden,
  onClick,
  className,
}: ColumnShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col relative group/column",
        compact
          ? ["overflow-visible min-h-full", bg === "card" ? "bg-card" : "bg-muted"]
          : [
              "h-full w-full overflow-hidden rounded-2xl",
              "border border-border transition-[border-color,box-shadow] duration-300",
              bg === "card" ? "bg-card" : "bg-muted",
              color === "blue"    && "hover:border-blue-200/60    hover:shadow-[0_0_12px_-3px_rgba(59,130,246,0.08)]",
              color === "purple"  && "hover:border-purple-200/60  hover:shadow-[0_0_12px_-3px_rgba(139,92,246,0.08)]",
              color === "emerald" && "hover:border-emerald-200/60 hover:shadow-[0_0_12px_-3px_rgba(16,185,129,0.08)]",
            ],
        className
      )}
      onClick={onClick}
    >
      {/* ── Loading overlay ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Loader2 className={loaderVariants({ color })} />
          <span className="sr-only">Chargement…</span>
        </div>
      )}

      {/* ── Scroll hint ───────────────────────────────────────────────────── */}
      {scrollHint && !scrollHintHidden && (
        <div className={scrollHintVariants({ color, direction: scrollHint.direction })}>
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            {scrollHint.direction === "up" && (
              <ChevronUp className="h-3.5 w-3.5 animate-bounce" />
            )}
            <span className="max-w-[200px] truncate">
              {scrollHint.label ??
                (scrollHint.direction === "up" ? "Voir plus haut" : "Voir plus bas")}
            </span>
            {scrollHint.direction === "down" && (
              <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

// ── ColumnHeader ──────────────────────────────────────────────────────────────
// Composant père partagé par les 3 colonnes + InsightsPanel
// Élimine le pattern dupliqué `shrink-0 h-[88px] border-b bg-card ...`

interface ColumnHeaderProps {
  children: ReactNode;
  compact?: boolean;
  /** "center" = colonnes (flex-col items-center justify-center)
   *  "between" = InsightsPanel (items-center justify-between px-4) */
  layout?: "center" | "between";
  stopPropagation?: boolean;
  className?: string;
}

export function ColumnHeader({
  children,
  compact = false,
  layout = "center",
  stopPropagation = false,
  className,
}: ColumnHeaderProps) {
  // In compact (mobile) mode the title row is hidden but children still render
  // (ParametersColumn passes its scenario selector as children only when compact)
  if (compact) return null;

  const handleClick: MouseEventHandler<HTMLDivElement> | undefined =
    stopPropagation ? (e) => e.stopPropagation() : undefined;

  return (
    <div
      className={cn(
        "shrink-0 border-b border-border bg-card relative h-[88px]",
        layout === "center"
          ? "flex flex-col items-center justify-center"
          : "flex items-center justify-between px-4",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
