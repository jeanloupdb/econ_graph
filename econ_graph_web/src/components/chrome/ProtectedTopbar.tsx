"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
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
    <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>{backLabel}</span>
            </Link>
          )}
          {backHref && (
            <span className="hidden h-6 w-px bg-zinc-200 sm:inline" />
          )}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-zinc-100"
            title="Aller à l'accueil"
          >
            <SmartGraphLogo size={32} />
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                SmartGraph
              </p>
              <p className="text-[11px] text-zinc-400">Workspace</p>
            </div>
          </Link>
          {title && (
            <>
              <span className="hidden h-6 w-px bg-zinc-200 sm:inline" />
              <p className="text-sm font-semibold text-zinc-900 truncate">{title}</p>
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
