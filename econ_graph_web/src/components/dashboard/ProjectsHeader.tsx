"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  LayoutGrid,
  LayoutList,
  PlusCircle,
  Search,
  Trash2,
  X,
} from "lucide-react";

type ViewMode = "list" | "grid";

interface ProjectsHeaderProps {
  projectCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onCreateNew: () => void;
}

export function ProjectsHeader({
  projectCount,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  onDeleteSelected,
  onClearSelection,
  onCreateNew,
}: ProjectsHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5"
    >
      <div className="flex items-center gap-3">
        <FolderOpen className="w-5 h-5 text-zinc-500" />
        <h1 className="text-lg font-medium text-white">Mes projets</h1>
        <span className="text-sm text-zinc-600">({projectCount})</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-9 pr-3 w-44 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>

        {/* Selection Actions */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700"
            >
              <span className="text-xs font-medium text-zinc-300">
                {selectedCount}
              </span>
              <button
                onClick={onDeleteSelected}
                className="p-1 text-red-400 hover:text-red-300 rounded transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClearSelection}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Toggle */}
        <div className="flex items-center border border-zinc-800 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange("list")}
            className={`px-2.5 py-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={`px-2.5 py-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* New project */}
        <button
          onClick={onCreateNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nouveau
        </button>
      </div>
    </motion.div>
  );
}

