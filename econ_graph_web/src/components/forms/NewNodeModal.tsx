'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { CodeEditor } from '@/components/ui/code-editor';
import { X, Calculator, Loader2, Maximize2, Minimize2, Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InfoHint } from '@/components/ui/info-hint';
import type { Node, NodeCreate, NodeUnit, NodeUpdate } from '@/lib/types';
import { useUIStore } from '@/store/uiState';
import { useGraphData } from '@/graph/context/GraphDataContext';
import { useGraphActions } from '@/graph/context/GraphActionsContext';
import { useProjectStore } from '@/store/projectState';
import { useNodeTones } from '@/lib/api/hooks';
import type { NodeToneKey } from '@/lib/api/hooks';

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
  const [selectedTemplate, setSelectedTemplate] = useState<'none' | 'constant' | 'expression' | 'condition' | 'math'>('none');
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

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
      if (!code.trim()) {
        if (availableNodes.length === 0) {
          setCode('def compute():\n    return 1');
        } else {
          const exInputs = availableNodes
            .slice(0, 2)
            .map((n) => resolveCompositeSlug(n))
            .filter(Boolean);
          const params = exInputs.filter(Boolean).join(', ') || 'a, b';
          const sum = exInputs.filter(Boolean).join(' + ') || 'a + b';
          const placeholder = `def compute(${params}):\n    # Définissez le résultat via une seule expression\n    return ${sum}`;
          setCode(placeholder);
        }
      }
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
          const tone = (toneMap?.[n.id]?.tone || undefined) as
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
            tone?: NodeToneKey;
            isComposite?: boolean;
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

  // Templates
  const buildParams = (n: number) =>
    availableNodes
      .slice(0, n)
      .map((x) => resolveCompositeSlug(x).trim())
      .filter(Boolean)
      .join(', ') || Array.from({ length: n }).map((_, i) => `x${i + 1}`).join(', ');
  const insertTemplate = (tpl: 'constant' | 'expression' | 'condition' | 'math') => {
    if (tpl === 'constant') {
      setCode('def compute():\n    return 42');
    } else if (tpl === 'expression') {
      const params = buildParams(2) || 'a, b';
      const [a, b] = (params.split(',').map((s) => s.trim()) as string[]);
      setCode(`def compute(${params}):\n    return ${a} + ${b}`);
    } else if (tpl === 'condition') {
      const params = buildParams(2) || 'signal, seuil';
      const [s, t] = (params.split(',').map((s) => s.trim()) as string[]);
      setCode(`def compute(${params}):\n    if ${s} is None or ${t} is None:\n        return 0\n    if ${s} > ${t}:\n        return 1\n    else:\n        return 0`);
    } else if (tpl === 'math') {
      const p = buildParams(1) || 'x';
      const varName = p.split(',')[0].trim();
      setCode(`def compute(${p}):\n    # Exemple: racine carrée sécurisée\n    v = ${varName} if ${varName} is not None else 0\n    return math.sqrt(abs(v))`);
    }
  };

  if (!open) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-lg font-semibold">{nodeId ? 'Modifier le nœud' : 'Créer un nœud'}</div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 custom-scroll">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Label</Label>
                <InfoHint title="Nom lisible">
                  Nom affiché sur le graphe et dans l’inspector. Exemple: « Croissance PIB réel ».
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
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label>Code interne</Label>
                <InfoHint title="Slug utilisé dans les formules">
                  Ce code est utilisé comme paramètre dans <code>compute(...)</code>. Il doit être unique dans le projet.
                </InfoHint>
              </div>
              <Input
                value={slug}
                onChange={(e) => {
                  const value = kebabify(e.currentTarget.value);
                  setSlug(value);
                  setSlugManuallyEdited(true);
                }}
                disabled={!!nodeId}
                placeholder="croissance_pib_reel"
              />
              {nodeId ? (
                <p className="text-xs text-zinc-500">Le code ne peut pas être modifié après création pour l’instant.</p>
              ) : null}
              <p className="text-[11px] text-zinc-500 font-mono mt-1">
                ID technique: {existingNode?.id ?? 'sera généré automatiquement'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Unité (libre)</Label>
                <InfoHint title="Unité de la valeur">
                  Texte libre visible partout. Exemples: « milliards de dollars », « % du PIB », « liste des résultats ».
                </InfoHint>
              </div>
              <Input
                value={unit as any}
                onChange={(e) => setUnit(e.currentTarget.value as any)}
                placeholder="milliards de dollars, liste des résultats, …"
                list="unit-suggestions"
              />
              <datalist id="unit-suggestions">
                <option value="percent" />
                <option value="bps" />
                <option value="level" />
                <option value="index" />
                <option value="currency" />
              </datalist>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Notes (optionnel)</Label>
                <InfoHint title="Définition pour le décideur">
                  Courte explication, contexte, portée. Exemple: « Montant de cash disponible hors réserves réglementaires ».
                </InfoHint>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                placeholder="Définition courte à l’attention du décideur"
                className="w-full h-20 resize-vertical rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Définition Python</Label>
                <InfoHint title="Comment remplir ?">
                  Écrivez une fonction <code>def compute(...):</code> qui retourne un nombre (<code>float</code>). Utilisez les IDs de nœuds comme paramètres (et variables).
                  Exemple: <code>def compute(C, I, G, NX): return C + I + G + NX</code>
                </InfoHint>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-500 hover:text-zinc-900"
                  title="Aide: exemples de code pour démarrer"
                  onClick={() => setHelpOpen(true)}
                  aria-label="Aide définition Python"
                >
                  <Lightbulb className="h-4 w-4" />
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setFullscreen(true)}>
                <Maximize2 className="h-4 w-4 mr-1" /> Plein écran
              </Button>
            </div>
            {/* Discreet helper button near editor */}
            <div className="relative group">
              <button
                type="button"
                className="absolute right-0 -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 text-xs px-2 py-1"
                title="Aide: templates d'exemples (mieux avec bases Python)"
                aria-label="Templates d'exemples"
                onClick={() => setTemplateMenuOpen((v) => !v)}
              >
                •••
              </button>
            {templateMenuOpen && (
              <div className="absolute z-20 right-0 mt-2 w-56 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                <div className="px-3 py-2 text-[12px] text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  Exemples pour démarrer. Idéalement, apprenez les bases de Python.
                </div>
                <ul className="py-1 text-sm">
                  {[
                    { id: 'constant', label: 'Constante' },
                    { id: 'expression', label: 'Expression' },
                    { id: 'condition', label: 'Condition' },
                    { id: 'math', label: 'Math' },
                  ].map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => { insertTemplate(opt.id as any); setTemplateMenuOpen(false); setSelectedTemplate(opt.id as any); }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            </div>
            <CodeEditor
              value={code}
              onChange={setCode}
              language="python"
              height="360px"
              availableConstants={availableVariableIds}
              variables={availableVariableOptions}
              showVariablePalette
              enableCompletion={false}
              showSnippets
            />
            {/* Astuce en bas retirée (demande) */}
            {inlineError && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 rounded p-2">
                {inlineError}
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Footer (always visible) */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <Calculator className="h-3 w-3" /> {detectedInputs.length > 0 ? `${detectedInputs.length} variable(s) détectée(s)` : 'Aucune variable détectée'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button onClick={handleCreate} disabled={!canCreate || saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{nodeId ? 'Enregistrement…' : 'Création…'}</>
              ) : (
                nodeId ? 'Enregistrer' : 'Créer'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    {/* Fullscreen editor overlay */}
    {fullscreen && (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
          <div className="text-sm font-medium">Définition Python — Plein écran</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFullscreen(false)}>
              <Minimize2 className="h-4 w-4 mr-1" /> Réduire
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Discreet helper in fullscreen (top-right) */}
          <div className="relative px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 group">
            <button
              type="button"
              className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 text-xs px-2 py-1"
              title="Aide: templates d'exemples (mieux avec bases Python)"
              aria-label="Templates d'exemples"
              onClick={() => setTemplateMenuOpen((v) => !v)}
            >
              •••
            </button>
            {templateMenuOpen && (
              <div className="absolute z-20 right-3 mt-6 w-56 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                <div className="px-3 py-2 text-[12px] text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  Exemples pour démarrer. Idéalement, apprenez les bases de Python.
                </div>
                <ul className="py-1 text-sm">
                  {[
                    { id: 'constant', label: 'Constante' },
                    { id: 'expression', label: 'Expression' },
                    { id: 'condition', label: 'Condition' },
                    { id: 'math', label: 'Math' },
                  ].map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => { insertTemplate(opt.id as any); setTemplateMenuOpen(false); setSelectedTemplate(opt.id as any); }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <CodeEditor
            value={code}
            onChange={setCode}
            language="python"
            height={'calc(100vh - 94px)'}
            availableConstants={availableVariableIds}
            variables={availableVariableOptions}
            showVariablePalette
            enableCompletion={false}
            showSnippets
          />
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 flex justify-end">
          <Button onClick={handleCreate} disabled={!canCreate || saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Créer</>
            ) : (
              'Créer'
            )}
          </Button>
        </div>
      </div>
    )}
    {/* Full help modal with examples (always mounted so the ampoule works in both modes) */}
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exemples pour démarrer</DialogTitle>
          <DialogDescription>
            Inspirez-vous de ces modèles. Conseil: maîtriser les bases de Python rend l’outil plus efficace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { t: 'Somme simple', c: `def compute(a, b):\n    return (a or 0) + (b or 0)` },
            { t: 'Seuil (if/else)', c: `def compute(signal, seuil):\n    if signal is None or seuil is None:\n        return 0\n    return 1 if signal > seuil else 0` },
            { t: 'Normalisation', c: `def compute(x):\n    v = 0 if x is None else x\n    return (v - 100) / 10` },
            { t: 'Constante', c: `def compute():\n    return 42` },
          ].map((ex, i) => (
            <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
              <div className="text-sm font-semibold mb-2">{ex.t}</div>
              <pre className="text-xs bg-zinc-50 dark:bg-zinc-900 p-2 rounded overflow-auto"><code>{ex.c}</code></pre>
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={() => { setCode(ex.c); setHelpOpen(false); }}>Insérer ce code</Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    {/* Compact scrollbar styling */}
    <style>{`
      .custom-scroll { scrollbar-gutter: stable both-edges; }
      .custom-scroll::-webkit-scrollbar { height: 8px; width: 10px; }
      .custom-scroll::-webkit-scrollbar-thumb { background: rgba(100,100,100,.35); border-radius: 8px; }
      .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    `}</style>
    </>
  );
}
