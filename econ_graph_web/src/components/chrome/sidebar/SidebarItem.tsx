"use client";

import { cn } from "@/lib/utils";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { ReactNode } from "react";

interface SidebarItemProps {
  icon?: ReactNode;
  label: ReactNode;
  rightContent?: ReactNode;
  isSelected?: boolean;
  isActive?: boolean; // For scenarios where "active" is different from "selected"
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  className?: string;
  size?: "sm" | "xs";
  hasError?: boolean;
}

export function SidebarItem({
  icon,
  label,
  rightContent,
  isSelected,
  isActive,
  onClick,
  onDoubleClick,
  className,
  size = "sm",
  hasError
}: SidebarItemProps) {
  const { isLightMode } = useGraphTheme();
  
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded transition-colors cursor-pointer select-none border",
        // Size
        size === "sm" ? "py-1.5 px-2 text-sm" : "py-1.5 px-2 text-xs",
        // Selection / Active State
        isSelected
          ? isLightMode
            ? "bg-blue-100 border-blue-300 text-zinc-900"
            : "bg-zinc-800 border-zinc-700 text-zinc-100"
          : isActive
          ? isLightMode
            ? "bg-transparent border-transparent text-zinc-900 font-medium hover:bg-zinc-200/70"
            : "bg-transparent border-transparent text-zinc-100 font-medium hover:bg-white/5"
          : isLightMode
          ? "bg-transparent border-transparent text-zinc-800 hover:bg-zinc-200/70"
          : "bg-transparent border-transparent text-zinc-300 hover:bg-white/5",
         // Error state override
         hasError && !isSelected && "text-red-600 dark:text-red-400",
        className
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Icon */}
      {icon && (
        <div className={cn(
          "shrink-0 flex items-center justify-center",
          // Allow icon to size itself or enforce standard size? 
          // Usually better to let the passed icon control its size or enforce a container.
          // Let's enforce a container to ensure alignment.
          size === "sm" ? "w-4 h-4" : "w-3.5 h-3.5"
        )}>
          {icon}
        </div>
      )}

      {/* Label */}
      <div className="flex-1 truncate min-w-0">
        {label}
      </div>

      {/* Right Content */}
      {rightContent && (
        <div className="shrink-0 flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
}
