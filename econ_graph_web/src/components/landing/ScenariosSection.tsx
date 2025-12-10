"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { TrendingUp, TrendingDown, GitCompare, Lightbulb } from "lucide-react";

interface ScenariosSectionProps {
  featureIndex: MotionValue<number>;
}

const scenarios = [
  {
    title: "Créez des scénarios multiples",
    description: "Testez différentes hypothèses économiques en parallèle",
    icon: Lightbulb,
    color: "blue" as const,
    example: {
      label: "Scenario A",
      metric: "Croissance",
      value: "+15%",
      trend: "up" as const,
    }
  },
  {
    title: "Comparez les résultats",
    description: "Visualisez côte à côte l'impact de vos décisions",
    icon: GitCompare,
    color: "amber" as const,
    example: {
      label: "vs Scenario B",
      metric: "Différence",
      value: "+8%",
      trend: "up" as const,
    }
  },
  {
    title: "Identifiez les opportunités",
    description: "Découvrez les stratégies les plus performantes",
    icon: TrendingUp,
    color: "emerald" as const,
    example: {
      label: "Meilleur scenario",
      metric: "ROI",
      value: "+22%",
      trend: "up" as const,
    }
  },
];

const colorStyles = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    light: "bg-blue-50 dark:bg-blue-900/20",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    light: "bg-amber-50 dark:bg-amber-900/20",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    light: "bg-emerald-50 dark:bg-emerald-900/20",
  },
};

export function ScenariosSection({ featureIndex }: ScenariosSectionProps) {
  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4"
        >
          Scénarios et comparaisons
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
        >
          Explorez plusieurs hypothèses, comparez leurs impacts et prenez les meilleures décisions
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map((scenario, index) => (
          <ScenarioCard
            key={scenario.title}
            scenario={scenario}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  index,
}: {
  scenario: typeof scenarios[0];
  index: number;
}) {
  const Icon = scenario.icon;
  const colors = colorStyles[scenario.color];
  const TrendIcon = scenario.example.trend === "up" ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      viewport={{ once: true, amount: 0.3 }}
      className="group"
    >
      <div className="h-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 transition-all hover:shadow-xl hover:scale-[1.02]">
        {/* Icon */}
        <div className="mb-6">
          <div className={`inline-flex rounded-xl ${colors.bg} p-3 border-2 ${colors.border}`}>
            <Icon className={`h-6 w-6 ${colors.text}`} />
          </div>
        </div>

        {/* Title & Description */}
        <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>
          {scenario.title}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          {scenario.description}
        </p>

        {/* Example Card (inspired by DashboardCard) */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`rounded-xl border ${colors.border} ${colors.light} p-4 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {scenario.example.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded border ${colors.border} ${colors.bg} ${colors.text}`}>
              Exemple
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {scenario.example.metric}
              </div>
              <div className={`text-2xl font-bold ${colors.text} flex items-center gap-2`}>
                {scenario.example.value}
                <TrendIcon className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Basé sur vos données
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
