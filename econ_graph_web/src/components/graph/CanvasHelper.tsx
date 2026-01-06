"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronDown,
    Hand,
    MousePointer2,
    Move,
    Search
} from "lucide-react";
import { useState } from "react";

export function CanvasHelper({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={className || "absolute bottom-2 right-2 z-10 flex flex-col items-end"}>
      <div className={`w-full rounded-2xl border border-white/20 bg-white/60 backdrop-blur-xl shadow-lg dark:bg-black/40 overflow-hidden transition-all duration-300 ${!className ? "w-64" : ""}`}>
        {/* Header - Always visible */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/20 dark:hover:bg-white/5"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Aide navigation
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${
              isOpen ? "" : "-rotate-90"
            }`}
          />
        </button>

        {/* Content - Collapsible */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-white/10 dark:border-white/5">
                <div className="flex items-start gap-3 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/40 dark:bg-white/10 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/20 transition-colors">
                    <Hand className="h-4 w-4 text-zinc-600 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      Déplacer la vue
                    </p>
                    <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Clic gauche maintenu + glisser
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/40 dark:bg-white/10 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/20 transition-colors">
                    <Search className="h-4 w-4 text-zinc-600 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      Zoomer
                    </p>
                    <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Molette de la souris (Scroll)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/40 dark:bg-white/10 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/20 transition-colors">
                    <Move className="h-4 w-4 text-zinc-600 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      Déplacer un nœud
                    </p>
                    <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Glisser le nœud directement
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/40 dark:bg-white/10 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/20 transition-colors">
                    <MousePointer2 className="h-4 w-4 text-zinc-600 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      Sélectionner
                    </p>
                    <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Clic simple sur un nœud
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
