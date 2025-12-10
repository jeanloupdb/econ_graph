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

export function CanvasHelper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col items-start">
      <div className="w-64 rounded-xl border border-zinc-200/50 bg-white/90 backdrop-blur-md shadow-xl shadow-zinc-200/20 dark:border-zinc-800/50 dark:bg-zinc-950/90 dark:shadow-zinc-950/20 overflow-hidden">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Aide navigation
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${
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
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-start gap-3 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                    <Hand className="h-4 w-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Déplacer la vue
                    </p>
                    <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Clic gauche maintenu + glisser
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                    <Search className="h-4 w-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Zoomer
                    </p>
                    <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Molette de la souris (Scroll)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                    <Move className="h-4 w-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Déplacer un nœud
                    </p>
                    <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Glisser le nœud directement
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                    <MousePointer2 className="h-4 w-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
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
