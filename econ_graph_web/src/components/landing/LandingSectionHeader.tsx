"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface LandingSectionHeaderProps {
  badge: string;
  badgeIcon: LucideIcon;
  title: string;
  subtitle?: string;
}

export function LandingSectionHeader({ badge, badgeIcon: Icon, title, subtitle }: LandingSectionHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center mb-20 font-mono">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-6"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest shadow-sm">
          <Icon className="w-3 h-3 text-violet-400" />
          {badge}
        </span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-3xl md:text-5xl font-sans font-bold tracking-tight text-zinc-900 mb-6"
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-zinc-500 text-lg max-w-2xl mx-auto font-sans"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
