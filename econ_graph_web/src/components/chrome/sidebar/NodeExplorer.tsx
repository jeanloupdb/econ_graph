"use client";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useComputeAll, useDeleteNode, useTheme, useUpdateNode, useUpdateOverrides } from "@/lib/api/hooks";
import { deriveEdgesFromCompute } from "@/lib/layout/graph";
import { resolveTonePalette } from "@/lib/nodeStyles";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { formatNumber } from "@/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import { Box, Info, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SidebarItem } from "./SidebarItem";
import { CollapsibleSection, NestedList } from "./SidebarSection";

function NodeItem({
  node,
  allEdges,
  onEditNode,
  onDeleteNode,
  canEdit = true,
}: {
  node: any;
  allEdges: any[];
  onEditNode?: (id: string) => void;
  onDeleteNode?: (id: string) => void;
  canEdit?: boolean;
}) {
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((s) => s.setSelectedNodeIds);
  const addSelectedNode = useUIStore((s) => s.addSelectedNode);
  const removeSelectedNode = useUIStore((s) => s.removeSelectedNode);
  const developerMode = useUIStore((s) => s.developerMode);

  const { data: theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [formulaCode, setFormulaCode] = useState("");
  const [editMode, setEditMode] = useState<'value' | 'formula'>('value');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const updateOverrides = useUpdateOverrides();
  const updateNode = useUpdateNode(node.id);
  const computeAll = useComputeAll();
  const queryClient = useQueryClient();

  // Scenario data for value
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const scenarioComputedValues = useScenarioStore((s) => s.scenarioComputedValues);
  const scenarioValuesScenarioId = useScenarioStore((s) => s.scenarioValuesScenarioId);
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);

  const mode = comparisonEnabled
    ? "comparison"
    : activeScenarioId
    ? "scenario"
    : "baseline";

  const isSelected = selectedNodeIds.includes(node.id);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isEditing) return;

    if (e.ctrlKey || e.metaKey) {
        if (isSelected) {
            removeSelectedNode(node.id);
        } else {
            addSelectedNode(node.id);
        }
    } else if (e.shiftKey) {
        if (!isSelected) {
            addSelectedNode(node.id);
        }
    } else {
        // Single selection - select node and always open inspector (even in view mode)
        setSelectedNodeIds([node.id]);
        setSelectedNodeId(node.id);
        setInspectorOpen(true);
    }
  };

  const handleOpenInspector = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setSelectedNodeId(node.id);
    setInspectorOpen(true);
    setMenuOpen(false);
  };

  // Compute Value
  const scenarioData =
    !comparisonEnabled &&
    activeScenarioId &&
    scenarioValuesScenarioId === activeScenarioId
      ? scenarioComputedValues[node.id]
      : null;

  const displayValue = !comparisonEnabled
    ? (scenarioData?.scenario_value ?? node.data?.value_computed ?? node.value_computed ?? null)
    : null;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Don't allow editing if user can't edit
    if (!canEdit) {
        handleOpenInspector(e);
        return;
    }

    const target = e.target as HTMLElement;
    const isValueClick = target.closest('.group\\/value');

    if (isValueClick) {
        if (mode === 'scenario') {
            setIsEditing(true);
            setEditMode('value');
            setInputValue(displayValue != null ? String(displayValue) : "");
        } else if (mode === 'baseline' && isRoot) {
            setIsEditing(true);
            setEditMode('value');
            setInputValue(displayValue != null ? String(displayValue) : "");
        }
    } else {
        handleOpenInspector(e);
    }
  };

  const handleSave = async () => {
    if (mode === 'scenario') {
        if (!activeScenarioId) return;
        
        try {
            // Basic validation
            const numValue = parseFloat(inputValue);
            if (isNaN(numValue)) {
                setIsEditing(false);
                return;
            }

            await updateOverrides.mutateAsync({
                scenarioId: activeScenarioId,
                data: {
                    overrides: [{
                        node_id: node.id,
                        mode: 'value',
                        override_value: numValue,
                    }]
                }
            });
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to save override", e);
        }
    } else if (mode === 'baseline') {
        try {
            let newDefinition = "";
            if (editMode === 'value') {
                const numValue = parseFloat(inputValue);
                if (isNaN(numValue)) return;
                newDefinition = `def compute():\n    return ${numValue}`;
            } else {
                newDefinition = `def compute():\n    ${formulaCode}`;
            }

            await updateNode.mutateAsync({
                computation_definition: newDefinition
            });
            
            // Recompute all
            await computeAll.mutateAsync();
            
            setIsEditing(false);
            toast.success("Paramètre mis à jour");
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de la mise à jour");
        }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.stopPropagation();
        handleSave();
    } else if (e.key === 'Escape') {
        e.stopPropagation();
        setIsEditing(false);
    }
  };

  // Compute Tone/Color
  const isRoot = allEdges.every(e => e.target !== node.id); // No incoming (Source/Parameter)
  const isLeaf = allEdges.every(e => e.source !== node.id); // No outgoing (Sink/Result)
  const hasError = !!node.data?.computation_error || !!node.computation_error || !!node.data?.provider_last_error || !!node.provider_last_error;

  const tone = hasError ? 'error' : (isRoot ? 'root' : (isLeaf ? 'leaf' : 'intermediate'));
  const palette = resolveTonePalette(tone, (theme as any)?.node_tone);

  return (
    <div className="relative">
      <SidebarItem
        icon={
          <Box
            className="h-3.5 w-3.5"
            style={{ color: palette.border }}
          />
        }
        label={node.data?.label || node.label || node.id}
        isSelected={isSelected}
        onClick={handleNodeClick}
        onDoubleClick={handleDoubleClick}
        className={developerMode ? 'pr-1' : 'pr-4'}
        rightContent={
          <div className={`flex items-center ${developerMode ? 'gap-0.5' : 'gap-2'}`}>
            {isEditing && editMode === 'value' ? (
                <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-200" onClick={(e) => e.stopPropagation()}>
                    <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            // Optional: auto-save or cancel on blur? 
                            // For now, let's keep it manual to avoid accidental saves while thinking
                        }}
                        className="h-6 w-20 text-xs px-2 py-0 bg-white dark:bg-zinc-950 border-blue-500 ring-2 ring-blue-500/20 text-zinc-900 dark:text-zinc-100 rounded shadow-sm"
                        autoFocus
                    />
                    <button
                      onClick={handleSave}
                      className="h-6 px-2 rounded text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                      OK
                  </button>
                  <button
                      onClick={() => setIsEditing(false)}
                      className="h-6 w-6 flex items-center justify-center rounded text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                      ✕
                  </button>
                </div>
            ) : (
                displayValue != null && (
                  <div 
                      className={`ml-2 shrink-0 text-xs font-mono flex items-center justify-end transition-all ${
                          mode === 'baseline' && isRoot
                              ? "min-w-[3rem] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer group/value"
                              : mode === 'baseline'
                              ? "text-zinc-700 dark:text-zinc-400"
                              : "text-white/50"
                      }`}
                      title={mode === 'baseline' && isRoot ? "Double-cliquer pour modifier" : undefined}
                  >
                      {formatNumber(displayValue)}
                  </div>
                )
            )}

            {(developerMode || mode === 'scenario') && (
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger
                  className="p-1 hover:bg-zinc-400 dark:hover:bg-white/10 rounded transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => {
                      handleOpenInspector(e);
                    }}
                  >
                    <Info className="h-3.5 w-3.5 mr-2 text-zinc-500 dark:text-zinc-400" />
                    Détails du nœud
                  </DropdownMenuItem>
                  {mode === 'scenario' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          handleOpenInspector(e);
                          // TODO: Ideally trigger algo edit mode in inspector
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        Modifier l'algo
                      </DropdownMenuItem>
                  )}
                  {developerMode && mode === 'baseline' && canEdit && (
                      <>

                          <DropdownMenuItem
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onEditNode?.(node.id);
                                  setMenuOpen(false);
                              }}
                              className="gap-2"
                          >
                              <Pencil className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                              Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                              onClick={(e) => {
                                  e.stopPropagation();
                                  if (onDeleteNode) {
                                      onDeleteNode(node.id);
                                  }
                                  setMenuOpen(false);
                              }}
                              className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                          >
                              <Trash2 className="h-3.5 w-3.5" />
                              Supprimer
                          </DropdownMenuItem>
                      </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      {isEditing && editMode === 'formula' && (
        <div className="absolute top-full left-0 z-50 w-64 mt-1 flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200 bg-zinc-50 dark:bg-zinc-900 rounded p-2 border border-zinc-200 dark:border-zinc-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-[10px] text-zinc-700 dark:text-zinc-400 flex items-center justify-between">
                <span>Formule Python</span>
                <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[9px]">real_value</code>
            </div>
            <CodeEditor
                value={`def compute():\n    ${formulaCode}`}
                onChange={(val) => {
                    const lines = val.split('\n');
                    const bodyLines = lines.slice(1);
                    const body = bodyLines
                        .map(line => line.startsWith('    ') ? line.slice(4) : line)
                        .join('\n');
                    setFormulaCode(body);
                }}
                language="python"
                height="70px"
                showVariablePalette={false}
                availableConstants={[]}
                enableCompletion={false}
                showSnippets={false}
            />
            <div className="flex items-center gap-1.5 justify-end">
                <button
                    onClick={handleSave}
                    disabled={updateNode.isPending}
                    className="px-2 py-1 rounded text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {updateNode.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
                </button>
                <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 rounded text-[10px] text-zinc-800 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                >
                    ✕
                </button>
            </div>
        </div>
      )}
    </div>
  );
}

