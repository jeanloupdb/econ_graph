"use client";

import { motion } from "framer-motion";

interface SubtleBackgroundProps {
  variant?: "default" | "blue" | "amber" | "emerald";
  showGrid?: boolean;
}

export function SubtleBackground({ variant = "default", showGrid = true }: SubtleBackgroundProps) {
  const colors = {
    default: {
      primary: "from-zinc-200/40 dark:from-zinc-800/20",
      secondary: "from-zinc-300/40 dark:from-zinc-700/20",
    },
    blue: {
      primary: "from-blue-200/40 dark:from-blue-900/20",
      secondary: "from-indigo-200/40 dark:from-indigo-900/20",
    },
    amber: {
      primary: "from-amber-200/40 dark:from-amber-900/20",
      secondary: "from-orange-200/40 dark:from-orange-900/20",
    },
    emerald: {
      primary: "from-emerald-200/40 dark:from-emerald-900/20",
      secondary: "from-teal-200/40 dark:from-teal-900/20",
    },
  };

  const selectedColor = colors[variant];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base Grid */}
      {showGrid && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808015_1px,transparent_1px),linear-gradient(to_bottom,#80808015_1px,transparent_1px)] bg-[size:24px_24px]" />
      )}

      {/* Drifting Orbs */}
      <motion.div
        className={`absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-gradient-to-br ${selectedColor.primary} to-transparent blur-[120px] opacity-60 dark:opacity-40`}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className={`absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr ${selectedColor.secondary} to-transparent blur-[100px] opacity-50 dark:opacity-30`}
        animate={{
          x: [0, -30, 0],
          y: [0, -50, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
    </div>
  );
}
