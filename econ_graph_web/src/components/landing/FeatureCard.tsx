"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { RefObject } from "react";

interface FeatureCardProps {
  index: number;
  feature: {
    title: string;
    description: string;
    icon: LucideIcon;
    color: "blue" | "amber" | "emerald" | "purple";
  };
  featureIndex: MotionValue<number>;
  totalFeatures: number;
  targetRef: RefObject<HTMLDivElement | null>;
}

const colorStyles = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    gradient: "from-blue-500/20 to-transparent dark:from-blue-500/10",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    gradient: "from-amber-500/20 to-transparent dark:from-amber-500/10",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    gradient: "from-emerald-500/20 to-transparent dark:from-emerald-500/10",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-950",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    gradient: "from-purple-500/20 to-transparent dark:from-purple-500/10",
  },
};

export function FeatureCard({
  index,
  feature,
  featureIndex,
  totalFeatures,
  targetRef,
}: FeatureCardProps) {
  // Smooth transitions between features
  const opacity = useTransform(
    featureIndex,
    [index - 0.3, index, index + 0.7, index + 1],
    [0, 1, 1, 0]
  );

  const scale = useTransform(
    featureIndex,
    [index - 0.3, index, index + 0.7, index + 1],
    [0.8, 1, 1, 0.8]
  );

  const x = useTransform(
    featureIndex,
    [index - 0.3, index, index + 0.7, index + 1],
    [100, 0, 0, -100]
  );

  const y = useTransform(
    featureIndex,
    [index - 0.3, index, index + 0.7, index + 1],
    [20, 0, 0, -20]
  );

  const Icon = feature.icon;
  const colors = colorStyles[feature.color];

  // Handle scroll to next feature
  const handleNextClick = () => {
    if (!targetRef.current) return;

    // Calculate the scroll position for the next feature
    // Each feature takes up 1/3 of the scroll range (0.3 to 0.7)
    // Feature 0: scroll to 0.3-0.43 range (let's target 0.36)
    // Feature 1: scroll to 0.43-0.57 range (let's target 0.5)
    const totalHeight = targetRef.current.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollRange = totalHeight - viewportHeight;

    // Map features to scroll progress
    // Feature 0 ends at ~0.4, Feature 1 at ~0.55
    const nextFeatureProgress = index === 0 ? 0.5 : 0.7;
    const targetScroll = scrollRange * nextFeatureProgress;

    window.scrollTo({
      top: targetRef.current.offsetTop + targetScroll,
      behavior: 'smooth'
    });
  };

  return (
    <motion.div
      style={{ opacity, scale, x, y }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-2 text-center"
    >
      <motion.div 
        className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-white/20 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow duration-300"
        whileHover={{ y: -5 }}
      >
        {/* Icon with animated ring */}
        <div className="relative">
          <motion.div
            className={`absolute inset-0 rounded-xl ${colors.bg} blur-lg`}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <div className={`relative rounded-xl ${colors.bg} p-3 border-2 ${colors.border}`}>
            <Icon className={`h-8 w-8 ${colors.text}`} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className={`text-xl md:text-2xl font-bold ${colors.text}`}>{feature.title}</h2>
          
          {/* Description */}
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Arrow to next step (hidden on last feature) */}
        {index < totalFeatures - 1 && (
          <motion.button
            onClick={handleNextClick}
            className={`flex items-center gap-2 mt-2 px-4 py-2 rounded-full ${colors.bg} ${colors.text} font-medium text-sm hover:opacity-80 transition-opacity`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Suivant</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
