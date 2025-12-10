import type { NodeToneKey } from "@/lib/api/hooks";
import type { Node } from "@/lib/types";

export type TonePalette = { bg: string; border: string; text: string };

export const DEFAULT_TONE_COLORS: Record<NodeToneKey, TonePalette> = {
  root: { bg: "#fef3c7", border: "#fbbf24", text: "#92400e" },
  leaf: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  intermediate: { bg: "#e0f2fe", border: "#3b82f6", text: "#1e3a8a" },
  error: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
};

export const FALLBACK_TONE_PALETTE: TonePalette = {
  bg: "#f4f4f5",
  border: "#d4d4d8",
  text: "#27272a",
};

export const TONE_BADGE_CLASS_MAP: Record<
  NodeToneKey,
  string
> = {
  root: "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:border-amber-600/70 dark:text-amber-200",
  leaf: "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-600/70 dark:text-emerald-100",
  intermediate: "bg-sky-50 border-sky-300 text-sky-900 dark:bg-sky-950/30 dark:border-sky-600/70 dark:text-sky-100",
  error: "bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/30 dark:border-rose-600/70 dark:text-rose-100",
};

export function resolveTonePalette(
  tone: NodeToneKey | null | undefined,
  themePalette?: Record<string, TonePalette>
): TonePalette {
  if (tone && themePalette && themePalette[tone]) {
    return themePalette[tone]!;
  }
  if (tone && DEFAULT_TONE_COLORS[tone]) {
    return DEFAULT_TONE_COLORS[tone];
  }
  return FALLBACK_TONE_PALETTE;
}

export function getBadgeToneClasses(
  tone: NodeToneKey | null | undefined,
  options?: { used?: boolean }
): string {
  const base =
    (tone && TONE_BADGE_CLASS_MAP[tone]) ||
    "bg-zinc-50 border-zinc-300 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200";
  const emphasis = options?.used
    ? "shadow-inner ring-1 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900"
    : "";
  return `${base} ${emphasis}`.trim();
}

export function isCompositeNode(node?: Node | null): boolean {
  return Boolean(node?.composite_id);
}
