"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight, Download, Network, Sparkles, BrainCircuit, TableProperties, LineChart } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function HowItWorksBento() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="relative py-32 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
            De l'idée au <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">modèle structuré.</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            SmartGraph transforme votre langage naturel en un moteur de calcul puissant et visuel.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[240px]"
        >
          {/* Main Card - Big (Step 1) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 md:row-span-2 rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-sm p-8 flex flex-col justify-between group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
              <BrainCircuit size={240} className="text-violet-500" />
            </div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
                <Sparkles className="text-violet-400 w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">01. Décrivez votre modèle</h3>
              <p className="text-zinc-400 text-lg max-w-md">
                Expliquez votre business model comme vous le feriez à un collègue. Notre IA identifie instantanément les variables clés, les entrées et les sorties.
              </p>
            </div>

            <div className="relative z-10 mt-8">
              <div className="p-4 rounded-xl bg-zinc-950/50 border border-white/5 font-mono text-sm text-zinc-500 italic">
                "Je veux calculer la rentabilité de mon SaaS avec un abonnement à 29€, un CAC de 85€ et un churn de 3%..."
              </div>
            </div>
          </motion.div>

          {/* Side Card - Tall (Step 2) */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-sm p-8 flex flex-col group overflow-hidden relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
              <Network className="text-indigo-400 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">02. Cascade Temps Réel</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Le graphe de dépendances se construit dynamiquement. Chaque modification d'un paramètre recalcule l'ensemble de votre modèle instantanément.
            </p>
            <div className="mt-auto pt-6 flex justify-center">
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.1, 1],
                      borderColor: ["rgba(255,255,255,0.05)", "rgba(129,140,248,0.3)", "rgba(255,255,255,0.05)"]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    className="w-10 h-10 rounded-lg border border-white/5 bg-zinc-800/50"
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Bottom Side Card - Small (Step 3) */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-sm p-8 flex flex-col group overflow-hidden relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <Download className="text-emerald-400 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">03. Export Excel</h3>
            <p className="text-zinc-500 text-sm">
              Récupérez votre modèle proprement formaté avec toutes les formules Excel préservées.
            </p>
          </motion.div>

          {/* New Feature Card - Wide (Analysis) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 rounded-3xl border border-white/[0.08] bg-gradient-to-br from-violet-500/5 to-transparent p-8 flex items-center justify-between group overflow-hidden relative"
          >
            <div className="max-w-xs">
              <h3 className="text-xl font-bold text-white mb-2">Scénarios "What-if"</h3>
              <p className="text-zinc-400 text-sm">
                Comparez instantanément différentes hypothèses (pessimiste, normal, optimiste) côte à côte.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="w-24 h-32 rounded-xl bg-zinc-800/40 border border-white/5 overflow-hidden p-3">
                <div className="h-2 w-full bg-zinc-700/50 rounded mb-2" />
                <div className="h-12 w-full bg-violet-500/20 rounded mb-2" />
                <div className="h-2 w-2/3 bg-zinc-700/50 rounded" />
              </div>
              <div className="w-24 h-32 rounded-xl bg-zinc-800/40 border border-white/5 overflow-hidden p-3 mt-4">
                <div className="h-2 w-full bg-zinc-700/50 rounded mb-2" />
                <div className="h-16 w-full bg-indigo-500/20 rounded mb-2" />
                <div className="h-2 w-1/2 bg-zinc-700/50 rounded" />
              </div>
            </div>
          </motion.div>

          {/* CTA Card */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl bg-zinc-100 p-8 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-white transition-colors"
          >
            <Link href="/register" className="flex flex-col items-center">
              <span className="text-zinc-900 font-bold text-lg mb-2">Prêt à modéliser ?</span>
              <div className="flex items-center gap-2 text-violet-600 font-semibold">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
