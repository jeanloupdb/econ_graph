'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNodeTones, useProjectNodes } from '@/lib/api/hooks';
import { useProjectStore } from '@/store/projectState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CodeEditor } from '@/components/ui/code-editor';
import { Loader2, Lightbulb, Save, Calculator } from 'lucide-react';

interface AlgorithmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  currentDefinition?: string | null;
  onSave: (definition: string, inputIds: string[]) => void;
}

export function ComputationDialog({
  open,
  onOpenChange,
  nodeId,
  currentDefinition,
  onSave,
}: AlgorithmDialogProps) {
  const [definition, setDefinition] = useState<string>(currentDefinition || '');
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: allNodesData } = useProjectNodes(currentProjectId);
  const { data: toneMap } = useNodeTones(currentProjectId);
  const availableNodes = Array.isArray(allNodesData) ? allNodesData : [];
  // Edges are derived from compute() code; no need to preload from API

  // Update when props change
  useEffect(() => {
    if (currentDefinition) setDefinition(currentDefinition);
  }, [currentDefinition]);

  const inputNodeOptions = availableNodes.filter((n) => n.id !== nodeId);
  const currentNode = useMemo(() => availableNodes.find(n => n.id === nodeId), [availableNodes, nodeId]);

  // Generate a friendly starter template when opening and no definition exists
  useEffect(() => {
    if (currentDefinition) return;
    const baseInputs = (selectedInputs.length > 0 ? selectedInputs : inputNodeOptions.map(n => n.id)).slice(0, 3);
    const params = baseInputs.join(', ') || 'input1, input2';
    const example = baseInputs.length > 0 ? baseInputs.join(' + ') : 'input1 + input2';
    const template = `def compute(${params}):\n    """Calcule la valeur du nœud.\n    Variables disponibles: ${inputNodeOptions.slice(0, 8).map(n => n.id).join(', ') || 'input1, input2'}\n    Retournez un nombre (float).\n    """\n    return ${example}`;
    setDefinition((prev) => (prev?.trim() ? prev : template));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  // Keep guide examples handy
  const placeholder = useMemo(() => {
    const exInputs = inputNodeOptions.slice(0, 2).map(n => n.id);
    const params = exInputs.join(', ') || 'input1, input2';
    const sum = exInputs.join(' + ') || 'input1 + input2';
    return `def compute(${params}):\n    # Calculez le résultat\n    return ${sum}`;
  }, [inputNodeOptions]);

  const toggleInput = (inputId: string) => {
    if (selectedInputs.includes(inputId)) {
      setSelectedInputs(selectedInputs.filter((id) => id !== inputId));
    } else {
      setSelectedInputs([...selectedInputs, inputId]);
    }
  };

  const handleSave = () => {
    setInlineError(null);
    const code = definition.trim();
    if (!code) {
      setInlineError("Veuillez saisir un algorithme.");
      return;
    }
    if (!/\bdef\s+compute\s*\(/.test(code)) {
      setInlineError("L'algorithme doit définir une fonction 'compute(...)'.");
      return;
    }
    if (!/\breturn\b/.test(code)) {
      setInlineError("Ajoutez une instruction 'return' qui renvoie le résultat.");
      return;
    }

    // Auto-detect dependencies from the code
    const detectedInputs: string[] = [];
    const nodeIds = inputNodeOptions.map(n => n.id);

    // Check which node IDs appear in the algorithm code
    nodeIds.forEach(nodeId => {
      // Use word boundaries to match exact node IDs
      const regex = new RegExp(`\\b${nodeId}\\b`, 'g');
      if (regex.test(definition)) {
        detectedInputs.push(nodeId);
      }
    });

    onSave(code, detectedInputs);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to current values
    setDefinition(currentDefinition || '');
    onOpenChange(false);
  };

  const variableOptions = useMemo(
    () =>
      inputNodeOptions.map((n) => ({
        id: n.id,
        label: n.label,
        tone: (toneMap as Record<string, { tone?: 'root' | 'intermediate' | 'leaf' | 'error' }> | undefined)?.[n.id]?.tone,
        isComposite: Boolean(n.composite_id),
      })),
    [inputNodeOptions, toneMap]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Définir l'algorithme
          </DialogTitle>
          <DialogDescription>
            Écrivez un algorithme Python pour calculer la valeur de ce nœud à partir de ses dépendances
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Node context summary */}
          {currentNode && (
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="text-sm text-zinc-500">Nœud</div>
                  <div className="text-base font-semibold">{currentNode.label}</div>
                  <div className="text-[11px] text-zinc-500 font-mono">{currentNode.id}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-500">Définition</div>
                <div className="text-sm font-medium">Algorithme de calcul (compute)</div>
              </div>
            </div>
          )}

          {/* Algorithm Editor */}
          <div className="space-y-2">
            <Label htmlFor="algorithm_definition">
              Algorithme Python *
            </Label>
            <CodeEditor
              value={definition}
              onChange={setDefinition}
              language="python"
              height="400px"
              placeholder={placeholder}
              availableConstants={inputNodeOptions.map(n => n.id)}
              variables={variableOptions}
              showVariablePalette
              enableCompletion={false}
            />
            {inlineError && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 rounded p-2">
                {inlineError}
              </div>
            )}
            <details className="text-xs text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <summary className="cursor-pointer select-none px-3 py-2 bg-zinc-50 dark:bg-zinc-900 flex items-center gap-2">
                <Lightbulb className="h-3 w-3" />
                Guide rapide (optionnel)
              </summary>
              <div className="space-y-1 px-3 py-2">
                <p>• Utilisez Tab pour indenter votre code (4 espaces)</p>
                <p>• Opérations supportées : if/else, +, -, *, /, min/max, abs, round, etc.</p>
                <p>• Aucun import autorisé (restriction de sécurité)</p>
                <p>• Timeout : 5 secondes maximum</p>
                <p className="text-blue-600 dark:text-blue-400">• Exemple : <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">{`if PIB > 0: return PIB * 1.05 else: return 0`}</code></p>
              </div>
            </details>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!definition.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Enregistrer & Calculer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
