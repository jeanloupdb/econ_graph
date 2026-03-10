"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { AiContextButton } from "./AiContextButton";
import { useUIStore } from "@/store/uiState";
import { AiContextInfo, getAiTargetKey } from "@/types/ai-context";

interface AiActionableAreaProps {
  children: React.ReactNode;
  context: AiContextInfo;
  className?: string;
  isLightMode?: boolean;
}

export function AiActionableArea({
  children,
  context,
  className,
  isLightMode = false
}: AiActionableAreaProps) {
  const [isHovered, setIsHovered] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const aiFocusTarget = useUIStore((s) => s.aiFocusTarget);
  const clearAiFocusTarget = useUIStore((s) => s.clearAiFocusTarget);
  const targetKey = context.target ? getAiTargetKey(context.target) : null;

  useEffect(() => {
    if (!aiFocusTarget || !targetKey) return;
    const focusKey = getAiTargetKey(aiFocusTarget.target);
    if (focusKey !== targetKey) return;
    const element = areaRef.current;
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusClasses = isLightMode ? "ring-2 ring-violet-300/70" : "ring-2 ring-violet-500/50";
    focusClasses.split(" ").forEach((cls) => element.classList.add(cls));
    const timeoutId = window.setTimeout(() => {
      focusClasses.split(" ").forEach((cls) => element.classList.remove(cls));
    }, 1200);
    clearAiFocusTarget();
    return () => {
      window.clearTimeout(timeoutId);
      focusClasses.split(" ").forEach((cls) => element.classList.remove(cls));
    };
  }, [aiFocusTarget, targetKey, clearAiFocusTarget, isLightMode]);

  return (
    <div
        ref={areaRef}
        className={cn(
            "relative group/ai-area",
            className
        )}
        data-ai-target={targetKey || undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
        {/* Content */}
        {children}

        {/* Floating Action Buttons */}
        <div className={cn(
            "absolute -top-3 -right-3 z-50 transition-all duration-200",
            isHovered
                ? "opacity-100 scale-100"
                : "opacity-0 scale-90 pointer-events-none"
        )}>
             <AiContextButton
                context={context}
                isLightMode={isLightMode}
             />
        </div>
    </div>
  );
}
