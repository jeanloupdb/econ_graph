"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight, Download, Network, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

const STEPS = [
  {
    num: "01",
    numColor: "text-violet-400",
    icon: Sparkles,
    iconColor: "text-violet-400",
    iconBorder: "border-violet-700/60 bg-violet-500/[0.08]",
    glow: "from-violet-500/[0.09]",
    tag: "Génération IA",
    tagStyle: "text-violet-400 bg-violet-500/[0.09] border-violet-500/25",
    title: "Décrivez votre modèle",
    desc: "Expliquez votre problème en langage naturel. L'IA structure les variables, formules et dépendances.",
  },
  {
    num: "02",
    numColor: "text-blue-400",
    icon: Network,
    iconColor: "text-blue-400",
    iconBorder: "border-blue-700/60 bg-blue-500/[0.08]",
    glow: "from-blue-500/[0.09]",
    tag: "Cascade temps réel",
    tagStyle: "text-blue-400 bg-blue-500/[0.09] border-blue-500/25",
    title: "Le graphe se construit",
    desc: "Paramètres, calculs et résultats reliés entre eux. Modifiez un chiffre, tout recalcule en cascade.",
  },
  {
    num: "03",
    numColor: "text-emerald-400",
    icon: Download,
    iconColor: "text-emerald-400",
    iconBorder: "border-emerald-700/60 bg-emerald-500/[0.08]",
    glow: "from-emerald-500/[0.09]",
    tag: "Export Excel",
    tagStyle: "text-emerald-400 bg-emerald-500/[0.09] border-emerald-500/25",
    title: "Exportez en Excel",
    desc: "Comparez vos scénarios what-if côte à côte et téléchargez un fichier proprement mis en forme.",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="relative py-28 border-t border-white/[0.06] overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(to right, rgb(139,92,246) 1px, transparent 1px), linear-gradient(to bottom, rgb(139,92,246) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 lg:px-12 w-full">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 font-mono font-medium mb-5">
            Comment ça marche
          </p>
          <h2 className="text-[2rem] lg:text-[2.4rem] font-semibold tracking-[-0.025em] text-zinc-100 leading-[1.15]">
            De la description au fichier Excel.
            <br />
            <span className="text-zinc-400">En trois étapes.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {STEPS.map((step, i) => {
            const Icon: LucideIcon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.22, 0.61, 0.36, 1] }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 overflow-hidden flex flex-col group"
              >
                <div className={`h-32 flex items-center justify-center bg-gradient-to-b ${step.glow} to-transparent relative`}>
                  <div className={`absolute inset-0 bg-gradient-to-b ${step.glow} to-transparent opacity-0 group-hover:opacity-150 transition-opacity duration-500`} />
                  <div className={`w-11 h-11 rounded-xl border ${step.iconBorder} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${step.iconColor}`} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="px-6 pb-7 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <p className={`text-[11px] font-mono font-bold ${step.numColor}`}>{step.num}</p>
                    <div className="h-px flex-1 bg-zinc-700/50" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-100 mb-2.5 tracking-[-0.01em]">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-zinc-400 leading-relaxed flex-1">{step.desc}</p>
                  <div className="mt-6">
                    <span className={`text-[9px] font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded-md border ${step.tagStyle}`}>
                      {step.tag}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="flex flex-col items-center text-center gap-5"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <Link href="/register">
            <button className="group inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-900 font-medium text-[14px] rounded-lg hover:bg-white transition-colors">
              Essayer maintenant — c&apos;est gratuit
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
          <p className="text-zinc-500 text-[12px]">Sans carte bancaire · Export Excel inclus</p>
        </motion.div>
      </div>
    </section>
  );
}
