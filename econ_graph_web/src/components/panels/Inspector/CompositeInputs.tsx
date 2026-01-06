"use client";

import type { CompositeRootInfo } from "@/lib/types";

interface CompositeInputsProps {
  compositeRoots?: CompositeRootInfo[] | null;
  compositeRootIds?: string[] | null;
}

export function CompositeInputs({
  compositeRoots,
  compositeRootIds,
}: CompositeInputsProps) {
  const items: CompositeRootInfo[] =
    (compositeRoots && compositeRoots.length > 0
      ? compositeRoots
      : (compositeRootIds || []).map((root) => ({
          id: root,
          slug: root,
          label: root,
        }))) || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-2 space-y-1.5">
      <div className="text-xs font-semibold">Entrées du composite</div>
      {items.map((root) => (
        <div
          key={`${root?.slug || root?.id}`}
          className="rounded border border-dashed border-zinc-200 dark:border-zinc-700 px-1.5 py-1 bg-white/80 dark:bg-zinc-900/30"
        >
          <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
            {root?.label || root?.slug || root?.id}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            {root?.slug && root?.slug !== root?.id
              ? `${root.slug} • ${root.id}`
              : root?.slug || root?.id}
          </div>
          {root?.unit && (
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Unité : {root.unit}
            </div>
          )}
          {root?.provider_url && (
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Source API : {root.provider_url}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
