"use client";

import { NewApiNodeModal } from "@/components/forms/NewApiNodeModal";
import { NewNodeModal } from "@/components/forms/NewNodeModal";
import { AlgorithmPanel } from "@/components/panels/AlgorithmPanel";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Loader2 } from "lucide-react";
import { AlgorithmBlock } from "./Inspector/AlgorithmBlock";
import { CompositeInputs } from "./Inspector/CompositeInputs";
import { DependenciesList } from "./Inspector/DependenciesList";
import { EdgeInspector } from "./Inspector/EdgeInspector";
import { InspectorBreadcrumbs } from "./Inspector/InspectorBreadcrumbs";
import { InspectorHeader } from "./Inspector/InspectorHeader";
import { NotesCard } from "./Inspector/NotesCard";
import { ProviderBlock } from "./Inspector/ProviderBlock";
import { SmartFixDialog } from "./Inspector/SmartFixDialog";
import { StackPanelRenderer } from "./Inspector/StackPanelRenderer";
import { useInspectorData } from "./Inspector/useInspectorData";
import { ValueCard } from "./Inspector/ValueCard";

export function Inspector() {
  const data = useInspectorData();

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
    typedNode,
    isCompositeNode,
    showEditModal,
    setShowEditModal,
    showEditApiModal,
    setShowEditApiModal,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    handleDelete,
    deletePending,
    selectedNodeId,
    scrollRef,
  } = data;

  return (
    <div
      className="flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 relative"
      style={containerStyle}
    >
      <div
        className="absolute left-0 top-0 h-full w-2 z-20 cursor-col-resize bg-zinc-200/70 dark:bg-zinc-600/50 hover:bg-zinc-300/80 dark:hover:bg-zinc-500/70 transition-colors"
        onMouseDown={startResize}
        aria-label="Redimensionner la barre latérale"
        role="separator"
      >
        <div className="absolute inset-y-1/2 -translate-y-1/2 left-0 right-0 flex items-center justify-center">
          <div className="w-px h-8 bg-zinc-500 dark:bg-zinc-200 rounded-full opacity-80" />
        </div>
      </div>

      <InspectorHeader {...headerProps} />
      <InspectorBreadcrumbs {...breadcrumbProps} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scroll">
        {panelStack.length > 0 && (
          <div className="sticky top-0 z-10 -mt-1 mb-2">
            <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <button
                className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-900 dark:text-zinc-50"
                onClick={popPanel}
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </button>
              <div className="truncate text-sm text-zinc-900 dark:text-zinc-50">
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}

        {isError && (
          <div className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 flex items-start justify-between gap-3">
            <div>
              <div className="font-medium mb-0.5">Erreur lors du chargement</div>
              <div>
                Impossible de charger le nœud {selectedNodeId}. {(error as any)?.message || ""}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshNodes?.()}
              aria-label="Réessayer"
            >
              Réessayer
            </Button>
          </div>
        )}

        {!isLoading && stackPlaceholder && <StackPanelRenderer />}

        {!isLoading && !isError && typedNode && (
          <div className="space-y-6">
            {valueCardProps && <ValueCard {...valueCardProps} />}

            {algorithmProps && <AlgorithmBlock {...algorithmProps} />}

            {providerProps && <ProviderBlock {...providerProps} />}

            {directDependenciesProps && (
              <DependenciesList {...directDependenciesProps} />
            )}

            {compositeInputsProps && <CompositeInputs {...compositeInputsProps} />}

            {rootDependenciesProps && (
              <DependenciesList {...rootDependenciesProps} />
            )}

            {notesNodeId && <NotesCard nodeId={notesNodeId} />}

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
          <p className="text-sm text-zinc-500">Nœud introuvable</p>
        )}
      </div>

      {showEditModal &&
        typedNode &&
        !isCompositeNode &&
        !(typedNode as any).provider_enabled && (
          <NewNodeModal
            open={showEditModal}
            onClose={() => setShowEditModal(false)}
            nodeId={typedNode.id}
          />
        )}
      {showEditApiModal &&
        typedNode &&
        !isCompositeNode &&
        (typedNode as any).provider_enabled && (
          <NewApiNodeModal
            open={showEditApiModal}
            onClose={() => setShowEditApiModal(false)}
            /* edit mode */ {...({} as any)}
            nodeId={typedNode.id}
          />
        )}

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le nœud</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
            <p>
              Êtes-vous sûr de vouloir supprimer ce nœud
              {typedNode ? ` « ${typedNode.label} »` : ""} ? Cette action est
              irréversible.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Cette suppression n’impacte pas ses nœuds parents ou enfants (les
              liens resteront, mais le nœud supprimé disparaîtra).
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePending}
            >
              {deletePending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .custom-scroll { scrollbar-gutter: stable both-edges; }
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
    </div>
  );
}
