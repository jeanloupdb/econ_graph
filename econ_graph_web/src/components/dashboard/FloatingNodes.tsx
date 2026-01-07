"use client";

import { motion } from "framer-motion";

/**
 * Animated floating nodes background for the dashboard
 * Creates a visual representation of connected nodes
 */
export function FloatingNodes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated floating node cards */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${15 + (i % 3) * 30}%`,
            top: `${20 + Math.floor(i / 3) * 40}%`,
          }}
          animate={{
            y: [0, -10, 0, 10, 0],
            x: [0, 5, 0, -5, 0],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        >
          <div className="w-24 h-12 rounded-lg border border-zinc-800/50 bg-zinc-900/30 flex items-center justify-center">
            <div className="w-16 h-1.5 bg-zinc-800/50 rounded" />
          </div>
        </motion.div>
      ))}

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <motion.line
          x1="20%"
          y1="30%"
          x2="45%"
          y2="25%"
          stroke="currentColor"
          strokeWidth="1"
          className="text-violet-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 1 }}
        />
        <motion.line
          x1="45%"
          y1="25%"
          x2="70%"
          y2="35%"
          stroke="currentColor"
          strokeWidth="1"
          className="text-blue-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 1.5 }}
        />
        <motion.line
          x1="25%"
          y1="60%"
          x2="50%"
          y2="55%"
          stroke="currentColor"
          strokeWidth="1"
          className="text-emerald-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 2 }}
        />
      </svg>
    </div>
  );
}

