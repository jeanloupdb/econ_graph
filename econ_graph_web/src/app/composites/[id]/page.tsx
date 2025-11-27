'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { CompositeEditor } from '@/components/composites/CompositeEditor';
import { useComposite } from '@/lib/api/hooks';

export default function EditCompositePage() {
  const params = useParams<{ id: string }>();
  const compositeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const searchParams = useSearchParams();
  const insertTargetProjectId = (() => {
    if (!searchParams) return null;
    const returnTo = searchParams.get('return');
    const project = (searchParams.get('project') || '').trim();
    return returnTo === 'graph' && project ? project : null;
  })();
  const shouldInsertAfterReturn = searchParams?.get('insert') === '1';
  const {
    data: composite,
    isLoading,
    isError,
    error,
  } = useComposite(compositeId || null);

  if (!compositeId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        <AlertTriangle className="mr-2 h-5 w-5" />
        Identifiant de composite manquant.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Chargement du composite…
      </div>
    );
  }

  if (isError || !composite) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
        {error?.message || 'Impossible de charger ce composite.'}
      </div>
    );
  }

  return (
    <CompositeEditor
      initialComposite={composite}
      insertTargetProjectId={insertTargetProjectId}
      shouldInsertAfterReturn={shouldInsertAfterReturn && !!insertTargetProjectId}
    />
  );
}
