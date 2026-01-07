"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight, GitCompare, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import { MobileCTA, MobileFeatures, MobileHero } from "./HeroMobile";
import { HeroVisual } from "./HeroVisual";
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

// Stagger animation for children
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function HeroSection() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden min-h-screen bg-zinc-950">
        <MobileHero />
        <MobileFeatures />
        <MobileCTA />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block bg-zinc-950">
        {/* Noise texture overlay */}
        <div
          className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background grid pattern - violet tinted for hero */}
          <div
            className="absolute inset-0 opacity-[0.03] z-[2]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgb(139, 92, 246) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(139, 92, 246) 1px, transparent 1px)
              `,
              backgroundSize: "64px 64px",
            }}
          />

          {/* Background visual */}
          <div className="absolute inset-0 hidden lg:block overflow-hidden z-0">
            <HeroVisual />
          </div>

          <div className="relative z-30 w-full px-6 lg:px-12 xl:px-20">
            <motion.div
              className="max-w-xl"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Badge */}
              <motion.div variants={itemVariants} className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[13px] font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Modélisation IA
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={itemVariants}
                className="text-[2.75rem] lg:text-[3.25rem] xl:text-[3.75rem] font-semibold text-zinc-100 leading-[1.08] tracking-[-0.02em] mb-5"
              >
                Simulez vos décisions
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-400">
                  avant de les prendre
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                variants={itemVariants}
                className="text-[17px] text-zinc-500 leading-relaxed mb-8 max-w-md"
              >
                Décrivez un problème, l&apos;IA crée un modèle visuel.
                <br />
                Ajustez les paramètres, voyez l&apos;impact en temps réel.
              </motion.p>

              {/* CTA */}
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-3"
              >
                <Link href="/register">
                  <button className="group flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-900 font-medium text-[14px] rounded-lg hover:bg-white transition-all">
                    Commencer gratuitement
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </Link>
                <Link href="/login">
                  <button className="px-4 py-2.5 text-zinc-500 hover:text-zinc-300 font-medium text-[14px] transition-colors">
                    Se connecter
                  </button>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-8 rounded-full border border-zinc-700/60 flex items-start justify-center p-1.5"
            >
              <div className="w-0.5 h-1.5 rounded-full bg-zinc-600" />
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Sections */}
        {features.map((feature, index) => (
          <FeatureSection key={feature.title} feature={feature} index={index} />
        ))}

        {/* Final CTA */}
        <section className="relative py-32 overflow-hidden">
          {/* Background grid pattern - warm/amber tint for finale */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgb(251, 191, 36) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(251, 191, 36) 1px, transparent 1px)
              `,
              backgroundSize: "48px 48px",
            }}
          />
          {/* Warm gradient for finale feel */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
            <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-orange-500/[0.02] rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-4xl lg:text-5xl font-semibold text-zinc-100 mb-4 tracking-[-0.02em]"
            >
              À vous de jouer
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.1,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="text-lg text-zinc-500 mb-10"
            >
              Créez votre premier modèle en quelques secondes
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.2,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <Link href="/register">
                <button className="group inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-900 font-medium text-[15px] rounded-lg hover:bg-white transition-colors">
                  Générer mon modèle
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Link>
              <p className="mt-5 text-zinc-600 text-[13px]">
                Gratuit · Pas de carte requise
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}

// Feature Section with unique ambient colors
function FeatureSection({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const Icon = feature.icon;

  // Each section has its own color theme
  const themes = {
    violet: {
      badge: "bg-violet-500/10 border-violet-500/20 text-violet-400",
      glow: "bg-violet-500/[0.04]",
      gridColor: "139, 92, 246", // violet
      cardBorder: "border-violet-500/10",
    },
    blue: {
      badge: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      glow: "bg-blue-500/[0.04]",
      gridColor: "59, 130, 246", // blue
      cardBorder: "border-blue-500/10",
    },
    emerald: {
      badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      glow: "bg-emerald-500/[0.04]",
      gridColor: "16, 185, 129", // emerald
      cardBorder: "border-emerald-500/10",
    },
  };

  const theme = themes[feature.color as keyof typeof themes];

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Colored grid pattern - unique per section */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(${theme.gridColor}) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(${theme.gridColor}) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
      />

      {/* Ambient glow - changes per section */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] ${theme.glow} rounded-full blur-[150px]`}
      />

      {/* Side accent glow */}
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-30"
        style={{ background: `rgb(${theme.gridColor})`, opacity: 0.02 }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
          className="text-center mb-12"
        >
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme.badge} mb-5`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[13px] font-medium">Étape {index + 1}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-zinc-100 mb-3 tracking-[-0.02em]">
            {feature.title}
          </h2>
          <p className="text-lg text-zinc-500">{feature.subtitle}</p>
        </motion.div>

        {/* Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
          transition={{
            delay: 0.1,
            duration: 0.6,
            ease: [0.22, 0.61, 0.36, 1],
          }}
        >
          <div
            className={`relative rounded-xl border border-white/[0.06] ${theme.cardBorder} bg-zinc-900/60 backdrop-blur-sm p-6 lg:p-10`}
          >
            <div className="min-h-[320px] flex items-center justify-center">
              <NodeVisualization activeFeature={feature.vizIndex} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
