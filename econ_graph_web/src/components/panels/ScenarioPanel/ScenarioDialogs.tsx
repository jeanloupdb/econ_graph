"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Scenario } from "@/lib/types";
import { Loader2 } from "lucide-react";
import type { OverrideTarget } from "./types";

export interface RenameScenarioDialogProps {
  open: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function RenameScenarioDialog({
  open,
  value,
  onValueChange,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: RenameScenarioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renommer le scénario</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          <div>Choisissez un nouveau nom pour ce scénario.</div>
          <Input
            value={value}
            autoFocus
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onConfirm();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting || !value.trim()}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Renommer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface DeleteScenarioDialogProps {
  open: boolean;
  scenario: Scenario | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function DeleteScenarioDialog({
  open,
  scenario,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: DeleteScenarioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer le scénario</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          Êtes-vous sûr de vouloir supprimer le scénario
          {scenario ? ` « ${scenario.name} »` : ""} ? Cette action est
          irréversible.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Supprimer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface DuplicateScenarioDialogProps {
  open: boolean;
  scenario: Scenario | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function DuplicateScenarioDialog({
  open,
  scenario,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: DuplicateScenarioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dupliquer le scénario</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          Voulez-vous dupliquer le scénario
          {scenario ? ` « ${scenario.name} »` : ""} ?
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Dupliquer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface NewScenarioDialogProps {
  open: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function NewScenarioDialog({
  open,
  value,
  onValueChange,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: NewScenarioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouveau scénario</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Donnez un nom à votre nouveau scénario.
          </div>
          <Input
            value={value}
            autoFocus
            placeholder="Nom du scénario"
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onConfirm();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting || !value.trim()}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface ModeChangeDialogProps {
  open: boolean;
  pendingChange: {
    targetKey: string;
    newMode: "value" | "formula";
    target: OverrideTarget;
  } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ModeChangeDialog({
  open,
  pendingChange,
  onOpenChange,
  onConfirm,
}: ModeChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le mode de calcul</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Voulez-vous vraiment changer le mode de calcul pour ce paramètre ?
            {pendingChange?.newMode === "formula" ? (
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                En passant en mode formule, la valeur sera calculée automatiquement selon
                l&apos;algorithme défini.
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                En passant en mode valeur directe, vous pourrez saisir manuellement la
                valeur du paramètre.
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm}>Confirmer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
