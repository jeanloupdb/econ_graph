"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiState";
import { AiContextInfo } from "@/types/ai-context";
import { Eye, Pencil } from "lucide-react";

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
    openAiWithPrompt(`Édite @${label} : `, false, context);
  };

  const showEdit = context.target?.kind !== "section";

  return (
    <div
      className={cn(
        "flex items-center rounded-md overflow-hidden shadow-sm border",
        isLightMode
          ? "bg-white border-zinc-200"
          : "bg-zinc-800 border-zinc-700/60",
        className
      )}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <button
        onClick={handleExplainClick}
        title="Expliquer"
        className={cn(
          "flex items-center justify-center p-1.5 transition-colors duration-150",
          isLightMode
            ? "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
            : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60"
        )}
      >
        <Eye className="h-3 w-3" />
      </button>

      {showEdit && (
        <>
          <div className={cn("w-px self-stretch", isLightMode ? "bg-zinc-200" : "bg-zinc-700/60")} />
          <button
            onClick={handleEditClick}
            title="Éditer"
            className={cn(
              "flex items-center justify-center p-1.5 transition-colors duration-150",
              isLightMode
                ? "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60"
            )}
          >
            <Pencil className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
