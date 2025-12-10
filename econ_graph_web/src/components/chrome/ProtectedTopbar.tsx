"use client";

import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";
import type { ReactNode } from "react";
import { UserMenu } from "./UserMenu";

interface ProtectedTopbarProps {
  title?: string;
  backHref?: string;
  backLabel?: string;
  rightSlot?: ReactNode;
}

export function ProtectedTopbar({
  title,
  backHref,
  backLabel = "Retour",
  rightSlot,
}: ProtectedTopbarProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>{backLabel}</span>
            </Link>
          )}
          {backHref && (
            <span className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-800 sm:inline" />
          )}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40"
            title="Aller à l'accueil"
          >
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-950">
              <Network className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                EconGraph
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Workspace</p>
            </div>
          </Link>
          {title && (
            <>
              <span className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-800 sm:inline" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{title}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {rightSlot}
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
