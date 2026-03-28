"use client";

import { cn } from "@/lib/utils";
import { useEffect, useId, useState } from "react";

interface SmartGraphLogoProps {
  className?: string;
  size?: number;
  loading?: boolean;
  forceHover?: boolean;
}

// ── Left shape paths ───────────────────────────────────────────────────────────
const circleLeft =
  "M 1.5 12 C 1.5 9.5 3.5 7.5 6 7.5 C 8.5 7.5 10.5 9.5 10.5 12 C 10.5 14.5 8.5 16.5 6 16.5 C 3.5 16.5 1.5 14.5 1.5 12 Z";
const triangleLeft =
  "M 11.5 6 C 11 8 10 10 10 12 C 10 14 11 16 11.5 18 C 7 15 2 12 2 12 C 2 12 7 9 11.5 6 Z";
const arrowInLeft =
  "M 2 7 C 2 7 3 10 3 12 C 3 14 2 17 2 17 C 6 15 11 12 11 12 C 11 12 6 9 2 7 Z";

// ── Right shape paths ──────────────────────────────────────────────────────────
const triangleRight =
  "M 12.5 6 C 13 8 14 10 14 12 C 14 14 13 16 12.5 18 C 17 15 22 12 22 12 C 22 12 17 9 12.5 6 Z";
const circleRight =
  "M 13.5 12 C 13.5 9.5 15.5 7.5 18 7.5 C 20.5 7.5 22.5 9.5 22.5 12 C 22.5 14.5 20.5 16.5 18 16.5 C 15.5 16.5 13.5 14.5 13.5 12 Z";
const arrowInRight =
  "M 22 7 C 22 7 21 10 21 12 C 21 14 22 17 22 17 C 18 15 13 12 13 12 C 13 12 18 9 22 7 Z";

// 3 states: ●▶  /  ◀●  /  ▶◀ (both inward)
const STATES = [
  { left: circleLeft,   right: triangleRight },
  { left: triangleLeft, right: circleRight   },
  { left: arrowInLeft,  right: arrowInRight  },
] as const;

export function SmartGraphLogo({ className, size = 24, loading = false, forceHover = false }: SmartGraphLogoProps) {
  const uid = useId().replace(/:/g, "");
  const [stateIndex, setStateIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setStateIndex(0);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = 500 + Math.random() * 2500; // random 0.5s → 3s
      timer = setTimeout(() => {
        setStateIndex((prev) => (prev + 1) % STATES.length);
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timer);
  }, [loading]);

  const { left, right } = loading
    ? STATES[stateIndex]
    : forceHover
      ? { left: triangleLeft, right: circleRight }
      : STATES[0];
  const L = `.sg-l-${uid}`;
  const R = `.sg-r-${uid}`;
  const W = `.sg-w-${uid}`;

  return (
    <>
      <style>{`
        ${L} { d: path("${left}");  transition: d 0.45s cubic-bezier(0.4, 0, 0.2, 1); }
        ${R} { d: path("${right}"); transition: d 0.45s cubic-bezier(0.4, 0, 0.2, 1); }
        /* Hover (static mode only) */
        ${W}:not(.sg-loading):hover ${L} { d: path("${triangleLeft}"); }
        ${W}:not(.sg-loading):hover ${R} { d: path("${circleRight}"); }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={cn(`sg-w-${uid}`, loading && "sg-loading", className)}
      >
        <path className={`sg-l-${uid}`} fill="#3B82F6" d={left}  />
        <path className={`sg-r-${uid}`} fill="#8B5CF6" d={right} />
      </svg>
    </>
  );
}
