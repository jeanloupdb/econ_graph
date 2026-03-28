"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiState";
import { AiContextInfo } from "@/types/ai-context";
import { Sparkles, Pencil } from "lucide-react";

interface AiContextButtonProps {
  context: AiContextInfo;
  className?: string;
  isLightMode?: boolean;
  onHover?: (isHovered: boolean) => void;
}

const getExplainPrompt = (context: AiContextInfo) => {
  if (context.target?.kind === "section") {
    return "Explique brièvement cette section.";
  }
  if (context.target?.field === "formula") {
    return "Explique brièvement la formule.";
  }
  if (context.target?.field === "notes") {
    return "Explique brièvement ces notes.";
  }
  if (context.target?.field === "value") {
    return "Explique brièvement cette valeur.";
  }
  if (context.type === "parameter") {
    return "Explique brièvement ce paramètre.";
  }
  if (context.type === "calculation") {
    return "Explique brièvement ce calcul.";
  }
  return "Explique brièvement ce résultat.";
};

export function AiContextButton({ context, className, isLightMode = false, onHover }: AiContextButtonProps) {
  const openAiWithPrompt = useUIStore((s) => s.openAiWithPrompt);

  const handleExplainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openAiWithPrompt(getExplainPrompt(context), true, context);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = context.label || "cet élément";
    openAiWithPrompt(`Édite @${label} : `, false);
  };

  const showEdit = context.target?.kind !== "section";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg p-0.5",
        "backdrop-blur-sm shadow-lg border",
        isLightMode
          ? "bg-white/90 border-zinc-200/80 shadow-zinc-200/40"
          : "bg-zinc-900/90 border-zinc-700/60 shadow-black/20",
        className
      )}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <button
        onClick={handleExplainClick}
        title="Expliquer"
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded-md transition-all duration-150",
          isLightMode
            ? "text-zinc-400 hover:text-violet-600 hover:bg-violet-50"
            : "text-zinc-500 hover:text-violet-300 hover:bg-violet-500/15"
        )}
      >
        <Sparkles className="h-3 w-3" />
      </button>

      {showEdit && (
        <button
          onClick={handleEditClick}
          title="Éditer avec l'IA"
          className={cn(
            "flex items-center justify-center h-6 w-6 rounded-md transition-all duration-150",
            isLightMode
              ? "text-zinc-400 hover:text-violet-600 hover:bg-violet-50"
              : "text-zinc-500 hover:text-violet-300 hover:bg-violet-500/15"
          )}
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
