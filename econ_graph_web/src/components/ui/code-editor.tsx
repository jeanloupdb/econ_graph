'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { languages } from 'monaco-editor';
import { VariableHoverCard } from '@/components/ui/variable-hover-card';
import type { NodeToneKey } from '@/lib/api/hooks';
import { getBadgeToneClasses } from '@/lib/nodeStyles';
import { Layers } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  placeholder?: string;
  readOnly?: boolean;
  availableConstants?: string[];
  showVariablePalette?: boolean;
  variables?: { id: string; label?: string; tone?: NodeToneKey; isComposite?: boolean }[];
  enableCompletion?: boolean;
  showSnippets?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = 'python',
  height = '300px',
  placeholder = '',
  readOnly = false,
  availableConstants = [],
  showVariablePalette = true,
  variables,
  enableCompletion = false,
  showSnippets = true,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isEmpty = !value || value.trim().length === 0;
  const paletteItems: { id: string; label?: string; tone?: NodeToneKey; isComposite?: boolean }[] = useMemo(() => {
    if (variables && variables.length > 0) return variables.slice(0, 24);
    return availableConstants.slice(0, 24).map((id) => ({ id, label: undefined }));
  }, [variables, availableConstants]);
  const paletteRef = useRef<HTMLDivElement | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;

    // Register custom autocompletion provider for constants
    if (enableCompletion && availableConstants.length > 0) {
      const completionProvider = monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // Show all available node IDs as suggestions
          const suggestions = availableConstants.map((constant) => ({
            label: constant,
            kind: monaco.languages.CompletionItemKind.Variable,
            documentation: `Nœud disponible: ${constant}`,
            insertText: constant,
            range: range,
            sortText: constant,
          }));

          return { suggestions };
        },
      });

      // Clean up on unmount
      // Note: @monaco-editor/react doesn't use the return value here; dispose on unmount via effect below
      (containerRef.current as any).__completionProvider = completionProvider;
    }

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      readOnly,
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      wordWrap: 'off',
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: false,
      renderLineHighlight: 'all',
      contextmenu: true,
      quickSuggestions: false, // Disable automatic suggestions
      suggestOnTriggerCharacters: false, // Don't show on typing trigger characters
      acceptSuggestionOnEnter: 'off',
      tabCompletion: 'off',
      wordBasedSuggestions: 'off',
      parameterHints: { enabled: false },
      formatOnPaste: true,
      formatOnType: false,
      scrollbar: { horizontal: 'auto' },
    });

    // Ensure spacebar always inserts a space inside the editor
    editor.onKeyDown((e: any) => {
      const evt = e.browserEvent as KeyboardEvent;
      if (!evt) return;
      const isSpace = evt.key === ' ' || evt.code === 'Space';
      if (isSpace && !evt.ctrlKey && !evt.metaKey && !evt.altKey) {
        e.preventDefault();
        try {
          editor.trigger('keyboard', 'type', { text: ' ' });
        } catch {}
      }
    });

    // Focus editor
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  useEffect(() => {
    return () => {
      const anyContainer = containerRef.current as any;
      if (anyContainer && anyContainer.__completionProvider) {
        anyContainer.__completionProvider.dispose?.();
      }
    };
  }, []);

  // Capture Space at window level (capture phase) when focus/target is inside editor container
  useEffect(() => {
    const onKeyCapture = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const target = e.target as HTMLElement | null;
      if (!target || !container.contains(target)) return;
      const isSpace = e.key === ' ' || e.code === 'Space';
      if (isSpace && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        try {
          editorRef.current?.trigger('keyboard', 'type', { text: ' ' });
          editorRef.current?.focus();
        } catch {}
      }
    };
    window.addEventListener('keydown', onKeyCapture, true);
    return () => window.removeEventListener('keydown', onKeyCapture, true);
  }, []);

  const insertTextAtCursor = (text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.trigger('keyboard', 'type', { text });
    ed.focus();
  };

  // Detect preferred color scheme for editor theme
  const theme = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'vs-dark'
    : 'vs';

  // Track hovered variable tooltip
  const [hovered, setHovered] = useState<{ id: string; label?: string; x: number; y: number } | null>(null);

  // Parse used variables in current code
  const usedIds = useMemo(() => {
    const ids = (variables && variables.length > 0 ? variables.map(v => v.id) : availableConstants) as string[];
    const set = new Set<string>();
    if (!value) return set;
    ids.forEach((id) => {
      try {
        const re = new RegExp(`\\b${id.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'm');
        if (re.test(value)) set.add(id);
      } catch {}
    });
    return set;
  }, [value, variables, availableConstants]);

  // No global keyboard shortcuts that could block Space; rely on editor defaults

  // Focus editor when clicking anywhere in editor area (but not palette)
  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (paletteRef.current && paletteRef.current.contains(e.target as Node)) return;
    editorRef.current?.focus();
  };

  // Highlight variables inside the editor content (inline decorations)
  const monacoRef = useRef<any>(null);
  const decorationIds = useRef<string[]>([]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !variables || variables.length === 0) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;
    const decos: any[] = [];
    variables.forEach((v) => {
      if (!v.id) return;
      try {
        const matches = model.findMatches(`\\b${v.id.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, false, true, false, null, true);
        matches.forEach((m: any) => {
          decos.push({
            range: m.range,
            options: {
              inlineClassName: 'eg-var',
            },
          });
        });
      } catch {}
    });
    decorationIds.current = editor.deltaDecorations(decorationIds.current, decos);
    return () => {
      try { editor.deltaDecorations(decorationIds.current, []); } catch {}
    };
  }, [value, variables]);

  // Route spacebar to editor if focus is not inside editor (prevents page scroll / button activation)
  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const insideEditor = !!target.closest('.monaco-editor');
    const insidePalette = !!(paletteRef.current && paletteRef.current.contains(target));
    if (!insideEditor && !insidePalette && (e.key === ' ' || e.key === 'Spacebar')) {
      e.preventDefault();
      insertTextAtCursor(' ');
    }
  };

  // Register hover provider for variable tooltips (discreet)
  useEffect(() => {
    if (!monacoRef.current || !variables || variables.length === 0) return;
    const monaco = monacoRef.current;
    const hoverProvider = monaco.languages.registerHoverProvider('python', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        const id = word?.word as string | undefined;
        if (!id) return null;
        const v = variables.find((x) => x.id === id);
        if (!v) return null;
        const title = (v.label || v.id) as string;
        const md = `**${title}**\nID: ${v.id}`;
        return { contents: [{ value: md }] };
      },
    });
    return () => hoverProvider.dispose();
  }, [variables]);

  const renderVariableChip = (
    v: { id: string; label?: string; tone?: NodeToneKey; isComposite?: boolean },
    key: string
  ) => {
    const toneClasses = getBadgeToneClasses(v.tone);
    const compositeRing = v.isComposite
      ? "ring-1 ring-amber-400/70 dark:ring-amber-500/60"
      : "";
    return (
      <span
        key={key}
        role="button"
        tabIndex={-1}
        className={`select-none cursor-pointer text-[11px] px-2 py-0.5 rounded border font-mono transition-colors inline-flex items-center gap-1 ${toneClasses} ${compositeRing}`}
        onMouseDown={(e) => {
          e.preventDefault();
          insertTextAtCursor(v.id);
        }}
        onClick={(e) => e.preventDefault()}
        onMouseEnter={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const crect = containerRef.current?.getBoundingClientRect();
          const x = rect.left - (crect?.left || 0) + rect.width / 2;
          const y = rect.top - (crect?.top || 0) - 8;
          setHovered({ id: v.id, label: v.label, x, y });
        }}
        onMouseLeave={() => setHovered(null)}
      >
        {v.isComposite && <Layers className="h-3 w-3" />}
        <span>{v.id}</span>
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleContainerMouseDown}
      onKeyDown={handleContainerKeyDown}
      className="border border-zinc-300 dark:border-zinc-700 rounded-md overflow-hidden relative"
    >
      {/* Placeholder overlay when editor is empty */}
      {isEmpty && !!placeholder && (
        <div
          className="pointer-events-none absolute inset-0 p-3 text-sm text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap font-mono opacity-70"
          aria-hidden
        >
          {placeholder}
        </div>
      )}
      <Editor
        height={height}
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={(editor, monaco) => { monacoRef.current = monaco; handleEditorDidMount(editor, monaco); }}
        theme={theme}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          readOnly,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'off',
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          wordBasedSuggestions: 'off',
          scrollbar: { horizontal: 'auto' },
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-zinc-900 text-zinc-400">
            Chargement de l'éditeur...
          </div>
        }
      />
      {showVariablePalette && paletteItems.length > 0 && (
        <div ref={paletteRef} className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div className="flex flex-wrap gap-3 p-2 text-[11px]">
            <div className="flex-1 min-w-[120px]">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Utilisées ({Array.from(usedIds).length})
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {paletteItems
                  .filter((v) => usedIds.has(v.id))
                  .map((v, idx) => renderVariableChip(v, `used-${v.id}-${idx}`))}
                {Array.from(usedIds).length === 0 && (
                  <span className="text-[10px] text-zinc-500 italic">Aucune</span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Non utilisées ({paletteItems.length - Array.from(usedIds).length})
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {paletteItems
                  .filter((v) => !usedIds.has(v.id))
                  .map((v, idx) => renderVariableChip(v, `unused-${v.id}-${idx}`))}
                {paletteItems.length - Array.from(usedIds).length === 0 && (
                  <span className="text-[10px] text-zinc-500 italic">Aucune</span>
                )}
              </div>
            </div>
          </div>
          {hovered && (
            <VariableHoverCard
              id={hovered.id}
              label={hovered.label}
              x={Math.max(8, Math.min(hovered.x, (containerRef.current?.clientWidth || 0) - 8))}
              y={Math.max(8, hovered.y)}
            />
          )}
        </div>
      )}
      {/* Inline styles for variable highlights inside editor */}
      <style>{`
        .eg-var { border-bottom: 1px dotted rgba(0,0,0,0.3); border-radius: 2px; }
        .eg-var-computed { background: rgba(59, 130, 246, 0.15); }
        .eg-var-manual { background: rgba(245, 158, 11, 0.15); }
        .vs-dark .eg-var { border-bottom-color: rgba(255,255,255,0.4); }
      `}</style>
    </div>
  );
}
