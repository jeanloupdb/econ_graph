"use client";

import { motion } from "framer-motion";
import { Download, Network, Sparkles, ArrowRight } from "lucide-react";
import { LandingSectionHeader } from "./LandingSectionHeader";
import Link from "next/link";

const STEPS = [
  {
    icon: Sparkles,
    title: "Décrivez votre modèle",
    description: "Expliquez votre business model en langage naturel. L'IA structure instantanément les variables et les formules.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    icon: Network,
    title: "Le graphe se construit",
    description: "Visualisez les dépendances entre vos données. Modifiez un paramètre, tout recalcule en cascade.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    icon: Download,
    title: "Exportez en Excel",
    description: "Récupérez un fichier Excel parfaitement formaté avec toutes les formules préservées.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  }
];

export function HowItWorksLinear() {
  return (
    <section className="relative py-32 overflow-hidden border-t border-zinc-100 bg-[#FAFAFA]" id="methode">
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <LandingSectionHeader
          badge="Méthodologie"
          badgeIcon={Network}
          title="De l'idée au fichier Excel."
          subtitle="Une approche en trois étapes pour transformer votre vision en moteur de calcul."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connection lines (desktop) */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent z-0" />

          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                duration: 0.8,
                delay: i * 0.15,
                ease: [0.21, 0.47, 0.32, 0.98]
              }}
              className="relative z-10 flex flex-col items-center text-center group font-mono"
            >
              <div className={`w-16 h-16 rounded ${step.bg} border ${step.border} flex items-center justify-center mb-8 shadow-sm transition-transform duration-500 group-hover:scale-105`}>
                <step.icon className={`w-8 h-8 ${step.color}`} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 mb-2 tracking-[0.2em]">STEP 0{i+1}</span>
              <h3 className="text-lg font-bold text-zinc-900 mb-4 font-sans">{step.title}</h3>
              <p className="text-zinc-500 leading-relaxed text-sm font-sans px-4">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mt-24 p-12 rounded border border-zinc-200 bg-white text-center relative overflow-hidden group shadow-xl shadow-zinc-200"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-violet-50/10 to-transparent pointer-events-none" />

          <h3 className="text-2xl md:text-3xl font-sans font-bold text-zinc-900 mb-6 tracking-tight">Prêt à simplifier vos calculs ?</h3>
          <p className="text-zinc-500 mb-10 max-w-xl mx-auto font-sans text-lg">
            Rejoignez les entrepreneurs et analystes qui utilisent SmartGraph pour modéliser plus vite.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <button className="group flex items-center gap-3 px-10 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded transition-all shadow-lg text-xs uppercase tracking-widest">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>

          <p className="mt-8 text-[11px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Gratuit · Sans carte bancaire · Export Excel inclus</p>
        </motion.div>
      </div>
    </section>
  );
}
