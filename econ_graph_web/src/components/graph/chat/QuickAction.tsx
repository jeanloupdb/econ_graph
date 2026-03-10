"use client";

export function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-800 rounded-md transition-colors border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 bg-zinc-100"
    >
      {label}
    </button>
  );
}
