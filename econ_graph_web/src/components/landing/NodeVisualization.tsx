"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { Settings2, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface NodeVisualizationProps {
  activeFeature: number;
}

export function NodeVisualization({ activeFeature }: NodeVisualizationProps) {
  return (
    <div className="relative w-full max-w-md h-64 mx-auto">
      <AnimatePresence mode="wait">
        {activeFeature === 0 && <Step0Visualization key="step-0" />}
        {activeFeature === 1 && <Step1Visualization key="step-1" />}
        {activeFeature === 2 && <Step2Visualization key="step-2" />}
      </AnimatePresence>
    </div>
  );
}

export function Step0Visualization() {
  const [text, setText] = useState("");
  const fullText = "Campagne publicitaire";
  const [showNodes, setShowNodes] = useState(false);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { amount: 0.8, once: true });

  useEffect(() => {
    if (!isInView) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowNodes(true), 0); // Immediate appearance
      }
    }, 20); // Very fast typing

    return () => clearInterval(interval);
  }, [isInView]);

  // Balanced Layout - Shifted up maximally to create large margin with AI bar
  // Row 1: Budget (20,5) & CPC (60,5)
  // Row 2: Clics (40,25) & Conv (80,25)
  // Row 3: Ventes (60,45)
  const baseDelay = 0.7; // Wait for parent card animation
  const nodes = [
    {
      id: 1,
      label: "Budget",
      value: "10k€",
      x: "20%",
      y: "5%",
      delay: baseDelay + 0,
      size: "sm",
    },
    {
      id: 2,
      label: "CPC",
      value: "0.5€",
      x: "60%",
      y: "5%",
      delay: baseDelay + 0.2,
      size: "sm",
    },
    {
      id: 3,
      label: "Clics",
      value: "20k",
      x: "40%",
      y: "25%",
      delay: baseDelay + 0.4,
      size: "md",
    },
    {
      id: 4,
      label: "Conv.",
      value: "5%",
      x: "80%",
      y: "25%",
      delay: baseDelay + 0.6,
      size: "sm",
    },
  ];

  return (
    <motion.div
      ref={containerRef}
      className="absolute inset-0 flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Graph Area */}
      <motion.div
        className="relative w-full flex-1"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: baseDelay,
          duration: 0.4,
          ease: [0.22, 0.61, 0.36, 1],
        }}
      >
        {showNodes && (
          <>
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {/* Edges - Drawn center to center, hidden behind nodes */}
              {/* Budget -> Clics */}
              <motion.line
                x1="20%"
                y1="5%"
                x2="40%"
                y2="25%"
                stroke="currentColor"
                className="text-purple-400"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ delay: baseDelay + 0.5, duration: 0.5 }}
              />
              {/* CPC -> Clics */}
              <motion.line
                x1="60%"
                y1="5%"
                x2="40%"
                y2="25%"
                stroke="currentColor"
                className="text-purple-400"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ delay: baseDelay + 0.7, duration: 0.5 }}
              />
              {/* Clics -> Ventes */}
              <motion.line
                x1="40%"
                y1="25%"
                x2="60%"
                y2="45%"
                stroke="currentColor"
                className="text-purple-400"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ delay: baseDelay + 0.9, duration: 0.5 }}
              />
              {/* Conv -> Ventes */}
              <motion.line
                x1="80%"
                y1="25%"
                x2="60%"
                y2="45%"
                stroke="currentColor"
                className="text-purple-400"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ delay: baseDelay + 1.1, duration: 0.5 }}
              />
            </svg>

            {nodes.map((node) => (
              <motion.div
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: node.x, top: node.y }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, delay: node.delay }}
              >
                <div
                  className={`
                  bg-zinc-900 
                  border border-purple-800 
                  rounded-xl shadow-lg hover:shadow-purple-500/20 transition-shadow
                  ${
                    node.size === "sm" ? "p-2 min-w-[70px]" : "p-3 min-w-[90px]"
                  }
                `}
                >
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                    {node.label}
                  </div>
                  <div
                    className={`${
                      node.size === "sm" ? "text-sm" : "text-base"
                    } font-bold text-purple-400`}
                  >
                    {node.value}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Final Node (Ventes) - Highlighted */}
            <motion.div
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: "60%", top: "45%" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                damping: 12,
                delay: baseDelay + 0.8,
              }}
            >
              <motion.div
                className="absolute inset-0 bg-purple-500/30 rounded-2xl blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              <div className="relative bg-zinc-900 border-2 border-purple-400 rounded-2xl p-4 shadow-2xl min-w-[120px] text-center">
                <div className="text-[10px] uppercase tracking-wider text-purple-400 font-bold mb-1">
                  Résultat
                </div>
                <div className="text-2xl font-black text-white tracking-tight">
                  1000
                </div>
                <div className="text-[10px] text-zinc-400 font-medium">
                  Ventes
                </div>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* AI Input Bar */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-10 bg-zinc-900/90 backdrop-blur-md rounded-full border border-purple-800 shadow-xl flex items-center px-4 gap-2 overflow-hidden"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
        <div className="text-sm text-zinc-300 font-medium whitespace-nowrap">
          {text}
          <span className="animate-blink">|</span>
        </div>
        <motion.div
          className="absolute right-1 top-1 bottom-1 w-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md"
          initial={{ scale: 0 }}
          animate={{ scale: text === fullText ? 1 : 0 }}
        >
          <div className="w-2 h-2 bg-white rounded-full" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function Step1Visualization() {
  const progress = useMotionValue(0);
  const [sliderValue, setSliderValue] = useState(0);
  const baseDelay = 0.7; // Wait for parent card animation

  useEffect(() => {
    // Wait for card animation before starting
    const timeout = setTimeout(() => {
      const controls = animate(progress, 0.25, {
        // Max 25%
        duration: 1.5,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
        repeatDelay: 1,
      });
      return () => controls.stop();
    }, baseDelay * 1000);

    return () => clearTimeout(timeout);
  }, [progress]);

  useMotionValueEvent(progress, "change", (latest) => {
    setSliderValue(latest);
  });

  // Derived values
  const budget = Math.round(10 + sliderValue * 20); // 10k -> 15k (at 0.25 * 20 = +5)
  const ventes = Math.round(1000 + sliderValue * 2000); // 1000 -> 1500

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Graph Area */}
      <motion.div
        className="relative w-full flex-1 mb-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: baseDelay,
          duration: 0.4,
          ease: [0.22, 0.61, 0.36, 1],
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          {/* Edge Budget -> Ventes */}
          <motion.line
            x1="30%"
            y1="30%"
            x2="70%"
            y2="30%"
            stroke="currentColor"
            className="text-blue-400"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ delay: baseDelay, duration: 0.5 }}
          />
        </svg>

        {/* Node: Budget */}
        <motion.div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: "30%", top: "30%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, delay: baseDelay }}
        >
          <motion.div
            className="absolute inset-0 bg-blue-600/10 rounded-xl blur-lg"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="relative bg-zinc-900 border border-blue-800 rounded-xl p-3 shadow-lg min-w-[90px] text-center"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              Budget
            </div>
            <div className="text-base font-bold text-blue-400 transition-all duration-75">
              {budget}k€
            </div>
          </motion.div>
        </motion.div>

        {/* Node: Ventes */}
        <motion.div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: "70%", top: "30%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, delay: baseDelay + 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-blue-500/20 rounded-xl blur-xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="relative bg-zinc-900 border-2 border-blue-400 rounded-xl p-4 shadow-xl min-w-[110px] text-center"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-1">
              Résultat
            </div>
            <div className="text-2xl font-black text-white tracking-tight transition-all duration-75">
              {ventes}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">Ventes</div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scenario Control */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-blue-800 shadow-xl p-3 flex flex-col gap-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: baseDelay + 0.4 }}
      >
        <div className="flex items-center gap-2 text-blue-400 mb-1">
          <Settings2 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Scénario
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-1">
          <span>Budget actuel</span>
          <span>+ de budget</span>
        </div>

        {/* Custom Slider */}
        <div className="relative w-full h-2">
          {/* Track & Progress */}
          <div className="absolute inset-0 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-blue-500"
              style={{ width: `${sliderValue * 100}%` }}
            />
          </div>

          {/* Handle */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm z-20"
            style={{ left: `${sliderValue * 100}%`, x: "-50%" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function Step2Visualization() {
  const [scenario, setScenario] = useState<"A" | "B">("B");
  const baseDelay = 0.7; // Wait for parent card animation

  useEffect(() => {
    // Wait for card animation before starting
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setScenario((s) => (s === "A" ? "B" : "A"));
      }, 2500);
      return () => clearInterval(interval);
    }, baseDelay * 1000);

    return () => clearTimeout(timeout);
  }, []);

  const isB = scenario === "B";

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Graph Area */}
      <motion.div
        className="relative w-full flex-1 mb-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: baseDelay,
          duration: 0.4,
          ease: [0.22, 0.61, 0.36, 1],
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          {/* Edge Conversion -> Ventes */}
          <motion.line
            x1="50%"
            y1="25%"
            x2="50%"
            y2="55%"
            stroke="currentColor"
            className={isB ? "text-emerald-500" : "text-zinc-600"}
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              strokeDasharray: isB ? "5,5" : "0,0",
              opacity: isB ? 1 : 0.5,
            }}
            transition={{
              pathLength: { delay: baseDelay, duration: 0.5 },
              duration: 0.5,
            }}
          />
        </svg>

        {/* Node: Taux de Conv (Input) */}
        <motion.div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: "50%", top: "25%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, delay: baseDelay }}
        >
          <motion.div
            className={`absolute inset-0 rounded-xl blur-lg transition-colors duration-500 ${
              isB ? "bg-emerald-600/20" : "bg-transparent"
            }`}
            animate={{ scale: isB ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
          <motion.div
            className={`relative bg-zinc-900 border transition-colors duration-500 rounded-xl p-3 shadow-lg min-w-[100px] text-center ${
              isB ? "border-emerald-600" : "border-zinc-700"
            }`}
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              Taux Conv.
            </div>
            <div
              className={`text-base font-bold transition-colors duration-500 ${
                isB ? "text-emerald-400" : "text-zinc-300"
              }`}
            >
              {isB ? "3.5%" : "2.0%"}
            </div>
            {isB && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -right-2 -top-2 bg-emerald-900/50 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-800"
              >
                +1.5%
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Node: Ventes (Result) */}
        <motion.div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: "50%", top: "55%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, delay: baseDelay + 0.2 }}
        >
          <motion.div
            className={`absolute inset-0 rounded-xl blur-xl transition-colors duration-500 ${
              isB ? "bg-emerald-500/30" : "bg-zinc-400/10"
            }`}
            animate={{ scale: isB ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
          <motion.div
            className={`relative bg-zinc-900 border-2 transition-colors duration-500 rounded-xl p-4 shadow-xl min-w-[120px] text-center ${
              isB ? "border-emerald-400" : "border-zinc-700"
            }`}
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            <div
              className={`text-[10px] uppercase tracking-wider font-bold mb-1 transition-colors duration-500 ${
                isB ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              Résultat
            </div>
            <div
              className={`text-3xl font-black tracking-tight transition-colors duration-500 ${
                isB ? "text-emerald-400" : "text-white"
              }`}
            >
              {isB ? "150k" : "100k"}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">
              Chiffre d&apos;affaires
            </div>

            {isB && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -right-3 -top-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1"
              >
                <TrendingUp className="w-3 h-3" />
                +50%
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Comparison Control */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-xl p-1.5 flex gap-1"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: baseDelay + 0.4 }}
      >
        <button
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
            !isB
              ? "bg-zinc-800 text-white shadow-inner"
              : "text-zinc-500 hover:bg-zinc-800/50"
          }`}
          onClick={() => setScenario("A")}
        >
          Scénario A
        </button>
        <button
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1 ${
            isB
              ? "bg-emerald-900/30 text-emerald-300 shadow-sm ring-1 ring-emerald-800"
              : "text-zinc-500 hover:bg-zinc-800/50"
          }`}
          onClick={() => setScenario("B")}
        >
          Scénario B{isB && <Sparkles className="w-3 h-3 animate-pulse" />}
        </button>
      </motion.div>
    </motion.div>
  );
}
