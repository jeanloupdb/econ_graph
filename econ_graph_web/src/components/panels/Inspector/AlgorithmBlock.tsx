"use client";

import { Button } from "@/components/ui/button";
import type { NodeToneKey } from "@/lib/api/hooks";
import { formatPythonCode } from "@/lib/python-formatter";
import Editor from '@monaco-editor/react';
import { Copy } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

interface AlgorithmBlockProps {
  code?: string | null;
  variables: Array<{
    id: string;
    label: string;
    tone?: NodeToneKey;
    isComposite?: boolean;
  }>;
  onEdit?: () => void;
  nodeLabel?: string;
  onSave?: (code: string) => Promise<void>;
  nodeId?: string | null;
}

export function AlgorithmBlock({ code }: AlgorithmBlockProps) {
  const normalized = useMemo(() => {
    return code ? formatPythonCode(String(code).trim()) : "";
  }, [code]);


  if (!normalized) {
    return null;
  }

  return (
    <div className="pr-4">
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
        {/* Header avec bouton copier */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
          <span className="text-xs font-mono text-zinc-800 dark:text-zinc-400">Python</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (normalized.trim()) {
                  navigator.clipboard.writeText(normalized);
                  toast.success('Code copié');
                }
              }}
              disabled={!normalized.trim()}
              className="h-6 px-2 text-xs gap-1.5"
            >
              <Copy className="h-3 w-3" />
              Copier
            </Button>
          </div>
        </div>
        {/* Monaco Editor */}
        <div className="h-[300px]">
          <Editor
            height="100%"
            defaultLanguage="python"
            language="python"
            value={normalized}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: 'off',
              lineNumbersMinChars: 3,
              folding: false,
              renderLineHighlight: 'line',
              contextmenu: false,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false,
              },
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>
    </div>
  );
}
