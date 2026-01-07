"use client";

import { motion } from "framer-motion";
import { ArrowRight, GitCompare, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import { NodeVisualization } from "./NodeVisualization";

const features = [
  {
    icon: Sparkles,
    title: "Décrivez, c'est généré",
    subtitle: "L'IA construit votre modèle économique automatiquement",
    color: "violet",
    vizIndex: 0,
  },
  {
    icon: Settings2,
    title: "Simulez des scénarios",
    subtitle: "Testez vos hypothèses et voyez l'impact en temps réel",
    color: "blue",
    vizIndex: 1,
  },
  {
    icon: GitCompare,
    title: "Comparez et décidez",
    subtitle: "Identifiez la meilleure stratégie avec certitude",
    color: "emerald",
    vizIndex: 2,
  },
];

// Stagger animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function MobileHero() {
  return (
    <div className="relative px-5 pt-20 pb-10">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-violet-500/[0.06] rounded-full blur-[100px]" />
      </div>

      <motion.div
        className="relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Modélisation IA
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-[1.75rem] font-semibold text-zinc-100 mb-4 leading-[1.15] tracking-[-0.02em]"
        >
          Simulez vos décisions{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-400">
            avant de les prendre
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="text-zinc-500 mb-7 text-[15px] leading-relaxed"
        >
          Décrivez un problème, l&apos;IA crée un modèle visuel. Ajustez les
          paramètres, voyez l&apos;impact en temps réel.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <Link href="/register" className="w-full">
            <button className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-zinc-100 text-zinc-900 font-medium text-[14px] rounded-lg hover:bg-white transition-colors">
              Commencer gratuitement
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </button>
          </Link>
          <Link href="/login" className="w-full">
            <button className="w-full px-5 py-2.5 text-zinc-500 hover:text-zinc-300 font-medium text-[14px] transition-colors">
              Se connecter
            </button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function MobileFeatures() {
  return (
    <div className="px-5 py-10 space-y-14">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        const colors = {
          violet: "text-violet-400 border-violet-500/20 bg-violet-500/10",
          blue: "text-blue-400 border-blue-500/20 bg-blue-500/10",
          emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
        };

        return (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Header */}
            <div className="text-center mb-5">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                  colors[feature.color as keyof typeof colors]
                } mb-4`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Étape {index + 1}</span>
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2 tracking-[-0.01em]">
                {feature.title}
              </h3>
              <p className="text-zinc-500 text-[14px]">{feature.subtitle}</p>
            </div>

            {/* Visualization */}
            <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
              <div className="min-h-[260px]">
                <NodeVisualization activeFeature={feature.vizIndex} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function MobileCTA() {
  return (
    <div className="px-5 py-14 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <h2 className="text-2xl font-semibold text-zinc-100 mb-3 tracking-[-0.01em]">
          À vous de jouer
        </h2>
        <p className="text-zinc-500 mb-7 text-[15px]">
          Créez votre premier modèle en quelques secondes
        </p>
        <Link href="/register">
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-900 font-medium text-[14px] rounded-lg hover:bg-white transition-colors">
            Générer mon modèle
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
        <p className="mt-4 text-zinc-600 text-[13px]">
          Gratuit · Pas de carte requise
        </p>
      </motion.div>
    </div>
  );
}
