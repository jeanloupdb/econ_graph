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
    title: "Tout se connecte automatiquement",
    description: "Visualisez comment vos chiffres s'influencent entre eux. Modifiez un paramètre, tout recalcule instantanément.",
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
    <section className="relative py-32 overflow-hidden border-t border-zinc-100 bg-white" id="methode">
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <LandingSectionHeader
          badge="Comment ça marche"
          badgeIcon={Network}
          title="De l'idée au fichier Excel."
          subtitle="Trois étapes pour passer de votre question à une réponse chiffrée et actionnable."
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
              className="relative z-10 flex flex-col items-center text-center group"
            >
              <div className={`w-16 h-16 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center mb-8 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <step.icon className={`w-8 h-8 ${step.color}`} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-4">{step.title}</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
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
          className="mt-24 p-12 rounded-[2rem] border border-zinc-200 bg-[#f5f5f7] text-center relative overflow-hidden group shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-violet-50/30 to-transparent pointer-events-none" />

          <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-6">Prêt à prendre de meilleures décisions ?</h3>
          <p className="text-zinc-500 mb-10 max-w-xl mx-auto">
            Rejoignez les entrepreneurs, consultants et gérants qui pilotent leur activité avec SmartGraph.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <button className="group flex items-center gap-2 px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-lg transition-all">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>

          <p className="mt-6 text-xs text-zinc-400">Gratuit · Sans carte bancaire · Export Excel inclus</p>
        </motion.div>
      </div>
    </section>
  );
}
