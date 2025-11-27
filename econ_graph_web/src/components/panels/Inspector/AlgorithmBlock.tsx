"use client";

import { CodeEditor } from "@/components/ui/code-editor";
import { Calculator, ChevronDown, Edit3 } from "lucide-react";
import type { NodeToneKey } from "@/lib/api/hooks";

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
    <details className="rounded-md border border-zinc-200 dark:border-zinc-800 group">
      <summary className="px-3 py-2 cursor-pointer select-none text-sm text-zinc-700 dark:text-zinc-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
          <Calculator className="h-4 w-4" />
          Algorithme
        </div>
        {onEdit && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Modifier l'algorithme"
            aria-label="Modifier l'algorithme"
          >
            <Edit3 className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Modifier</span>
          </button>
        )}
      </summary>
      <div className="p-3">
        <CodeEditor
          value={normalized}
          onChange={() => {}}
          language="python"
          height="220px"
          readOnly
          showVariablePalette={false}
          enableCompletion={false}
          variables={variables}
        />
      </div>
    </details>
  );
}
