import { useEffect, useRef, useState } from "react";

/**
 * Detects when a numeric value changes and returns a transient flag
 * that stays true for `durationMs` (default 700ms).
 *
 * When `isLoading` is provided, the animation is deferred:
 * - While loading, value changes are tracked silently (no animation)
 * - When loading ends, if the value differs from before loading started,
 *   the animation fires so the user sees the change after the spinner.
 */
export function useValueChanged(
  value: number | null | undefined,
  isLoading?: boolean,
  durationMs = 700
): { changed: boolean; direction: "up" | "down" | null } {
  // Value snapshot from before loading started
  const preLoadValueRef = useRef<number | null | undefined>(value);
  // Whether we were loading on the previous render
  const wasLoadingRef = useRef(false);
  const [changed, setChanged] = useState(false);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Case 1: loading just started → snapshot current value
    if (isLoading && !wasLoadingRef.current) {
      preLoadValueRef.current = value;
      wasLoadingRef.current = true;
      return;
    }

    // Case 2: still loading → do nothing, just track loading state
    if (isLoading) {
      return;
    }

    // Case 3: loading just ended (or no loading involved) → compare & animate
    const prev = wasLoadingRef.current ? preLoadValueRef.current : preLoadValueRef.current;
    wasLoadingRef.current = false;

    if (prev === undefined || prev === null || value === null || value === undefined) {
      preLoadValueRef.current = value;
      return;
    }
    if (Math.abs(prev - value) < 1e-9) {
      preLoadValueRef.current = value;
      return;
    }

    // Value changed → fire animation
    preLoadValueRef.current = value;
    setChanged(true);
    setDirection(value > prev ? "up" : "down");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setChanged(false);
      setDirection(null);
    }, durationMs);
  }, [value, isLoading, durationMs]);

  return { changed, direction };
}
