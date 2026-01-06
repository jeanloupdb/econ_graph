"use client";

import { cn } from "@/lib/utils";

interface SidebarContainerProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

export function SidebarContainer({ 
  children, 
  header, 
  footer, 
  className,
  scrollRef
}: SidebarContainerProps) {
  return (
    <div 
      id="settings-sidebar" 
      className={cn(
        "fixed top-[4.5rem] left-2 bottom-2 w-80 flex flex-col rounded-2xl border z-50 overflow-hidden animate-in slide-in-from-left-5 duration-300 transition-all",
        "bg-white/60 dark:bg-black/40 border-white/20 backdrop-blur-xl shadow-lg",
        className
      )}
    >
      {header && (
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 text-zinc-900 dark:text-zinc-100 border-white/10 dark:border-white/5">
          {header}
        </div>
      )}
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>

      {footer && (
        <div className="shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
}
