"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Layers } from "lucide-react";
import { useComposites } from "@/lib/api/hooks";
import { useInsertCompositeNode } from "@/graph/hooks/useInsertCompositeNode";
import { toast } from "sonner";

interface InsertCompositeModalProps {
  open: boolean;
  onClose: () => void;
  onCreateComposite?: () => void;
}

export function InsertCompositeModal({
  open,
  onClose,
  onCreateComposite,
}: InsertCompositeModalProps) {
  const { data: composites = [], isLoading } = useComposites();
  const insertCompositeNode = useInsertCompositeNode();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleInsert = async (id: string) => {
    if (pendingId) return;
    setPendingId(id);
    try {
      const node = await insertCompositeNode(id);
      toast.success(`Composite inséré : ${node.label}`);
      onClose();
    } catch (error: any) {
      toast.error(
        error?.message || "Impossible d'insérer ce composite dans le projet."
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Insérer un composite dans le projet</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sélectionnez un composite existant ou créez-en un nouveau pour
            l'utiliser comme nœud dans ce projet.
          </p>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement des composites…
            </div>
          ) : composites.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 dark:border-zinc-800 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Aucun composite disponible pour le moment.
              <div className="mt-4">
                <Button onClick={onCreateComposite}>
                  Créer un composite
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {composites.map((composite) => {
                const disabled = pendingId === composite.id;
                return (
                  <div
                    key={composite.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        <Layers className="h-4 w-4 text-blue-500" />
                        {composite.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Modifié le {new Date(composite.updated_at).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={disabled}
                      onClick={() => handleInsert(composite.id)}
                    >
                      {disabled ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Insertion…
                        </>
                      ) : (
                        "Insérer"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {onCreateComposite && composites.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onCreateComposite}
            >
              Créer un nouveau composite
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
