'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CompositeEditor } from '@/components/composites/CompositeEditor';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { COMPOSITE_TRANSFORM_BUFFER_KEY } from '@/lib/composites/constants';
import type { CompositeGraphData } from '@/lib/types';
import type { TransformCompositeSessionPayload } from '@/lib/composites/types';

export default function NewCompositePage() {
  const searchParams = useSearchParams();
  const queryName = useMemo(() => (searchParams?.get('name') || '').trim(), [searchParams]);
  const insertTargetProjectId = useMemo(() => {
    if (!searchParams) return null;
    const returnTo = searchParams.get('return');
    const projectId = (searchParams.get('project') || '').trim();
    return returnTo === 'graph' && projectId ? projectId : null;
  }, [searchParams]);
  const [name, setName] = useState(queryName);
  const [pendingName, setPendingName] = useState(queryName);
  const [dialogOpen, setDialogOpen] = useState(!queryName);
  const [initialGraphData, setInitialGraphData] = useState<CompositeGraphData | null>(null);
  const [transformContext, setTransformContext] = useState<TransformCompositeSessionPayload | null>(null);

  useEffect(() => {
    if (queryName) {
      setName(queryName);
      setPendingName(queryName);
      setDialogOpen(false);
    }
  }, [queryName]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(COMPOSITE_TRANSFORM_BUFFER_KEY);
    if (!raw) return;
    try {
      const payload: TransformCompositeSessionPayload = JSON.parse(raw);
      setInitialGraphData(payload.initialGraphData);
      setTransformContext(payload);
      const payloadName = (payload.initialName || '').trim();
      if (!queryName && payloadName) {
        setName(payloadName);
        setPendingName(payloadName);
        setDialogOpen(false);
      }
    } catch (error) {
      console.warn('Invalid transform payload', error);
    } finally {
      window.sessionStorage.removeItem(COMPOSITE_TRANSFORM_BUFFER_KEY);
    }
  }, [queryName]);

  const handleConfirm = () => {
    const trimmed = pendingName.trim();
    if (!trimmed) return;
    setName(trimmed);
    setDialogOpen(false);
  };

  const allowClose = name.trim().length > 0;

  return (
    <>
      {name.trim() ? (
        <CompositeEditor
          initialName={name.trim()}
          initialGraphData={initialGraphData}
          insertTargetProjectId={insertTargetProjectId}
          shouldInsertAfterReturn={!!insertTargetProjectId}
          transformContext={transformContext}
        />
      ) : (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black text-center text-zinc-600 dark:text-zinc-300">
          <div className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">Choisissez un nom pour votre composite</div>
          <p className="text-sm max-w-md">Définissez le nom dans la boîte de dialogue pour démarrer l’édition.</p>
        </div>
      )}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !allowClose) return;
          setDialogOpen(open);
          if (!open && !name.trim()) {
            setPendingName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nom du composite</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Nom</label>
            <Input
              value={pendingName}
              onChange={(e) => setPendingName(e.currentTarget.value)}
              placeholder="Bloc Inflation"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleConfirm} disabled={!pendingName.trim()}>
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
