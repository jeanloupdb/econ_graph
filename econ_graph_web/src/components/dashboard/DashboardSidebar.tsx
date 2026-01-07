"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { TEMPLATES } from "./DashboardEmptyState";

interface DashboardSidebarProps {
  projectCount: number;
  onTemplateClick: (prompt: string) => void;
}

export function DashboardSidebar({
  projectCount,
  onTemplateClick,
}: DashboardSidebarProps) {
  return (
    <div className="hidden lg:flex flex-col gap-4">
      {/* Quick create */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-medium text-zinc-300">
            Création rapide
          </h3>
        </div>
        <p className="text-xs text-zinc-500 mb-3">
          Générez un modèle complet en un clic
        </p>
        <div className="space-y-2">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => onTemplateClick(template.prompt)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-800/30 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-white transition-all text-left group"
              >
                <Icon className="w-4 h-4 flex-shrink-0 group-hover:text-violet-400 transition-colors" />
                <div className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{template.name}</span>
                  <span className="block text-[11px] text-zinc-600 truncate">{template.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30"
      >
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Vue d&apos;ensemble</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Projets actifs</span>
            <span className="text-sm font-semibold text-white">{projectCount}</span>
          </div>
          <div className="h-px bg-zinc-800" />
          <p className="text-[11px] text-zinc-600">
            Utilisez la barre IA en bas pour créer de nouveaux modèles
          </p>
        </div>
      </motion.div>
    </div>
  );
}

