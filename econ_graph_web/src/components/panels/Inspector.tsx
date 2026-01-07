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
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
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
  const { isLightMode } = useGraphTheme();
  const data = useInspectorData();

  const {
    inspectorOpen,
    edgeViewProps,
    headerProps,
    panelStack,
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
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    handleDelete,
    deletePending,
    selectedNodeId,
    scrollRef,
    smartFixOpen,
    setSmartFixOpen,
    handleApplySmartFix,
    errorInputNodes,
    onNavigate,
  } = data;

  if (!inspectorOpen) {
    return null;
  }

  if (edgeViewProps) {
    return <EdgeInspector {...edgeViewProps} />;
  }

  return (
    <SidebarContainer
      useFixedPosition={false}
      className="z-40 bg-transparent"
      scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
      header={
        <InspectorHeader
          {...headerProps}
          className={cn(
            "w-full",
            isLightMode
              ? "text-zinc-900 border-zinc-300"
              : "text-zinc-100 border-white/[0.06]"
          )}
        />
      }
    >
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2
            className={cn(
              "h-4 w-4 animate-spin",
              isLightMode ? "text-zinc-500" : "text-zinc-400"
            )}
          />
        </div>
      )}

      {isError && (
        <div
          className={cn(
            "p-2 rounded border text-xs flex items-start justify-between gap-2",
            isLightMode
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-red-900 bg-red-950/30 text-red-300"
          )}
        >
          <div>
            <div className="font-medium mb-0.5">Erreur lors du chargement</div>
            <div className="text-[11px]">
              Impossible de charger le nœud {selectedNodeId}.{" "}
              {error instanceof Error ? error.message : ""}
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
            <CollapsibleSection
              title="Valeur"
              defaultOpen={true}
              noPadding={true}
            >
              <ValueCard {...valueCardProps} />
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

          {algorithmProps && (
            <CollapsibleSection title="Algorithme" defaultOpen={false}>
              <AlgorithmBlock {...algorithmProps} />
            </CollapsibleSection>
          )}

          {providerProps && (
            <CollapsibleSection
              title="Provider"
              defaultOpen={false}
              noPadding={true}
            >
              <ProviderBlock {...providerProps} />
            </CollapsibleSection>
          )}

          {directDependenciesProps && (
            <CollapsibleSection
              title="Dépendances"
              defaultOpen={false}
              noPadding={true}
            >
              <DependenciesList {...directDependenciesProps} />
            </CollapsibleSection>
          )}

          {compositeInputsProps && (
            <CollapsibleSection
              title="Entrées Composite"
              defaultOpen={false}
              noPadding={true}
            >
              <CompositeInputs {...compositeInputsProps} />
            </CollapsibleSection>
          )}

          {rootDependenciesProps && (
            <CollapsibleSection
              title="Dépendances Racines"
              defaultOpen={false}
              noPadding={true}
            >
              <DependenciesList {...rootDependenciesProps} />
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
        <p
          className={cn(
            "text-xs p-4",
            isLightMode ? "text-zinc-800" : "text-zinc-500"
          )}
        >
          Nœud introuvable
        </p>
      )}

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent
          className={cn(
            "border",
            isLightMode
              ? "bg-white border-zinc-200"
              : "bg-zinc-900 border-zinc-800"
          )}
        >
          <DialogHeader>
            <DialogTitle
              className={cn(
                "text-base",
                isLightMode ? "text-zinc-900" : "text-zinc-100"
              )}
            >
              Supprimer le nœud
            </DialogTitle>
          </DialogHeader>
          <div
            className={cn(
              "text-xs space-y-1.5",
              isLightMode ? "text-zinc-800" : "text-zinc-300"
            )}
          >
            <p>
              Êtes-vous sûr de vouloir supprimer ce nœud
              {typedNode ? ` « ${typedNode.label} »` : ""} ? Cette action est
              irréversible.
            </p>
            <p
              className={cn(
                "text-[11px]",
                isLightMode ? "text-zinc-700" : "text-zinc-400"
              )}
            >
              Cette suppression n&apos;impacte pas ses nœuds parents ou enfants
              (les liens resteront, mais le nœud supprimé disparaîtra).
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
        .custom-scroll::-webkit-scrollbar-thumb { 
          background: ${
            isLightMode ? "rgba(82, 82, 91, 0.5)" : "rgba(100,100,100,.35)"
          }; 
          border-radius: 8px; 
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover { 
          background: ${
            isLightMode ? "rgba(82, 82, 91, 0.7)" : "rgba(100,100,100,.5)"
          }; 
        }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {typedNode && (
        <SmartFixDialog
          isOpen={smartFixOpen}
          onClose={() => setSmartFixOpen(false)}
          nodeId={typedNode.id}
          currentCode={typedNode.computation_definition || ""}
          errorTrace={typedNode.computation_error || ""}
          onApplyFix={handleApplySmartFix}
          errorInputNodes={errorInputNodes}
          onNavigate={onNavigate}
        />
      )}
    </SidebarContainer>
  );
}