export function NodeExplorer({ onEditNode, searchQuery }: { onEditNode?: (id: string) => void; searchQuery?: string }) {
  const { nodes = [] } = useGraphData();
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const deleteNode = useDeleteNode();
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
  const canEdit = !!onEditNode;

  const handleDeleteConfirm = () => {
    if (deleteNodeId) {
        deleteNode.mutate(deleteNodeId);
        setDeleteNodeId(null);
    }
  };

  const nodeToDelete = useMemo(() => 
    nodes.find(n => n.id === deleteNodeId), 
    [nodes, deleteNodeId]
  );

  // Compute edges from nodes since GraphDataContext doesn't provide them
  const edges = useMemo(() => {
    const slugToId = new Map<string, string>();
    nodes.forEach((n) => {
      if (n.slug) slugToId.set(n.slug, n.id);
      slugToId.set(n.id, n.id);
    });

    return nodes.flatMap((n) =>
      deriveEdgesFromCompute(
        { 
          id: n.id, 
          computation_definition: n.computation_definition 
        },
        { resolveSlug: (slug) => slugToId.get(slug) }
      )
    );
  }, [nodes]);

  const { parameters, results, intermediates } = useMemo(() => {
    const incoming = new Set<string>();
    const outgoing = new Set<string>();
    
    edges.forEach(e => {
      outgoing.add(e.source);
      incoming.add(e.target);
    });

    const params: any[] = [];
    const res: any[] = [];
    const inter: any[] = [];

    const query = searchQuery?.toLowerCase() || "";

    nodes.forEach(n => {
      // Filter logic
      if (query) {
          const match = (n.label || "").toLowerCase().includes(query) || (n.slug || "").toLowerCase().includes(query) || n.id.toLowerCase().includes(query);
          if (!match) return;
      }

      const hasIncoming = incoming.has(n.id);
      const hasOutgoing = outgoing.has(n.id);

      if (!hasIncoming) {
        params.push(n);
      } else if (!hasOutgoing) {
        res.push(n);
      } else {
        inter.push(n);
      }
    });

    return { parameters: params, results: res, intermediates: inter };
  }, [nodes, edges, searchQuery]);

  const hasSelectedParam = useMemo(() => parameters.some(n => selectedNodeIds.includes(n.id)), [parameters, selectedNodeIds]);
  const hasSelectedIntermediate = useMemo(() => intermediates.some(n => selectedNodeIds.includes(n.id)), [intermediates, selectedNodeIds]);
  const hasSelectedResult = useMemo(() => results.some(n => selectedNodeIds.includes(n.id)), [results, selectedNodeIds]);

  const isSearching = !!searchQuery;

  if (!nodes || nodes.length === 0) {
    return <div className="px-4 py-2 text-xs text-zinc-700 dark:text-zinc-500">Aucun nœud</div>;
  }

  return (
    <div className="space-y-0.5">
      {parameters.length > 0 && (
        <CollapsibleSection 
            title={`Paramètres (${parameters.length})`} 
            defaultOpen={true}
            forceOpen={hasSelectedParam || isSearching}
        >
          <NestedList
            items={parameters.map(n => <NodeItem key={n.id} node={n} allEdges={edges} onEditNode={onEditNode} onDeleteNode={canEdit ? setDeleteNodeId : undefined} canEdit={canEdit} />)}
          />
        </CollapsibleSection>
      )}

      {intermediates.length > 0 && (
        <CollapsibleSection 
            title={`Intermédiaires (${intermediates.length})`} 
            defaultOpen={false}
            forceOpen={hasSelectedIntermediate || isSearching}
        >
          <NestedList
            items={intermediates.map(n => <NodeItem key={n.id} node={n} allEdges={edges} onEditNode={onEditNode} onDeleteNode={canEdit ? setDeleteNodeId : undefined} canEdit={canEdit} />)}
          />
        </CollapsibleSection>
      )}

      {results.length > 0 && (
        <CollapsibleSection 
            title={`Résultats (${results.length})`} 
            defaultOpen={false}
            forceOpen={hasSelectedResult || isSearching}
        >
          <NestedList
            items={results.map(n => <NodeItem key={n.id} node={n} allEdges={edges} onEditNode={onEditNode} onDeleteNode={canEdit ? setDeleteNodeId : undefined} canEdit={canEdit} />)}
          />
        </CollapsibleSection>
      )}

      <Dialog open={!!deleteNodeId} onOpenChange={(open) => !open && setDeleteNodeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base text-zinc-900 dark:text-zinc-100">Supprimer le nœud</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1.5">
            <p>
              Êtes-vous sûr de vouloir supprimer ce nœud
              {nodeToDelete ? ` « ${nodeToDelete.label} »` : ""} ? Cette action est
              irréversible.
            </p>
            <p className="text-[11px] text-zinc-700 dark:text-zinc-400">
              Cette suppression n'impacte pas ses nœuds parents ou enfants (les
              liens resteront, mais le nœud supprimé disparaîtra).
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteNodeId(null)}
              className="h-7 text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteNode.isPending}
              className="h-7 text-xs"
            >
              {deleteNode.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
