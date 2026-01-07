"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarContainerProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
  /** Si true, utilise le positionnement absolu (ancien mode). Si false, s'adapte au conteneur parent (ResizablePanel) */
  useFixedPosition?: boolean;
  /** État collapsed */
  collapsed?: boolean;
  /** Callback pour toggle collapsed */
  onToggleCollapse?: () => void;
}

export function SidebarContainer({
  children,
  header,
  footer,
  className,
  scrollRef,
  useFixedPosition = false,
  collapsed = false,
  onToggleCollapse,
}: SidebarContainerProps) {
  return (
    <div className="relative h-full w-full overflow-visible">
      {/* Collapse/Expand button on right border - Linear style */}
      {onToggleCollapse && !collapsed && (
        <button
          onClick={onToggleCollapse}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -right-3 z-50",
            "flex items-center justify-center group",
            "w-6 h-12 rounded-r-md",
            "bg-white dark:bg-zinc-950",
            "border-r border-zinc-200 dark:border-zinc-800",
            "transition-all duration-200 shadow-sm"
          )}
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
        </button>
      )}
      {onToggleCollapse && collapsed && (
        <button
          onClick={onToggleCollapse}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 left-0 translate-x-1/2 z-50",
            "flex items-center justify-center",
            "w-6 h-12 rounded-md",
            "bg-white dark:bg-zinc-950",
            "border border-zinc-200 dark:border-zinc-800",
            "hover:bg-zinc-50 dark:hover:bg-zinc-900",
            "transition-all duration-200 shadow-sm"
          )}
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      )}

      <div
        id="settings-sidebar"
        onClick={collapsed && onToggleCollapse ? onToggleCollapse : undefined}
        className={cn(
          "flex flex-col overflow-hidden relative",
          collapsed
            ? "w-full bg-black dark:bg-black cursor-pointer hover:bg-zinc-800 transition-colors"
            : "bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800",
          useFixedPosition
            ? "fixed top-[4.5rem] left-2 bottom-2 w-80 z-50 rounded-2xl border shadow-lg animate-in slide-in-from-left-5"
            : "h-full w-full",
          className
        )}
      >
        {!collapsed && header && (
          <div className="px-3 py-3 border-b shrink-0 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800">
            {header}
          </div>
        )}

        <div
          ref={scrollRef}
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar",
            collapsed && "hidden"
          )}
        >
          {!collapsed && children}
        </div>

        {!collapsed && footer && <div className="shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
