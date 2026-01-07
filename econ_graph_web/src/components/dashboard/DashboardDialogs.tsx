"use client";

import { ShareProjectModal } from "@/components/modals/ShareProjectModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertTriangle, FolderPlus, Pencil, Trash2 } from "lucide-react";

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  onSubmit,
}: CreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800/50 shadow-2xl shadow-black/50">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
            <FolderPlus className="w-6 h-6 text-violet-400" />
          </div>
          <DialogTitle className="text-white text-center text-lg">
            Nouveau projet
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-center text-sm">
            Créez un nouveau modèle économique vierge
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <label className="text-sm font-medium text-zinc-400">
            Nom du projet
          </label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.currentTarget.value)}
            placeholder="Mon modèle économique"
            className="bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-violet-500/20"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onSubmit();
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Annuler
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!name.trim()}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            Créer le projet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
}

export function RenameProjectDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  onSubmit,
}: RenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800/50 shadow-2xl shadow-black/50">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-blue-400" />
          </div>
          <DialogTitle className="text-white text-center text-lg">
            Renommer le projet
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <label className="text-sm font-medium text-zinc-400">
            Nouveau nom
          </label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.currentTarget.value)}
            className="bg-zinc-800/50 border-zinc-700/50 text-white focus:border-blue-500/50 focus:ring-blue-500/20"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onSubmit();
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Annuler
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!name.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onConfirm: () => void;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  projectName,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800/50 shadow-2xl shadow-black/50">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <DialogTitle className="text-white text-center text-lg">
            Supprimer le projet
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-center text-sm">
            Cette action est irréversible. Le projet et toutes ses données
            seront définitivement supprimés.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <p className="text-sm text-zinc-300 text-center">
              Vous allez supprimer{" "}
              <strong className="text-white">&quot;{projectName}&quot;</strong>
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500"
          >
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: () => void;
}

export function BatchDeleteDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
}: BatchDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800/50 shadow-2xl shadow-black/50">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <DialogTitle className="text-white text-center text-lg">
            Supprimer {count} projet{count > 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-center text-sm">
            Cette action est irréversible. Tous les projets sélectionnés et
            leurs données seront définitivement supprimés.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <p className="text-sm text-zinc-300 text-center">
              <strong className="text-white">{count}</strong> projet
              {count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500"
          >
            Supprimer la selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function ShareDialog({
  open,
  onClose,
  projectId,
  projectName,
}: ShareDialogProps) {
  if (!open) return null;
  return (
    <ShareProjectModal
      open={open}
      onClose={onClose}
      projectId={projectId}
      projectName={projectName}
    />
  );
}
