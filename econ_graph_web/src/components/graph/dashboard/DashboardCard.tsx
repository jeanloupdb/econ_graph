"use client";

import { cn } from "@/lib/utils";
import type { ReactNode, CSSProperties } from "react";

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Optional left accent stripe, e.g. "border-l-blue-500" */
  accent?: string;
}

export function DashboardCard({ children, className, style, accent }: DashboardCardProps) {
  return (
    <div
      style={style}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-sm",
        "bg-white border border-zinc-200",
        accent && `border-l-2 ${accent}`,
        className
      )}
    >
      {children}
    </div>
  );
}
