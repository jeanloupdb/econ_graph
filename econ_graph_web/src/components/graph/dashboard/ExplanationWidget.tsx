"use client";

import type { ExplanationWidget as ExplanationWidgetType } from "@/types/dashboard";
import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { DashboardCard } from "./DashboardCard";

interface Props {
  widget: ExplanationWidgetType;
  style?: CSSProperties;
}

export function ExplanationWidget({ widget, style }: Props) {
  return (
    <DashboardCard style={style} className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <span className="text-sm font-semibold text-zinc-200">Analyse IA</span>
      </div>
      <div className="px-5 py-4 flex-1 overflow-hidden">
        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-[8]">
          {widget.content}
        </p>
      </div>
    </DashboardCard>
  );
}
