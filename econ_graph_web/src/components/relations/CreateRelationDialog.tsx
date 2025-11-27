'use client';

import { useState } from 'react';
import { useProjectNodes, useRules, useCreateEdge } from '@/lib/api/hooks';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import type { Node, EdgeType } from '@/lib/types';

interface CreateRelationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DefinitionMode = 'equation' | 'algorithm';

export function CreateRelationDialog({ open, onOpenChange }: CreateRelationDialogProps) {
  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form state
  const [outputId, setOutputId] = useState<string>('');
  const [inputIds, setInputIds] = useState<string[]>([]);
  const [mode, setMode] = useState<DefinitionMode>('equation');
  const [definition, setDefinition] = useState<string>('');
  const [edgeType, setEdgeType] = useState<EdgeType>('dependency');
  const [ruleId, setRuleId] = useState<string>('');

  // Data fetching
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: nodes, isLoading: nodesLoading } = useProjectNodes(currentProjectId);
  const { data: rules, isLoading: rulesLoading } = useRules();
  const createEdge = useCreateEdge();

  const availableNodes = Array.isArray(nodes) ? nodes : [];
  const availableRules = Array.isArray(rules) ? rules : [];

  // Filter nodes for inputs (exclude output)
  const inputNodeOptions = availableNodes.filter(n => n.id !== outputId);

  const handleReset = () => {
    setStep(1);
    setOutputId('');
    setInputIds([]);
    setMode('equation');
    setDefinition('');
    setEdgeType('dependency');
    setRuleId('');
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!outputId || inputIds.length === 0 || !definition.trim()) {
      return;
    }

    const labelPrefix = mode === 'algorithm' ? 'ALG: ' : '';
    const fullLabel = labelPrefix + definition.trim();

    let successCount = 0;
    let errorMessages: string[] = [];

    // Create one edge per input
    for (const inputId of inputIds) {
      try {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const edgeId = `${inputId}->${outputId}-${timestamp}${random}`;

        await createEdge.mutateAsync({
          id: edgeId,
          source: inputId,
          target: outputId,
          edge_type: edgeType,
          label: fullLabel,
          rule_id: ruleId || null,
        });

        successCount++;
      } catch (error: any) {
        const errorMsg = error?.message || 'Unknown error';
        errorMessages.push(`${inputId}: ${errorMsg}`);
      }
    }

    // Show result
    if (successCount === inputIds.length) {
      // Success toast would go here
      console.log(`✅ Relation created (${successCount} edges)`);
      handleClose();
    } else if (successCount > 0) {
      // Partial success
      console.warn(`⚠️ Partial success: ${successCount}/${inputIds.length} edges created`);
      console.error('Errors:', errorMessages);
      // Could show a detailed error dialog here
    } else {
      // Complete failure
      console.error('❌ Failed to create any edges:', errorMessages);
    }
  };

  const canProceedStep1 = outputId !== '';
  const canProceedStep2 = inputIds.length > 0;
  const canSubmit = definition.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une relation</DialogTitle>
          <DialogDescription>
            Définissez une relation entre nœuds via une équation ou un algorithme
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 py-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
            {step > 1 ? <Check className="h-4 w-4" /> : '1'}
          </div>
          <div className="h-px flex-1 bg-zinc-300" />
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
            {step > 2 ? <Check className="h-4 w-4" /> : '2'}
          </div>
          <div className="h-px flex-1 bg-zinc-300" />
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
            3
          </div>
        </div>

        {/* Step 1: Output */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="output">Output (cible unique) *</Label>
              <p className="text-xs text-zinc-600 mb-2">
                Nœud qui sera calculé par la relation
              </p>
              {nodesLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des nœuds...
                </div>
              ) : (
                <select
                  id="output"
                  value={outputId}
                  onChange={(e) => setOutputId(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="">-- Sélectionner un nœud --</option>
                  {availableNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.id} — {node.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Suivant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Inputs */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Inputs (sources multiples) *</Label>
              <p className="text-xs text-zinc-600 mb-2">
                Nœuds utilisés dans le calcul de {outputId}
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-300 p-2 dark:border-zinc-700">
                {inputNodeOptions.map((node) => (
                  <label
                    key={node.id}
                    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={inputIds.includes(node.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInputIds([...inputIds, node.id]);
                        } else {
                          setInputIds(inputIds.filter(id => id !== node.id));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">
                      {node.id} — {node.label}
                    </span>
                  </label>
                ))}
              </div>
              {inputIds.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  {inputIds.length} nœud{inputIds.length > 1 ? 's' : ''} sélectionné{inputIds.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Précédent
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                  Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Definition */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Mode selection */}
            <div>
              <Label>Mode de définition *</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as DefinitionMode)} className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="equation" id="mode-equation" />
                  <Label htmlFor="mode-equation" className="font-normal cursor-pointer">
                    Équation
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="algorithm" id="mode-algorithm" />
                  <Label htmlFor="mode-algorithm" className="font-normal cursor-pointer">
                    Algorithme
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Definition editor */}
            <div>
              <Label htmlFor="definition">
                {mode === 'equation' ? 'Équation' : 'Algorithme'} *
              </Label>
              <Textarea
                id="definition"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder={
                  mode === 'equation'
                    ? 'Y = C + I + G + NX'
                    : 'def Y(C, I, G, NX):\n    return C + I + G + NX'
                }
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-zinc-600 mt-1">
                {mode === 'equation'
                  ? 'Saisissez une expression mathématique'
                  : 'Saisissez un pseudo-code (aucune validation)'}
              </p>
            </div>

            {/* Edge type */}
            <div>
              <Label htmlFor="edge-type">Type de relation</Label>
              <select
                id="edge-type"
                value={edgeType}
                onChange={(e) => setEdgeType(e.target.value as EdgeType)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="dependency">Dependency (dépendance)</option>
                <option value="influence">Influence</option>
                <option value="correlation">Correlation</option>
                <option value="default">Default</option>
              </select>
            </div>

            {/* Optional rule */}
            <div>
              <Label htmlFor="rule">Règle associée (optionnel)</Label>
              {rulesLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des règles...
                </div>
              ) : (
                <select
                  id="rule"
                  value={ruleId}
                  onChange={(e) => setRuleId(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="">-- Aucune règle --</option>
                  {availableRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Précédent
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || createEdge.isPending}
                >
                  {createEdge.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer la relation ({inputIds.length} arête{inputIds.length > 1 ? 's' : ''})
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
