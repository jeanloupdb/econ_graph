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
    <div className="flex flex-col items-center text-center mb-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-6"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-[13px] font-medium">
          <Icon className="w-3.5 h-3.5 text-violet-500" />
          {badge}
        </span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6"
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-zinc-500 text-lg max-w-2xl mx-auto"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
