"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { Box, Layers } from "lucide-react";

export function CompositeSection({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Internal animations can be subtle or removed since HeroSection handles the container
  const contentOpacity = useTransform(scrollYProgress, [0.55, 0.65], [0, 1]);
  const contentScale = useTransform(scrollYProgress, [0.55, 0.65], [0.95, 1]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-24 flex flex-col items-center">
      <div className="text-center mb-16 max-w-3xl">
        <motion.div
          style={{ opacity: contentOpacity, scale: contentScale }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-bold mb-6"
        >
          <Layers className="w-4 h-4" />
          <span>Puissance des Composites</span>
        </motion.div>
        <motion.h2
          style={{ opacity: contentOpacity, scale: contentScale }}
          className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-6"
        >
          Simplifiez le complexe
        </motion.h2>
        <motion.p
          style={{ opacity: contentOpacity, scale: contentScale }}
          className="text-lg text-zinc-600 dark:text-zinc-400"
        >
          Transformez des parties entières de votre graphe en briques réutilisables.
          <br className="hidden md:block" />
          Encapsulez la complexité, partagez vos modèles.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Left: Detailed Graph */}
        <motion.div
          style={{ opacity: contentOpacity, scale: contentScale }}
          className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 h-[400px] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute top-6 left-6 text-sm font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-400" />
            Vue Détaillée
          </div>

          <div className="relative w-full h-full max-w-md mx-auto mt-8">
            {/* Edges - Rendered FIRST to be behind nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              <Edge x1="20%" y1="25%" x2="50%" y2="50%" delay={0.8} />
              <Edge x1="20%" y1="75%" x2="50%" y2="50%" delay={0.8} />
              <Edge x1="50%" y1="50%" x2="85%" y2="50%" delay={0.9} />
            </svg>

            {/* Dotted Group Box */}
            <motion.div
              className="absolute border-2 border-dashed border-orange-400 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl"
              style={{ top: "10%", left: "5%", right: "35%", bottom: "10%", zIndex: 1 }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <div className="absolute -top-3 left-4 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Groupe: Trafic
              </div>
            </motion.div>

            {/* Nodes - Rendered AFTER edges */}
            <div className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                <DetailedNode label="Impressions" value="150k" x="20%" y="25%" delay={0.4} />
                <DetailedNode label="CTR" value="2.5%" x="20%" y="75%" delay={0.5} />
                <DetailedNode label="Clics" value="3,750" x="50%" y="50%" delay={0.6} highlighted />
                
                {/* External Node */}
                <DetailedNode label="Ventes" value="75" x="85%" y="50%" delay={0.7} isResult />
            </div>
          </div>
        </motion.div>

        {/* Right: Composite Graph */}
        <motion.div
          style={{ opacity: contentOpacity, scale: contentScale }}
          className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 h-[400px] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute top-6 left-6 text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
            <Box className="w-4 h-4" />
            Vue Composite
          </div>

          <div className="relative w-full h-full max-w-md mx-auto mt-8">
            {/* Edge - Rendered FIRST */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              <Edge x1="30%" y1="50%" x2="85%" y2="50%" delay={1.2} />
            </svg>

            {/* Composite Node */}
            <motion.div
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: "30%", top: "50%", zIndex: 10 }}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1, type: "spring" }}
            >
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-orange-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-white dark:bg-zinc-900 border-2 border-orange-500 rounded-2xl p-5 shadow-xl min-w-[140px] flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm uppercase tracking-wider">
                    <Box className="w-4 h-4" />
                    Trafic Web
                  </div>
                  <div className="text-2xl font-black text-zinc-900 dark:text-white">3,750</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    Composite
                  </div>
                </div>
                {/* Stack effect */}
                <div className="absolute top-1 left-1 right-1 h-full bg-orange-500/10 dark:bg-orange-400/10 border border-orange-200 dark:border-orange-800 rounded-2xl -z-10 transform translate-x-1 translate-y-1" />
                <div className="absolute top-2 left-2 right-2 h-full bg-orange-500/5 dark:bg-orange-400/5 border border-orange-100 dark:border-orange-900 rounded-2xl -z-20 transform translate-x-2 translate-y-2" />
              </div>
            </motion.div>

            {/* External Node */}
            <div className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                <DetailedNode label="Ventes" value="75" x="85%" y="50%" delay={1.1} isResult />
            </div>
            
            {/* Arrow indicating transformation */}
            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-700 hidden lg:block"
                style={{ left: "-4%" }} 
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}


function DetailedNode({ label, value, x, y, delay, highlighted = false, isResult = false }: any) {
  return (
    <motion.div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, type: "spring", damping: 12 }}
    >
      <div className={`
        relative rounded-xl p-3 shadow-lg min-w-[90px] text-center transition-all
        ${highlighted 
            ? "bg-orange-50 dark:bg-zinc-900 border-2 border-orange-500 dark:border-orange-500 shadow-orange-500/20" 
            : isResult
            ? "bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100"
            : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"}
      `}>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">{label}</div>
        <div className={`font-bold ${highlighted ? "text-orange-600 dark:text-orange-400" : "text-zinc-900 dark:text-white"}`}>{value}</div>
      </div>
    </motion.div>
  );
}

function Edge({ x1, y1, x2, y2, delay }: any) {
  return (
    <motion.line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="currentColor"
      className="text-zinc-300 dark:text-zinc-700"
      strokeWidth="2"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    />
  );
}
