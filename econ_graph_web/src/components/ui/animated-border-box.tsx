"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ACCENT_A = "#7C3AED";
const ACCENT_B = "#3B82F6";

type AnimatedBorderBoxProps = {
  variant?: "partial" | "full";
  hoverVariant?: "partial" | "full";
  spin?: boolean;
  hovered?: boolean;
  alignOnHover?: boolean;
  speed?: number;
  radius?: number;
  thickness?: number;
  surfaceColor: string;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
};

export function AnimatedBorderBox({
  variant = "full",
  hoverVariant,
  spin = true,
  hovered = false,
  alignOnHover = false,
  speed = 18,
  radius = 24,
  thickness = 4,
  surfaceColor,
  className,
  innerClassName,
  children,
}: AnimatedBorderBoxProps) {
  const partialGradient = `conic-gradient(from 0deg,
    ${surfaceColor} 0deg 235deg,
    ${ACCENT_A} 235deg 300deg,
    ${ACCENT_B} 300deg 330deg,
    ${surfaceColor} 330deg 360deg
  )`;
  const fullGradient = `conic-gradient(from 0deg, ${ACCENT_A}, ${ACCENT_B}, ${ACCENT_A})`;
  const effectiveVariant =
    hovered && hoverVariant ? hoverVariant : variant;
  const gradient =
    effectiveVariant === "full" ? fullGradient : partialGradient;
  const alignNow = alignOnHover && hovered;
  const spinActive = spin && !alignNow;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ borderRadius: radius }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          background: gradient,
          willChange: "transform",
        }}
        initial={{ rotate: 0 }}
        animate={{ rotate: spinActive ? 360 : 0 }}
        transition={
          spinActive
            ? { duration: speed, repeat: Infinity, ease: "linear" }
            : { duration: 0.45, ease: "easeOut" }
        }
      />
      <div
        className={cn("relative", innerClassName)}
        style={{
          margin: thickness,
          borderRadius: Math.max(radius - thickness, 0),
          backgroundColor: surfaceColor,
        }}
      >
        {children}
      </div>
    </div>
  );
}
