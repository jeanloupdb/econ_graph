"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function CallToAction() {
  return (
    <div className="relative w-full flex flex-col items-center justify-center py-32 px-6 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[100px]"
          animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.3 }}
        className="relative z-10 max-w-4xl w-full"
      >
        <div className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-2xl border border-white/20 dark:border-zinc-800 rounded-[2.5rem] p-8 md:p-16 text-center shadow-2xl overflow-hidden">
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
            
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold mb-8"
            >
                <Sparkles className="w-4 h-4" />
                <span>Commencez gratuitement</span>
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white mb-8 tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 dark:from-blue-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    À vous de jouer.
                </span>
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/register">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/25 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-[length:200%_auto] animate-gradient" />
                        <span className="relative z-10 flex items-center gap-2">
                            Générer mon modèle
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </motion.button>
                </Link>
            </div>
            
            {/* Decorative bottom text */}
            <div className="mt-8 text-sm text-zinc-400 dark:text-zinc-500">
                Gratuit pour commencer • Pas de carte requise
            </div>
        </div>
      </motion.div>
    </div>
  );
}
