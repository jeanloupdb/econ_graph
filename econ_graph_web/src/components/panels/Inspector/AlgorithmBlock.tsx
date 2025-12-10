"use client";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import type { NodeToneKey } from "@/lib/api/hooks";
import { ChevronDown, Code2, Edit3 } from "lucide-react";

interface AlgorithmBlockProps {
  code?: string | null;
  variables: Array<{
    id: string;
    label: string;
    tone?: NodeToneKey;
    isComposite?: boolean;
  }>;
  onEdit?: () => void;
}

export function AlgorithmBlock({ code, variables, onEdit }: AlgorithmBlockProps) {
  const normalized = code ? String(code).trim() : "";
  if (!normalized) {
    return null;
  }

  return (
    <details className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-sm group" open>
      <summary className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2.5">
          <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180" />
          <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Logique de calcul</div>
          </div>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="h-8 px-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
            Modifier
          </Button>
        )}
      </summary>
      
      <div className="relative group">
        <CodeEditor
          value={normalized}
          onChange={() => {}}
          language="python"
          height="220px"
          readOnly
          showVariablePalette={false}
          enableCompletion={false}
          variables={variables}
          className="border-0"
        />
        {/* Overlay to indicate read-only but allow scroll */}
        <div className="absolute inset-0 pointer-events-none bg-zinc-50/0" />
      </div>
    </details>
  );
}
