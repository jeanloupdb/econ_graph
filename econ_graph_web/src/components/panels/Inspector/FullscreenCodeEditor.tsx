'use client';

import { AiInput } from '@/components/ui/ai-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getBadgeToneClasses } from '@/lib/nodeStyles';
import type { NodeToneKey } from '@/lib/api/hooks';
import { ChevronDown, Copy, Edit3, Layers, Loader2, Sparkles } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useUIStore } from '@/store/uiState';

interface FullscreenCodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  onCodeChange: (code: string) => void;
  variables: Array<{
    id: string;
    label: string;
    tone?: NodeToneKey;
    isComposite?: boolean;
  }>;
  nodeLabel?: string;
  onSave?: (code: string) => Promise<void>;
  readOnly?: boolean;
  nodeId?: string | null;
  onEdit?: () => void;
}

export function FullscreenCodeEditor({
  isOpen,
  onClose,
  code,
  onCodeChange,
  variables,
  nodeLabel,
  onSave,
  readOnly = false,
  nodeId,
  onEdit,
}: FullscreenCodeEditorProps) {
  const [localCode, setLocalCode] = useState(code);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Get global developer mode (edit mode)
  const developerMode = useUIStore((s) => s.developerMode);

  // Synchronize local code with external code when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalCode(code);
    }
  }, [isOpen, code]);

  // Detect used variables
  const usedVariables = useMemo(() => {
    const used = new Set<string>();
    if (!localCode) return used;
    variables.forEach((v) => {
      try {
        const re = new RegExp(`\\b${v.id.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'm');
        if (re.test(localCode)) used.add(v.id);
      } catch {}
    });
    return used;
  }, [localCode, variables]);

  const handleGenerateAi = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    setIsGeneratingAi(true);
    setChatHistory((prev) => [...prev, { role: 'user', content: aiPrompt }]);

    try {
      const context = {
        label: nodeLabel || 'Code Python',
        inputs: variables.map((v) => ({
          id: v.id,
          label: v.label,
        })),
        currentCode: localCode,
      };

      const res = await fetch('http://localhost:8000/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          context,
        }),
      });

      const data = await res.json();
      if (data.text) {
        setLocalCode(data.text);
        onCodeChange(data.text);
        setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Code généré avec succès' }]);
      }
      setAiPrompt('');
    } catch (error) {
      console.error('AI Generation failed', error);
      setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Erreur lors de la génération' }]);
      toast.error('Erreur lors de la génération IA');
    } finally {
      setIsGeneratingAi(false);
    }
  }, [aiPrompt, localCode, nodeLabel, variables, onCodeChange]);

  const handleSave = async () => {
    if (!onSave) {
      onCodeChange(localCode);
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(localCode);
      toast.success('Code enregistré avec succès');
      onClose();
    } catch (error) {
      console.error('Save failed', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (localCode.trim()) {
      navigator.clipboard.writeText(localCode);
      toast.success('Code copié');
    }
  };

  const insertTextAtCursor = (text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.trigger('keyboard', 'type', { text });
    ed.focus();
  };

  // Capture Space and 'f' key at window level (capture phase) when focus is inside editor container
  useEffect(() => {
    if (!isOpen) return;

    const onKeyCapture = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const target = e.target as HTMLElement | null;
      if (!target || !container.contains(target)) return;

      // Ne rien faire si l'événement a déjà été stoppé
      if (e.defaultPrevented) return;

      // Ne rien faire si l'événement provient d'un autre éditeur Monaco
      const isInMonacoEditor = target.closest('.monaco-editor');
      if (isInMonacoEditor && !container.contains(isInMonacoEditor)) return;

      const isSpace = e.key === ' ' || e.code === 'Space';
      const isF = e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey;

      if ((isSpace || isF) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        try {
          editorRef.current?.trigger('keyboard', 'type', { text: e.key });
          editorRef.current?.focus();
        } catch {}
      }
    };
    window.addEventListener('keydown', onKeyCapture, true);
    return () => window.removeEventListener('keydown', onKeyCapture, true);
  }, [isOpen]);

  const addVariableToFunction = (variableId: string) => {
    const ed = editorRef.current;
    if (!ed) return;

    const model = ed.getModel();
    if (!model) return;

    const code = model.getValue();

    // Find the compute function definition
    const computeMatch = code.match(/def\s+compute\s*\(([^)]*)\)/);
    if (!computeMatch) return;

    const currentParams = computeMatch[1].trim();
    const newParams = currentParams
      ? `${currentParams}, ${variableId}`
      : variableId;

    const newCode = code.replace(
      /def\s+compute\s*\([^)]*\)/,
      `def compute(${newParams})`
    );

    setLocalCode(newCode);
    onCodeChange(newCode);
    ed.focus();
  };

  const renderVariableChip = (v: { id: string; label: string; tone?: NodeToneKey; isComposite?: boolean }) => {
    const toneClasses = getBadgeToneClasses(v.tone);
    const compositeRing = v.isComposite ? 'ring-1 ring-amber-400/70 dark:ring-amber-500/60' : '';
    const isUsed = usedVariables.has(v.id);

    return (
      <button
        key={v.id}
        onClick={() => {
          if (isUsed) {
            insertTextAtCursor(v.id);
          } else {
            addVariableToFunction(v.id);
          }
        }}
        className={`select-none cursor-pointer text-[11px] px-2 py-1 rounded border font-mono transition-all inline-flex items-center gap-1 ${toneClasses} ${compositeRing} ${
          isUsed ? 'opacity-100' : 'opacity-60 hover:opacity-100'
        }`}
      >
        {v.isComposite && <Layers className="h-3 w-3" />}
        <span>{v.id}</span>
      </button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[95vh] !max-h-[95vh] !p-0 !gap-0 overflow-hidden">
        <div ref={containerRef} className="w-full h-full flex flex-col">
          {/* Header simplifié */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-base font-semibold">{nodeLabel || 'Nouveau nœud'}</DialogTitle>
              <span className="text-xs text-muted-foreground">Python</span>
              {readOnly && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                  Lecture seule
                </Badge>
              )}
            </div>
            {readOnly && developerMode && onEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  // First close the dialog, then trigger edit after a small delay
                  onClose();
                  setTimeout(() => {
                    onEdit();
                  }, 100);
                }}
                className="gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Modifier
              </Button>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex min-h-0">
            {/* Left: Code Editor */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* AI Assistant - Simplified (only in edit mode) */}
              {!readOnly && (
                <div className="border-b border-border px-6 py-3 shrink-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium">Assistant IA</span>
                  </div>

                  <AiInput
                    value={aiPrompt}
                    onChange={setAiPrompt}
                    onGenerate={handleGenerateAi}
                    isGenerating={isGeneratingAi}
                    placeholder="Décrivez le code que vous souhaitez générer..."
                    className="bg-background w-full"
                  />

                  {/* Chat History - Collapsible */}
                  {chatHistory.length > 0 && (
                    <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between h-8 px-2 text-xs"
                        >
                          <span className="flex items-center gap-2">
                            Historique ({chatHistory.length})
                          </span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <ScrollArea className="max-h-[120px]">
                          <div className="space-y-2 pr-3">
                            {chatHistory.slice(-3).map((msg, idx) => (
                              <div
                                key={idx}
                                className={`text-xs p-2 rounded-md border ${
                                  msg.role === 'user'
                                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/50'
                                    : 'bg-muted/50 border-border'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <Badge variant={msg.role === 'user' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                    {msg.role === 'user' ? 'Vous' : 'IA'}
                                  </Badge>
                                  <span className="flex-1">{msg.content}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}

              {/* Code Editor with better toolbar */}
              <div className="flex-1 min-h-0 relative px-6 pb-6">
                <div className="absolute top-3 right-9 z-10 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-2 py-1 font-mono">
                    Python
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!localCode.trim()}
                    className="h-8 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copier
                  </Button>
                </div>
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  language="python"
                  value={localCode}
                  onChange={(value) => {
                    const newCode = value || '';
                    setLocalCode(newCode);
                    onCodeChange(newCode);
                  }}
                  theme="vs-dark"
                  onMount={(editor) => {
                    editorRef.current = editor;

                    // Ensure spacebar and 'f' always insert correctly inside the editor
                    editor.onKeyDown((e) => {
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

                    editor.focus();
                  }}
                  options={{
                    readOnly: readOnly,
                    minimap: { enabled: false },
                    fontSize: 15,
                    lineHeight: 24,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    wordWrap: 'off',
                    lineNumbersMinChars: 3,
                    folding: true,
                    renderLineHighlight: 'line',
                    contextmenu: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    scrollbar: {
                      vertical: 'visible',
                      horizontal: 'visible',
                      useShadows: false,
                    },
                    padding: { top: 20, bottom: 20 },
                    quickSuggestions: false,
                    suggestOnTriggerCharacters: false,
                    wordBasedSuggestions: 'off',
                  }}
                />
              </div>
            </div>

            {/* Right: Variables Sidebar - Improved (only in edit mode) */}
            {!readOnly && (
              <div className="w-[300px] border-l border-border flex flex-col bg-muted/20">
                <div className="px-4 py-3 border-b border-border shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Variables</h3>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {variables.length}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="px-4 py-4 space-y-4">
                    {/* Used Variables */}
                    {Array.from(usedVariables).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium text-foreground">Utilisées</div>
                          <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">
                            {Array.from(usedVariables).length}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {variables
                            .filter((v) => usedVariables.has(v.id))
                            .map((v) => renderVariableChip(v))}
                        </div>
                      </div>
                    )}

                    {/* Unused Variables */}
                    {variables.length - Array.from(usedVariables).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium text-muted-foreground">Disponibles</div>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {variables.length - Array.from(usedVariables).length}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {variables
                            .filter((v) => !usedVariables.has(v.id))
                            .map((v) => renderVariableChip(v))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {variables.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Aucune variable disponible
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Footer - Improved */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0 bg-muted/30">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onClose}>
                {readOnly ? 'Fermer' : 'Annuler'}
              </Button>
              <div className="text-xs text-muted-foreground">
                <kbd className="px-2 py-1 text-[10px] bg-muted border border-border rounded font-mono">Esc</kbd> pour fermer
              </div>
            </div>
            {!readOnly && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className="min-w-[140px] shadow-sm"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {!isSaving && <span className="mr-2">✓</span>}
                {onSave ? 'Enregistrer' : 'Appliquer'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
