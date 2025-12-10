"use client";

import {
    motion,
    useMotionValueEvent,
    useScroll,
    useTransform,
} from "framer-motion";
import { Network, Settings2, Sparkles, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";
import { CallToAction } from "./CallToAction";
import { CompositeSection } from "./CompositeSection";
import { FeatureCard } from "./FeatureCard";
import { NodeVisualization } from "./NodeVisualization";

const features = [
  {
    title: "Décrivez, c'est généré",
    description:
      "Oubliez la feuille blanche. Demandez à l'IA : 'Modèle de rentabilité SaaS'. Elle crée les nœuds, les formules et les liens pour vous.",
    icon: Sparkles,
    color: "purple" as const,
    step: 1,
  },
  {
    title: "Simulez des scénarios",
    description:
      "Jouez avec vos hypothèses. Un curseur change, tout le modèle s'adapte. Testez 'Budget +20%' ou 'Taux de conv -5%' en un clin d'œil.",
    icon: Settings2,
    color: "blue" as const,
    step: 2,
  },
  {
    title: "Comparaison & Impact",
    description:
      "Observez les calculs en temps réel. Explorez différents scénarios et prenez des décisions éclairées instantanément.",
    icon: TrendingUp,
    color: "emerald" as const,
    step: 3,
  },
];

export function HeroSection() {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  // --- Animations ---

  // Hero Text Animation
  const heroOpacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.7, 0.8],
    [1, 0, 0, 0]
  );
  const heroY = useTransform(
    scrollYProgress,
    [0, 0.1, 0.7, 0.8],
    ["0%", "-10%", "-10%", "-100%"]
  );

  // Card Animation
  const cardY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.55, 0.8],
    ["65vh", "0vh", "0vh", "-120vh"]
  );
  const cardOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 1],
    [1, 1, 1]
  );
  const cardScale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.55, 0.8],
    [0.8, 1, 1, 0.9]
  );

  // Feature Scrolling Animation
  const progress = useTransform(scrollYProgress, [0.3, 0.55], [0, 1]);
  const featureIndex = useTransform(progress, (p) =>
    Math.max(0, Math.min(features.length - 1, Math.floor(p * features.length)))
  );
  const [activeFeature, setActiveFeature] = useState(0);
  useMotionValueEvent(featureIndex, "change", (latest) => {
    const next = Math.max(0, Math.min(features.length - 1, Math.round(latest)));
    setActiveFeature(next);
  });

  // Scenarios Animation - starts overlapping with card exit
  const scenariosOpacity = useTransform(
    scrollYProgress,
    [0.55, 0.65, 0.85, 0.92],
    [0, 1, 1, 0]
  );
  const scenariosY = useTransform(
    scrollYProgress,
    [0.55, 0.65, 0.85, 0.92],
    ["20vh", "0vh", "0vh", "-80vh"]
  );

  // CTA Animation - appears after scenarios
  const ctaOpacity = useTransform(scrollYProgress, [0.9, 0.98], [0, 1]);
  const ctaScale = useTransform(scrollYProgress, [0.9, 0.98], [0.9, 1]);
  const ctaY = useTransform(scrollYProgress, [0.9, 0.98], ["20vh", "0vh"]);

  return (
    <div ref={targetRef} className="h-[600vh] md:h-[4000vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-gradient-to-br from-zinc-50 via-zinc-50 to-blue-50/30 dark:from-zinc-950 dark:via-zinc-950 dark:to-blue-950/20">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 opacity-40 dark:opacity-30">
          <motion.div
            className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-300/30 to-transparent dark:from-blue-900/20 rounded-full blur-[100px] will-change-transform"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-200/30 to-transparent dark:from-indigo-900/20 rounded-full blur-[100px] will-change-transform"
            animate={{
              x: [0, -30, 0],
              y: [0, -50, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        </div>

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-6"
          style={{ opacity: heroOpacity, y: heroY, zIndex: 30 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-3 mb-6 px-5 py-2.5 rounded-full border-2 border-blue-200 dark:border-blue-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-lg"
          >
            <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-950">
              <Network className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              EconGraph
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
              Beta
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              IA Inside
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-center text-zinc-900 dark:text-white mb-5 leading-tight px-4"
          >
            Modélisez votre business{" "}
            <span className="bg-gradient-to-r from-purple-600 via-blue-500 to-purple-400 dark:from-purple-400 dark:via-blue-400 dark:to-purple-300 bg-clip-text text-transparent">
              à la vitesse de l'IA
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-base md:text-lg lg:text-xl text-zinc-600 dark:text-zinc-400 text-center max-w-2xl leading-relaxed mb-8 px-4"
          >
            <span className="font-semibold text-zinc-900 dark:text-white">
              &ldquo;Quels changements si on diminue le budget ?&rdquo;
            </span>{" "}
            N'ouvrez pas l'Excel que tout le monde fait semblant de comprendre.
            <br className="hidden md:block" />
            <span className="text-zinc-900 dark:text-white font-semibold">
              Décrivez votre modèle, l'IA le construit, vous{" "}
              <span className="inline-flex items-center gap-1 align-middle text-blue-600 dark:text-blue-300">
                <TrendingUp className="h-4 w-4" />
                <span>simulez</span>
              </span>
              .
            </span>
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-600 dark:text-zinc-400"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span>Génération IA</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span>Calculs en direct</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span>Scénarios multiples</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: cardY, opacity: cardOpacity, scale: cardScale, zIndex: 20 }}
          className="absolute inset-0 flex items-center justify-center px-4"
        >
          <div className="w-full max-w-5xl h-[65vh] lg:h-[72vh] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border border-white/20 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row will-change-transform">
            {/* Left column: feature steps */}
            <div className="w-full lg:w-[340px] border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 px-4 py-4 lg:px-6 lg:py-8 flex flex-col h-[40%] lg:h-full justify-center items-center gap-4 lg:gap-8">
              <div className="w-full flex justify-center">
                <StepIndicator activeFeature={activeFeature} />
              </div>
              <div className="relative flex-1 min-h-[260px] w-full max-w-sm">
                {features.map((feature, i) => (
                  <FeatureCard
                    key={feature.title}
                    index={i}
                    feature={feature}
                    featureIndex={featureIndex}
                    totalFeatures={features.length}
                    targetRef={targetRef}
                  />
                ))}
              </div>
            </div>

            {/* Right column: visualization + progress */}
            <div className="flex-1 flex flex-col min-w-0 bg-white/40 dark:bg-zinc-950/40 h-[60%] lg:h-full">
              <div className="flex-1 flex items-center justify-center relative px-4 lg:px-10 py-4 lg:py-8 min-h-0">
                <NodeVisualization activeFeature={activeFeature} />
              </div>
              <div className="px-6 lg:px-10 pb-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="relative w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-zinc-800 dark:bg-zinc-200 rounded-full"
                    style={{ scaleX: progress, transformOrigin: "left" }}
                  />
                  {/* Checkpoints */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-[33.33%] w-2 h-2 bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 rounded-full z-10" />
                  <div className="absolute top-1/2 -translate-y-1/2 left-[66.66%] w-2 h-2 bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 rounded-full z-10" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: scenariosOpacity, y: scenariosY, zIndex: 10 }}
        >
          <CompositeSection scrollYProgress={scrollYProgress} />
        </motion.div>

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: ctaOpacity, scale: ctaScale, y: ctaY, zIndex: 5 }}
        >
          <CallToAction />
        </motion.div>
      </div>
    </div>
  );
}

function StepIndicator({ activeFeature }: { activeFeature: number }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {features.map((feature, index) => {
        const isActive = index === activeFeature;
        const colorClass =
          feature.color === "blue"
            ? "border-blue-500 bg-blue-500/20 dark:border-blue-400 dark:bg-blue-400/20"
            : feature.color === "purple"
            ? "border-purple-500 bg-purple-500/20 dark:border-purple-400 dark:bg-purple-400/20"
            : "border-emerald-500 bg-emerald-500/20 dark:border-emerald-400 dark:bg-emerald-400/20";

        return (
          <span
            key={feature.title}
            className={`h-2.5 w-2.5 rounded-full border transition-all ${
              isActive
                ? colorClass
                : "border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800"
            }`}
          />
        );
      })}
    </div>
  );
}
