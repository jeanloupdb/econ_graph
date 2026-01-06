'use client';

import { VariableHoverCard } from '@/components/ui/variable-hover-card';
import type { NodeToneKey } from '@/lib/api/hooks';
import { getBadgeToneClasses } from '@/lib/nodeStyles';
import Editor from '@monaco-editor/react';
import { Layers, Loader2 } from 'lucide-react';
import type { editor } from 'monaco-editor';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  suggestions?: string[];
  isLoading?: boolean;
  className?: string;
  padding?: { top?: number; bottom?: number };
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
  suggestions = [],
  isLoading = false,
  className,
  transparent = false,
  padding,
}: CodeEditorProps & { transparent?: boolean; padding?: { top?: number; bottom?: number } }) {
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
      
      // Aggressively disable all suggestions/completions
      quickSuggestions: { other: false, comments: false, strings: false },
      suggestOnTriggerCharacters: false,
      snippetSuggestions: 'none',
      wordBasedSuggestions: 'off',
      parameterHints: { enabled: false },
      inlineSuggest: { enabled: false },
      acceptSuggestionOnEnter: 'off',
      acceptSuggestionOnCommitCharacter: false,
      tabCompletion: 'off',
      
      suggest: {
        showMethods: false,
        showFunctions: false,
        showConstructors: false,
        showFields: false,
        showVariables: false,
        showClasses: false,
        showStructs: false,
        showInterfaces: false,
        showModules: false,
        showProperties: false,
        showEvents: false,
        showOperators: false,
        showUnits: false,
        showValues: false,
        showConstants: false,
        showEnums: false,
        showEnumMembers: false,
        showKeywords: false,
        showWords: false,
        showColors: false,
        showFiles: false,
        showReferences: false,
        showFolders: false,
        showTypeParameters: false,
        showSnippets: false,
        filterGraceful: false,
        snippetsPreventQuickSuggestions: false,
      },
      
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
      if (anyContainer) {
        if (anyContainer.__completionProvider) {
          anyContainer.__completionProvider.dispose?.();
        }
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

      // Ne rien faire si l'événement a déjà été stoppé (par un autre éditeur)
      if (e.defaultPrevented) return;

      // Ne rien faire si l'événement provient du NodeEditor Monaco
      if (target.closest('[data-node-editor-monaco]')) return;

      // Ne rien faire si l'événement provient d'un autre éditeur Monaco
      const isInMonacoEditor = target.closest('.monaco-editor');
      if (isInMonacoEditor && !container.contains(isInMonacoEditor)) return;

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

  // Reset suggestion index when suggestions change
  useEffect(() => {
    setSuggestionIndex(0);
  }, [suggestions]);

  // Animated suggestions logic
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [displayedSuggestion, setDisplayedSuggestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refined approach for animation
  useEffect(() => {
    if (!isEmpty || !suggestions || suggestions.length === 0 || isLoading) {
      setDisplayedSuggestion('');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    // ... (rest of animation logic)

    let localCharIndex = 0;
    let localIsDeleting = false;
    
    const animate = () => {
      const targetText = suggestions[suggestionIndex];
      if (!targetText) return; // Guard against undefined
      
      if (!localIsDeleting) {
        if (localCharIndex < targetText.length) {
          localCharIndex++;
          setDisplayedSuggestion(targetText.substring(0, localCharIndex));
          // Faster typing speed
          const speed = 5 + Math.random() * 10; 
          typingTimeoutRef.current = setTimeout(animate, speed);
        } else {
          localIsDeleting = true;
          typingTimeoutRef.current = setTimeout(animate, 5000); // Pause longer (5s)
        }
      } else {
        // Switch to next suggestion
        localIsDeleting = false;
        localCharIndex = 0;
        setDisplayedSuggestion('');
        setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      }
    };

    typingTimeoutRef.current = setTimeout(animate, 200);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [isEmpty, suggestions, suggestionIndex, isLoading]);

  const acceptSuggestion = () => {
    if (displayedSuggestion) {
      const textToInsert = suggestions[suggestionIndex];
      onChange(textToInsert);
      editorRef.current?.focus();
    }
  };

  const nextSuggestion = () => {
    setDisplayedSuggestion('');
    setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    // Reset typing loop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // Handle Tab key to accept suggestion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEmpty || !displayedSuggestion) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation(); 
        acceptSuggestion();
      }
      if (e.key === 'ArrowRight' && e.altKey) { // Alt+Right to skip? Or just let them click.
         // Let's stick to click for now to avoid conflicts.
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isEmpty, displayedSuggestion, suggestionIndex, suggestions]);


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
          // Use viewport coordinates for Portal
          const x = rect.left + rect.width / 2;
          const y = rect.top - 8;
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
      style={{ height }}
      className={`border border-zinc-300 dark:border-zinc-700 rounded-md overflow-hidden relative flex flex-col ${transparent ? 'transparent-monaco' : ''} ${className || ''}`}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Génération de l'IA...</span>
          </div>
        </div>
      )}

      {/* Animated Suggestion Overlay */}
      {isEmpty && displayedSuggestion && !isLoading && (
        <div className="absolute inset-0 z-20 pointer-events-none pl-[46px] pt-[1px]"> {/* Adjusted padding for alignment */}
           <div className="w-full h-full flex flex-col">
              <div className="flex-1 font-mono text-[14px] leading-[19px] text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap relative opacity-90">
                 {(() => {
                   const lines = displayedSuggestion.split('\n');
                   return lines.map((line, i) => {
                     // Only highlight the FIRST line if it's a comment
                     const isComment = i === 0 && line.trim().startsWith('#');
                     const isLast = i === lines.length - 1;
                     return (
                       <div key={i} className={`${isComment ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/20 w-fit px-1 rounded -ml-1 mb-0.5' : ''}`}>
                         {line}
                         {isLast && <span className="animate-pulse inline-block w-2 h-4 bg-blue-500 align-middle ml-0.5"></span>}
                       </div>
                     );
                   });
                 })()}
                 
                 {/* Grouped Menu */}
                 <div className="mt-4 pointer-events-auto animate-in fade-in zoom-in duration-200 flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm w-fit select-none">
                    <button
                      onClick={acceptSuggestion}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-l-md"
                    >
                      Accepter
                    </button>
                    
                    <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700" />

                    <button
                      onClick={nextSuggestion}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors rounded-r-md"
                    >
                      Suivant
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Placeholder overlay when editor is empty (keep existing but maybe hide if suggestion is showing?) 
          Actually, if suggestion is showing, we probably want to hide the static placeholder.
      */}
      {isEmpty && !!placeholder && !displayedSuggestion && (
        <div
          className="pointer-events-none absolute inset-0 p-3 text-sm text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap font-mono opacity-70 z-10"
          aria-hidden
        >
          {placeholder}
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
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
            padding: padding || { top: 0, bottom: 0 },
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-zinc-900 text-zinc-400">
              Chargement de l'éditeur...
            </div>
          }
        />
      </div>
      {showVariablePalette && paletteItems.length > 0 && (
        <div ref={paletteRef} className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 max-h-[120px] overflow-y-auto">
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
              x={hovered.x}
              y={hovered.y}
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
        ${transparent ? `
        .transparent-monaco .monaco-editor,
        .transparent-monaco .monaco-editor-background,
        .transparent-monaco .monaco-editor .margin {
            background-color: transparent !important;
        }
        ` : ''}
      `}</style>
    </div>
  );
}
