"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MessageSquare, Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

interface ProjectPromptTooltipProps {
  children: ReactNode;
  generationPrompt?: string | null;
  description?: string | null;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

/**
 * Clean the prompt by removing system instructions
 */
function cleanPrompt(prompt: string): string {
  // Remove system instructions that start with "IMPORTANT:"
  const patterns = [
    /\n\nIMPORTANT:[\s\S]*$/i,
    /\nIMPORTANT:[\s\S]*$/i,
    /IMPORTANT:\s*Pour chaque nœud créé[\s\S]*$/i,
  ];

  let cleaned = prompt;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
}

/**
 * Popover component that displays the AI prompt and description
 * used to generate a project. Click to view full details.
 */
export function ProjectPromptTooltip({
  children,
  generationPrompt,
  description,
  className,
  side = "bottom",
  align = "start",
}: ProjectPromptTooltipProps) {
  const [open, setOpen] = useState(false);

  // Clean the prompt to remove system instructions
  const cleanedPrompt = generationPrompt ? cleanPrompt(generationPrompt) : null;

  // If no prompt or description, just render children without popover
  if (!cleanedPrompt && !description) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("inline-flex items-center", className)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-[360px] p-0 overflow-hidden bg-zinc-800 border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Linear style */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-700">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Génération IA
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-1 -mr-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[320px] overflow-y-auto">
          {/* User prompt */}
          {cleanedPrompt && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                <MessageSquare className="h-3 w-3" />
                Votre demande
              </div>
              <p className="text-sm text-zinc-100 leading-relaxed">
                {cleanedPrompt}
              </p>
            </div>
          )}

          {/* Separator */}
          {cleanedPrompt && description && (
            <div className="border-t border-zinc-700" />
          )}

          {/* Description / AI understanding */}
          {description && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                <Sparkles className="h-3 w-3" />
                Compréhension IA
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {description}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
