'use client';

import { AiInput } from '@/components/ui/ai-input';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/ui/code-editor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InfoHint } from '@/components/ui/info-hint';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGraphActions } from '@/graph/context/GraphActionsContext';
import { useGraphData } from '@/graph/context/GraphDataContext';
import type { NodeToneKey } from '@/lib/api/hooks';
import { useNodeTones } from '@/lib/api/hooks';
import type { Node, NodeCreate, NodeUnit, NodeUpdate } from '@/lib/types';
import { useProjectStore } from '@/store/projectState';
import { useUIStore } from '@/store/uiState';
import { Loader2, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface NewNodeModalProps {
  open: boolean;
  onClose: () => void;
  nodeId?: string; // if provided, edit existing node
}

function kebabify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 60);
}

const resolveCompositeSlug = (node?: Node | null) =>
  node?.slug ||
  (node as any)?.raw_internal_id ||
  node?.composite_roots?.[0]?.slug ||
  node?.composite_roots?.[0]?.label ||
  node?.composite_root_ids?.[0] ||
  node?.id ||
  '';

export function NewNodeModal({ open, onClose, nodeId }: NewNodeModalProps) {
  const { nodes: availableNodes } = useGraphData();
  const graphActions = useGraphActions();
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const computeAvailable = graphActions.computeNode;
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: toneMap } = useNodeTones(currentProjectId);

  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [unit, setUnit] = useState<NodeUnit>('');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const existingNode = useMemo(() => {
    if (!nodeId) return undefined;
    return availableNodes.find((n) => n.id === nodeId);
  }, [availableNodes, nodeId]);

  // Initialize form values once per open/nodeId to avoid cascading re-renders
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      initKeyRef.current = null;
      return;
    }
    const key = nodeId ? `edit:${nodeId}` : 'create:new';
    if (initKeyRef.current === key) return;

    if (nodeId) {
      if (!existingNode) return;
      setLabel(existingNode.label);
      setSlug(resolveCompositeSlug(existingNode));
      setUnit((existingNode.unit as any) || '');
      setNotes((existingNode.notes as any) || '');
      const def = ((existingNode as any).computation_definition || '').toString();
      if (def) setCode(def);
      setSlugManuallyEdited(true);
    } else {

      if (!slug.trim()) {
        setSlug(kebabify(label || resolveCompositeSlug(existingNode) || 'nouveau-noeud'));
      }
      setSlugManuallyEdited(false);
    }
    initKeyRef.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nodeId, availableNodes, existingNode]);

  const canCreate = slug.trim().length > 0 && label.trim().length > 0 && code.trim().length > 0;

  const availableVariableIds = useMemo(() => {
    return availableNodes
      .map((n) => resolveCompositeSlug(n) || n.id || '')
      .filter((id): id is string => Boolean(id));
  }, [availableNodes]);

  const availableVariableOptions = useMemo(
    () =>
      availableNodes
        .map((n) => {
          const variableId = resolveCompositeSlug(n) || n.id;
          if (!variableId) {
            return null;
          }
          const tone = ((toneMap as Record<string, { tone?: NodeToneKey }> | undefined)?.[n.id]?.tone || undefined) as
            | NodeToneKey
            | undefined;
          return {
            id: variableId,
            label: n.label,
            tone,
            isComposite: Boolean(n.composite_id),
          };
        })
        .filter(
          (
            entry
          ): entry is {
            id: string;
            label: string;
            tone: NodeToneKey | undefined;
            isComposite: boolean;
          } => Boolean(entry)
        ),
    [availableNodes, toneMap]
  );

  const detectedInputs = useMemo(() => {
    const used: string[] = [];
    const src = code || '';
    availableVariableIds.forEach((candidateRaw) => {
      const candidate = candidateRaw.trim();
      if (!candidate) return;
      const re = new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'g');
      if (re.test(src)) used.push(candidate);
    });
    return used;
  }, [code, availableVariableIds]);

  const normalizedCode = useMemo(() => {
    const c = code.trim();
    if (!c) return '';
    if (/\bdef\s+compute\s*\(/.test(c)) return c; // user provided full function
    const fallbackParams =
      detectedInputs.length > 0
        ? detectedInputs
        : availableVariableIds.length > 0
        ? ['x', 'y']
        : [];
    const paramsSegment = fallbackParams.join(', ');
    if (paramsSegment.length === 0) {
      const body = c.includes('\n') ? c : `    return ${c}`;
      return `def compute():\n${body}`;
    }
    const body = c.includes('\n') ? c : `    return ${c}`;
    return `def compute(${paramsSegment}):\n${body}`;
  }, [code, detectedInputs, availableVariableIds.length]);

  const handleCreate = async () => {
    setInlineError(null);
    if (saving) return;
    if (!canCreate) return;
    // Minimal validation: ensure compute + return are present after normalization
    if (!/\bdef\s+compute\s*\(/.test(normalizedCode)) {
      setInlineError("Le code doit définir une fonction 'compute(...)'.");
      return;
    }
    if (!/\breturn\b/.test(normalizedCode)) {
      setInlineError("Ajoutez une instruction 'return'.");
      return;
    }

    const payload: NodeCreate = {
      slug: slug.trim(),
      label,
      unit,
      status: 'unknown',
      confidence: 0.5,
      notes: notes || null,
      value_computed: null,
      computation_definition: normalizedCode,
    };

    const setIsComputing = useUIStore.getState().setIsComputing;
    try {
      setSaving(true);
      if (!nodeId) {
        const created = await graphActions.createNode(payload);
        if (computeAvailable) {
          setIsComputing(true);
          await computeAvailable(created.id);
          setIsComputing(false);
        }
        setSelectedNodeId(created.id);
      } else {
        const updatePayload: NodeUpdate = {
          label,
          unit: unit as any,
          notes,
          value_computed: null,
          computation_definition: normalizedCode,
        };
        await graphActions.updateNode(nodeId, updatePayload);
        if (computeAvailable) {
          setIsComputing(true);
          await computeAvailable(nodeId);
          setIsComputing(false);
        }
        setSelectedNodeId(nodeId);
      }
      onClose();
    } catch (e) {
      setInlineError((e as any)?.message || (nodeId ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'));
    } finally {
      setSaving(false);
    }
  };

  // Default code initialization
  useEffect(() => {
    if (!open) return;
    
    // Only set default if we are creating a new node and code is empty
    if (!nodeId && !code.trim()) {
      if (availableVariableIds.length > 0) {
        const firstVar = availableVariableIds[0];
        setCode(`def compute(${firstVar}):\n    # Exemple par défaut\n    return 42 * ${firstVar}`);
      } else {
        setCode(`def compute():\n    # Exemple par défaut\n    return 42`);
      }
    }
  }, [open, nodeId, availableVariableIds]);

  const suggestions: string[] = []; // No more ghost text suggestions

  const handleGenerateAi = async (force = false) => {
    if (!force) {
      setAiPromptOpen(true);
      return;
    }


    
    setAiPromptOpen(false);
    setIsGeneratingAi(true);
    setAiSuggestions([]); // Clear previous suggestions
    setCode(''); // Clear to show ghost text
    try {
      const context = {
        label: label || "Nouveau nœud",
        unit: unit,
        description: notes,
        inputs: availableNodes.map(n => ({ 
          id: resolveCompositeSlug(n), 
          label: n.label,
          unit: (n as any)?.unit,
          description: (n as any)?.notes
        })),
        currentCode: code, // Pass existing code for modification
      };
      
      const res = await fetch('http://localhost:8000/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt || `Generate a Python compute function for a node named '${label}'. Inputs available: ${availableVariableIds.join(', ')}.`,
          context
        }),
      });
      
      const data = await res.json();
      if (data.text) {
        setCode(data.text);
        setAiSuggestions([]);
      }
    } catch (error) {
      console.error("AI Generation failed", error);
      setInlineError("Erreur lors de la génération IA");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent 
          className={`
            flex flex-col !gap-0 overflow-hidden duration-300 !p-0
            ${fullscreen 
              ? 'w-screen h-screen max-w-none translate-x-0 translate-y-0 left-0 top-0 rounded-none !border-2 !border-zinc-300 dark:!border-zinc-400 [&>button.absolute]:hidden bg-zinc-100 dark:bg-zinc-950' 
              : 'max-w-[95vw] w-full lg:max-w-7xl h-[95vh] rounded-xl !border-2 !border-zinc-300 dark:!border-zinc-400 shadow-2xl bg-white dark:bg-zinc-900'
            }
          `}
          onPointerDownOutside={(e) => fullscreen && e.preventDefault()}
          onInteractOutside={(e) => fullscreen && e.preventDefault()}
        >
          {/* Header - Normal Mode */}
          {!fullscreen && (
            <DialogHeader className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
              <DialogTitle className="text-xl">
                {nodeId ? 'Modifier le nœud' : 'Créer un nouveau nœud'}
              </DialogTitle>
              <DialogDescription>
                Configurez les propriétés et la logique de calcul de votre nœud.
              </DialogDescription>
            </DialogHeader>
          )}

          {/* Header - Fullscreen Mode */}
          {fullscreen && (
            <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Maximize2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Éditeur Plein Écran</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFullscreen(false)} 
                  className="gap-2 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Réduire
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className={`flex-1 overflow-y-auto custom-scroll min-h-0 ${fullscreen ? 'p-4' : 'p-6'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              {/* Left Column: General Info - Hidden in Fullscreen */}
              <div className={`lg:col-span-4 space-y-6 ${fullscreen ? 'hidden' : ''}`}>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <div className="h-6 w-1 bg-blue-500 rounded-full" />
                    Informations générales
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Label</Label>
                        <InfoHint title="Nom lisible">
                          Nom affiché sur le graphe. Ex: "Croissance PIB"
                        </InfoHint>
                      </div>
                      <Input
                        value={label}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          setLabel(v);
                          if (!nodeId && !slugManuallyEdited) {
                            setSlug(kebabify(v || 'nouveau-noeud'));
                          }
                        }}
                        placeholder="Ex: Croissance PIB réel"
                        className="h-10 bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Code interne (Slug)</Label>
                        <InfoHint title="Identifiant unique">
                          Utilisé dans les formules Python. Doit être unique.
                        </InfoHint>
                      </div>
                      <div className="relative">
                        <Input
                          value={slug}
                          onChange={(e) => {
                            const value = kebabify(e.currentTarget.value);
                            setSlug(value);
                            setSlugManuallyEdited(true);
                          }}
                          disabled={!!nodeId}
                          placeholder="croissance_pib_reel"
                          className="h-10 font-mono text-xs bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-blue-500/20"
                        />
                        {nodeId && (
                          <div className="absolute inset-y-0 right-3 flex items-center">
                            <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Lecture seule</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Unité</Label>
                      </div>
                      <Input
                        value={unit as any}
                        onChange={(e) => setUnit(e.currentTarget.value as any)}
                        placeholder="Ex: %, M$, points..."
                        list="unit-suggestions"
                        className="h-10 bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-blue-500/20"
                      />
                      <datalist id="unit-suggestions">
                        <option value="percent" />
                        <option value="bps" />
                        <option value="level" />
                        <option value="index" />
                        <option value="currency" />
                      </datalist>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Notes</Label>
                      </div>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                        placeholder="Description ou contexte..."
                        className="w-full h-24 resize-none rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Logic */}
              <div className={`${fullscreen ? 'lg:col-span-12' : 'lg:col-span-8'} flex flex-col h-full min-h-[400px]`}>
                
                {/* AI-First Section */}
                <div className="mb-6 space-y-3 shrink-0">
                  <div className="space-y-1.5">
                     <Label className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        Assistant IA
                     </Label>
                     <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Décrivez ce que ce nœud doit calculer. L'IA générera la formule Python pour vous.
                     </p>
                  </div>
                  <AiInput
                    value={aiPrompt}
                    onChange={setAiPrompt}
                    onGenerate={() => handleGenerateAi(true)}
                    isGenerating={isGeneratingAi}
                    placeholder="Modifie le code pour ajouter une condition..."
                  />
                  

                </div>

                {/* Code Editor Section (Result) */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Code Python (Résultat)
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setFullscreen(true)} title="Plein écran">
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className={`flex-1 relative rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm bg-white dark:bg-zinc-900 group hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors ${fullscreen ? 'shadow-2xl ring-1 ring-black/5 dark:ring-white/5' : ''}`}>
                    <CodeEditor
                      value={code}
                      onChange={setCode}
                      language="python"
                      height="100%"
                      className="h-full border-0"
                      availableConstants={availableVariableIds}
                      variables={availableVariableOptions}
                      showVariablePalette
                      enableCompletion={false}
                      suggestions={isGeneratingAi ? [] : (aiSuggestions.length > 0 ? aiSuggestions : suggestions)}
                      isLoading={isGeneratingAi}
                      placeholder="# Le code généré apparaîtra ici..."
                    />
                  </div>

                  {inlineError && (
                    <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2 animate-in slide-in-from-top-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">{inlineError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={onClose} className="hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50">
              Annuler
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!canCreate || saving}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{nodeId ? 'Enregistrement…' : 'Création…'}</>
              ) : (
                nodeId ? 'Enregistrer les modifications' : 'Créer le nœud'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Styles */}
      <style>{`
        .custom-scroll { scrollbar-gutter: stable; }
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.3); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(161, 161, 170, 0.5); }
      `}</style>
    </>
  );
}
