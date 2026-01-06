"use client";

import { SidebarContainer } from "@/components/chrome/sidebar/SidebarContainer";
import { CollapsibleSection } from "@/components/chrome/sidebar/SidebarSection";
import { AlgorithmPanel } from "@/components/panels/AlgorithmPanel";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useUIStore } from "@/store/uiState";
import {
    ChevronLeft,
    Edit3,
    Loader2
} from "lucide-react";
import { AlgorithmBlock } from "./Inspector/AlgorithmBlock";
import { CompositeInputs } from "./Inspector/CompositeInputs";
import { DependenciesList } from "./Inspector/DependenciesList";
import { EdgeInspector } from "./Inspector/EdgeInspector";
import { InspectorHeader } from "./Inspector/InspectorHeader";
import { NotesCard } from "./Inspector/NotesCard";
import { ProviderBlock } from "./Inspector/ProviderBlock";
import { SmartFixDialog } from "./Inspector/SmartFixDialog";
import { StackPanelRenderer } from "./Inspector/StackPanelRenderer";
import { useInspectorData } from "./Inspector/useInspectorData";
import { ValueCard } from "./Inspector/ValueCard";

export function Inspector() {
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const data = useInspectorData();

  const getContainerStyles = () => {
    // Unified baseline style for all modes
    return "bg-white/60 dark:bg-black/40 border-white/20 backdrop-blur-xl shadow-lg";
  };

  const getHeaderStyles = () => {
    // Unified baseline style for all modes
    return "text-zinc-900 dark:text-zinc-100 border-white/10 dark:border-white/5";
  };

  if (!data.inspectorOpen) {
    return null;
  }

  if (data.edgeViewProps) {
    return <EdgeInspector {...data.edgeViewProps} />;
  }

  const {
    containerStyle,
    startResize,
    headerProps,
    breadcrumbProps,
    panelStack,
    popPanel,
    stackPlaceholder,
    isLoading,
    isError,
    error,
    refreshNodes,
    valueCardProps,
    algorithmProps,
    providerProps,
    directDependenciesProps,
    rootDependenciesProps,
    compositeInputsProps,
    notesNodeId,
    node: typedNode,
    isCompositeNode,
    showEditModal,
    setShowEditModal,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    handleDelete,
    deletePending,
    selectedNodeId,
    scrollRef,
    onEditNode,
  } = useInspectorData();

  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const setNodeEditorNodeId = useUIStore((s) => s.setNodeEditorNodeId);

  const handleOpenEditNode = (id: string) => {
    setNodeEditorNodeId(id);
    setNodeEditorMode('edit');
  };

  return (
    <SidebarContainer
      className={`w-96 z-40 ${getContainerStyles()}`}
      scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
      header={
        <InspectorHeader
          {...headerProps}
          className={`w-full ${getHeaderStyles()}`}
        />
      }
    >
        {panelStack.length > 0 && (
          <div className="sticky top-0 z-10 -mt-1 mb-2">
            <div className="flex items-center justify-between gap-2 rounded px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-50"
                onClick={popPanel}
              >
                <ChevronLeft className="h-3 w-3" /> Retour
              </button>
              <div className="truncate text-xs text-zinc-900 dark:text-zinc-50">
                {panelStack.map((panel, index) => (
                  <span key={panel.key} className="opacity-90">
                    {panel.title}
                    {index < panelStack.length - 1 ? " / " : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        )}

        {isError && (
          <div className="p-2 rounded border border-red-200 bg-red-50 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 flex items-start justify-between gap-2">
            <div>
              <div className="font-medium mb-0.5">Erreur lors du chargement</div>
              <div className="text-[11px]">
                Impossible de charger le nœud {selectedNodeId}. {(error as any)?.message || ""}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshNodes?.()}
              aria-label="Réessayer"
              className="h-6 text-xs"
            >
              Réessayer
            </Button>
          </div>
        )}

        {!isLoading && stackPlaceholder && <StackPanelRenderer />}

        {!isLoading && !isError && typedNode && (
          <div className="flex flex-col">
            {valueCardProps && (
              <CollapsibleSection title="Valeur" defaultOpen={true} noPadding={true}>
                 <ValueCard {...valueCardProps} />
              </CollapsibleSection>
            )}

            {algorithmProps && (
               <CollapsibleSection
                 title="Algorithme"
                 defaultOpen={false}
               >
                 <AlgorithmBlock {...algorithmProps} />
               </CollapsibleSection>
            )}

            {providerProps && (
               <CollapsibleSection title="Provider" defaultOpen={false} noPadding={true}>
                  <ProviderBlock {...providerProps} />
               </CollapsibleSection>
            )}

            {directDependenciesProps && (
               <CollapsibleSection title="Dépendances" defaultOpen={false} noPadding={true}>
                  <DependenciesList {...directDependenciesProps} />
               </CollapsibleSection>
            )}

            {compositeInputsProps && (
               <CollapsibleSection title="Entrées Composite" defaultOpen={false} noPadding={true}>
                  <CompositeInputs {...compositeInputsProps} />
               </CollapsibleSection>
            )}

            {rootDependenciesProps && (
               <CollapsibleSection title="Dépendances Racines" defaultOpen={false} noPadding={true}>
                  <DependenciesList {...rootDependenciesProps} />
               </CollapsibleSection>
            )}

            {notesNodeId && (
               <CollapsibleSection
                 title="Notes"
                 defaultOpen={true}
                 noPadding={true}
               >
                  <NotesCard nodeId={notesNodeId} />
               </CollapsibleSection>
            )}

            {panelStack.length > 0 &&
              panelStack[panelStack.length - 1].type === "algorithm" && (
                <AlgorithmPanel
                  nodeId={
                    panelStack[panelStack.length - 1].props?.nodeId as string
                  }
                />
              )}
          </div>
        )}

        {!isLoading && !typedNode && (
          <p className="text-xs text-zinc-500 p-4">Nœud introuvable</p>
        )}

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">Supprimer le nœud</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1.5">
            <p>
              Êtes-vous sûr de vouloir supprimer ce nœud
              {typedNode ? ` « ${typedNode.label} »` : ""} ? Cette action est
              irréversible.
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Cette suppression n'impacte pas ses nœuds parents ou enfants (les
              liens resteront, mais le nœud supprimé disparaîtra).
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              className="h-7 text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePending}
              className="h-7 text-xs"
            >
              {deletePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .custom-scroll::-webkit-scrollbar { height: 8px; width: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(100,100,100,.35); border-radius: 8px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {typedNode && (
        <SmartFixDialog
          isOpen={data.smartFixOpen}
          onClose={() => data.setSmartFixOpen(false)}
          nodeId={typedNode.id}
          currentCode={typedNode.computation_definition || ""}
          errorTrace={typedNode.computation_error || ""}
          onApplyFix={data.handleApplySmartFix}
          errorInputNodes={data.errorInputNodes}
          onNavigate={data.onNavigate}
        />
      )}
    </SidebarContainer>
  );
}
