"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";

interface AuthTopbarProps {
  backLink?: string;
  backLabel?: string;
}

export function AuthTopbar({ backLink = "/", backLabel = "Retour à l'accueil" }: AuthTopbarProps) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href={backLink} className="flex items-center gap-2 group">
          <ArrowLeft className="h-4 w-4 text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
            {backLabel}
          </span>
        </Link>
        <Link href="/" className="flex items-center gap-2 group">
          <SmartGraphLogo size={28} />
          <span className="text-lg font-bold text-zinc-900 dark:text-white">SmartGraph</span>
        </Link>
      </div>
    </div>
  );
}
