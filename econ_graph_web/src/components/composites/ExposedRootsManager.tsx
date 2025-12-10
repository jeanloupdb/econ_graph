import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info, Save } from "lucide-react";
import { useState } from "react";

export interface CompositeRootInfo {
  id: string;
  slug: string;
  label: string;
  unit?: string | null;
  provider_url?: string | null;
  description?: string | null;
}

interface ExposedRootsManagerProps {
  missingSources: string[];
  exposedRoots: Record<string, CompositeRootInfo>;
  onUpdate: (roots: Record<string, CompositeRootInfo>) => void;
}

export function ExposedRootsManager({
  missingSources,
  exposedRoots,
  onUpdate,
}: ExposedRootsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompositeRootInfo | null>(null);

  const handleEdit = (id: string) => {
    const existing = exposedRoots[id] || {
      id,
      slug: id,
      label: id,
    };
    setEditForm(existing);
    setEditingId(id);
  };

  const handleSave = () => {
    if (!editForm || !editingId) return;
    onUpdate({
      ...exposedRoots,
      [editingId]: editForm,
    });
    setEditingId(null);
    setEditForm(null);
  };

  if (missingSources.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        Aucune racine exposée détectée.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        <Info className="h-4 w-4 text-blue-500" />
        Racines exposées (Inputs)
      </div>
      <div className="space-y-2">
        {missingSources.map((sourceId) => {
          const info = exposedRoots[sourceId] || {
            id: sourceId,
            slug: sourceId,
            label: sourceId,
          };
          const isEditing = editingId === sourceId;

          if (isEditing && editForm) {
            return (
              <div
                key={sourceId}
                className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20"
              >
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="label" className="text-xs">
                      Label
                    </Label>
                    <Input
                      id="label"
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm({ ...editForm, label: e.target.value })
                      }
                      className="h-8 bg-white dark:bg-zinc-950"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="desc" className="text-xs">
                      Description
                    </Label>
                    <Textarea
                      id="desc"
                      value={editForm.description || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      className="h-16 bg-white text-xs dark:bg-zinc-950"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Annuler
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="mr-1 h-3 w-3" />
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={sourceId}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {info.label}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  ID: {sourceId}
                </div>
                {info.description && (
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {info.description}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(sourceId)}
              >
                Éditer
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
