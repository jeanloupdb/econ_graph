"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Box,
  Check,
  Layers,
  Quote,
  Settings2,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
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
  const cardOpacity = useTransform(scrollYProgress, [0, 0.15, 1], [1, 1, 1]);
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
    <>
      {/* Mobile: Normal scroll sections */}
      <div className="md:hidden bg-gradient-to-br from-zinc-50 via-zinc-50 to-blue-50/30 dark:from-zinc-950 dark:via-zinc-950 dark:to-blue-950/20 min-h-screen">
        {/* Subtle grid pattern overlay */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Hero Section */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-4xl font-bold text-center text-zinc-900 dark:text-white mb-5 leading-tight px-4"
          >
            Modélisez votre business
            <br />
            <span className="bg-gradient-to-r from-purple-600 via-blue-500 to-purple-400 dark:from-purple-400 dark:via-blue-400 dark:to-purple-300 bg-clip-text text-transparent">
              à la vitesse de l&rsquo;IA
            </span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-2xl mx-auto mb-8 px-4"
          >
            <div className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl px-6 py-5 border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="absolute -top-3 left-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Quote className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="space-y-3 mt-2">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-1 h-1 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
                  <p className="text-base text-zinc-900 dark:text-white font-semibold">
                    Et si on diminue le budget marketing de 20% ?
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                  className="flex items-start gap-3"
                >
                  <X className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 line-through">
                    Ouvrir l&rsquo;Excel que personne ne comprend vraiment...
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.9 }}
                  className="flex items-start gap-3"
                >
                  <Check className="w-4 h-4 text-emerald-500 mt-1 flex-shrink-0" />
                  <p className="text-sm text-zinc-900 dark:text-white font-medium">
                    Décrivez votre modèle,{" "}
                    <span className="relative inline-block font-semibold">
                      l&rsquo;IA le construit
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, delay: 1.2 }}
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 origin-left"
                      />
                    </span>
                    . Simulez en{" "}
                    <span className="relative inline-block font-semibold">
                      temps réel
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, delay: 1.4 }}
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 origin-left"
                      />
                    </span>
                    .
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
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
        </div>

        {/* Features Card Section */}
        <div className="relative z-10 pb-8">
          <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-white/20 dark:border-zinc-800 rounded-t-3xl shadow-2xl overflow-hidden py-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colorStyles = {
                blue: {
                  bg: "bg-blue-100 dark:bg-blue-950",
                  text: "text-blue-600 dark:text-blue-400",
                  border: "border-blue-200 dark:border-blue-800",
                },
                amber: {
                  bg: "bg-amber-100 dark:bg-amber-950",
                  text: "text-amber-600 dark:text-amber-400",
                  border: "border-amber-200 dark:border-amber-800",
                },
                emerald: {
                  bg: "bg-emerald-100 dark:bg-emerald-950",
                  text: "text-emerald-600 dark:text-emerald-400",
                  border: "border-emerald-200 dark:border-emerald-800",
                },
                purple: {
                  bg: "bg-purple-100 dark:bg-purple-950",
                  text: "text-purple-600 dark:text-purple-400",
                  border: "border-purple-200 dark:border-purple-800",
                },
              };
              const colors = colorStyles[feature.color];

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`px-6 ${
                    index !== features.length - 1 ? "mb-8" : ""
                  }`}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div
                      className={`rounded-xl ${colors.bg} p-3 border-2 ${colors.border}`}
                    >
                      <Icon className={`h-8 w-8 ${colors.text}`} />
                    </div>
                    <div className="space-y-2">
                      <h2 className={`text-xl font-bold ${colors.text}`}>
                        {feature.title}
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    {/* Visualization for each feature */}
                    <div className="w-full mt-4 rounded-xl bg-white/40 dark:bg-zinc-950/40 p-6 border border-zinc-200/50 dark:border-zinc-800/50">
                      <NodeVisualization activeFeature={index} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Scenarios Section */}
        <div className="relative z-10 py-12 px-4">
          <div className="w-full max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-bold mb-6"
              >
                <Layers className="w-4 h-4" />
                <span>Puissance des Composites</span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold text-zinc-900 dark:text-white mb-4"
              >
                Simplifiez le complexe
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-base text-zinc-600 dark:text-zinc-400"
              >
                Transformez des parties entières de votre graphe en briques
                réutilisables. Encapsulez la complexité, partagez vos modèles.
              </motion.p>
            </div>

            {/* Simplified mobile visualization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm uppercase tracking-wider">
                  <Box className="w-5 h-5" />
                  Composite: Trafic Web
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Regroupez plusieurs nœuds complexes en une seule brique
                  réutilisable
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4">
                  <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Impressions
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
                      150k
                    </div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      CTR
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
                      2.5%
                    </div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Clics
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
                      3,750
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative z-10 py-16 px-4">
          <CallToAction />
        </div>
      </div>

      {/* Desktop: Animated scroll experience */}
      <div ref={targetRef} className="hidden md:block h-[600vh] w-full">
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
            className="absolute inset-0 flex flex-col items-center justify-center px-6 -mt-8 md:-mt-12"
            style={{ opacity: heroOpacity, y: heroY, zIndex: 30 }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-center text-zinc-900 dark:text-white mb-5 leading-tight px-4"
            >
              Modélisez votre business
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-blue-500 to-purple-400 dark:from-purple-400 dark:via-blue-400 dark:to-purple-300 bg-clip-text text-transparent">
                à la vitesse de l&rsquo;IA
              </span>
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="max-w-2xl mx-auto mb-8 px-4"
            >
              <div className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl px-6 py-5 border border-zinc-200/50 dark:border-zinc-800/50">
                {/* Quote icon */}
                <div className="absolute -top-3 left-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Quote className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="space-y-3 mt-2">
                  {/* Question */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
                    <p className="text-base md:text-lg text-zinc-900 dark:text-white font-semibold">
                      Et si on diminue le budget marketing de 20% ?
                    </p>
                  </motion.div>

                  {/* Old way - with error indicator */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                    className="flex items-start gap-3"
                  >
                    <X className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                    <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-500 line-through">
                      Ouvrir l&rsquo;Excel que personne ne comprend vraiment...
                    </p>
                  </motion.div>

                  {/* New way - with check indicator */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 }}
                    className="flex items-start gap-3"
                  >
                    <Check className="w-4 h-4 text-emerald-500 mt-1 flex-shrink-0" />
                    <p className="text-sm md:text-base text-zinc-900 dark:text-white font-medium">
                      Décrivez votre modèle,{" "}
                      <span className="relative inline-block font-semibold">
                        l&rsquo;IA le construit
                        <motion.span
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5, delay: 1.2 }}
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 origin-left"
                        />
                      </span>
                      . Simulez en{" "}
                      <span className="relative inline-block font-semibold">
                        temps réel
                        <motion.span
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5, delay: 1.4 }}
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 origin-left"
                        />
                      </span>
                      .
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
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
            style={{
              y: cardY,
              opacity: cardOpacity,
              scale: cardScale,
              zIndex: 20,
            }}
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
    </>
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
