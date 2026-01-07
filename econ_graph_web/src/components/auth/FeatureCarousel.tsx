"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, Database, Layers, Shield, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export function FeatureCarousel() {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setScene((prev) => (prev + 1) % 3);
    }, 6000); // 6s per scene
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Shared Background Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
        style={{ 
            backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, 
            backgroundSize: '40px 40px' 
        }} 
      />

      {/* Text Overlay - Moved to Top, No Bubble */}
      <div className="absolute top-8 left-0 right-0 text-center z-20 pointer-events-none">
         <AnimatePresence mode="wait">
            <motion.div
                key={scene}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-1"
            >
                <h3 className={`text-2xl font-black tracking-tight ${
                    scene === 0 ? "text-purple-400" :
                    scene === 1 ? "text-emerald-400" :
                    "text-blue-400"
                }`}>
                    {scene === 0 && "Structurez vos Idées"}
                    {scene === 1 && "Simulez l'Impact"}
                    {scene === 2 && "Collaborez en Sécurité"}
                </h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
                    {scene === 0 && "Composites Intelligents"}
                    {scene === 1 && "Scénarios Temps Réel"}
                    {scene === 2 && "Synchronisation Instantanée"}
                </p>
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Main Stage - Increased Width for V3 */}
      <div className="relative w-full max-w-3xl aspect-[16/9] flex items-center justify-center mt-12">
        <AnimatePresence mode="wait">
            {scene === 0 && <SceneComposites key="scene-0" />}
            {scene === 1 && <SceneScenarios key="scene-1" />}
            {scene === 2 && <SceneCollaboration key="scene-2" />}
        </AnimatePresence>
      </div>

      {/* Navigation / Progress Indicators */}
      <div className="absolute bottom-8 flex gap-3 z-20">
        {[0, 1, 2].map((i) => (
            <div key={i} className="relative h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                {i === scene && (
                    <motion.div 
                        className="absolute inset-0 bg-white"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 6, ease: "linear" }}
                    />
                )}
                {i < scene && <div className="absolute inset-0 bg-white" />}
            </div>
        ))}
      </div>
    </div>
  );
}

// --- Scene 1: "The Deep Dive" (Composites) ---
// V3: Larger scale, internal grid detail.
function SceneComposites() {
    return (
        <motion.div className="relative w-full h-full flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
        >
            {/* The Outer Shell - Much Larger */}
            <motion.div 
                className="absolute bg-purple-500/5 border border-purple-500/20 rounded-[2rem] backdrop-blur-sm overflow-hidden"
                initial={{ width: 100, height: 100 }}
                animate={{ width: 400, height: 220 }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
            >
                 {/* Internal Grid Detail */}
                 <div className="absolute inset-0 opacity-20" 
                    style={{ 
                        backgroundImage: `linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)`, 
                        backgroundSize: '20px 20px' 
                    }} 
                 />

                 {/* Internal Logic Reveal */}
                 <motion.div 
                    className="absolute inset-0 flex items-center justify-center opacity-0"
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 0.5 }}
                 >
                    {/* Inner Nodes - Spread out */}
                    <div className="flex items-center gap-16 relative z-10">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl border border-purple-300 flex items-center justify-center shadow-lg">
                            <Brain className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className="w-16 h-16 bg-zinc-900 rounded-2xl border-2 border-purple-500 flex items-center justify-center shadow-xl">
                            <Layers className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl border border-purple-300 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                    {/* Connecting Line */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-64 h-1 bg-purple-900" />
                        <motion.div 
                            className="absolute w-16 h-1 bg-purple-500 blur-sm"
                            animate={{ x: [-120, 120] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                 </motion.div>
            </motion.div>

            {/* The Icon (Starts Center, Moves Top-Left) */}
            <motion.div 
                className="absolute z-20 bg-zinc-900 p-4 rounded-2xl shadow-2xl border border-purple-200"
                initial={{ x: 0, y: 0, scale: 1.5 }}
                animate={{ x: -180, y: -90, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
            >
                <Layers className="w-8 h-8 text-purple-600" />
            </motion.div>
        </motion.div>
    )
}

// --- Scene 2: "The Growth" (Scenarios) ---
// V3: Fixed overlaps, dedicated result card, wider curve.
function SceneScenarios() {
    return (
        <motion.div className="relative w-full h-full flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Graph Container - Wider */}
            <div className="relative w-[32rem] h-48 border-l-2 border-b-2 border-zinc-700">
                {/* The Curve - Lower profile to avoid text overlap */}
                <svg className="absolute inset-0 overflow-visible">
                    <motion.path 
                        d="M 0 192 C 100 192, 200 180, 512 150" // Flat-ish
                        stroke="#3b82f6" // Blue
                        strokeWidth="4"
                        fill="none"
                        initial={{ d: "M 0 192 C 100 192, 200 180, 512 150", stroke: "#3b82f6" }}
                        animate={{ 
                            d: "M 0 192 C 150 192, 300 100, 512 20", // Exponential but controlled height
                            stroke: "#10b981" // Emerald
                        }}
                        transition={{ duration: 2, delay: 1, ease: "easeInOut" }}
                    />
                    {/* Area Under Curve (Glow) */}
                    <motion.path 
                         d="M 0 192 C 150 192, 300 100, 512 20 L 512 192 L 0 192 Z"
                         fill="url(#gradient-growth)"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 0.6 }}
                         transition={{ duration: 2, delay: 1 }}
                    />
                    <defs>
                        <linearGradient id="gradient-growth" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* The Slider (Trigger) - Moved down */}
                <motion.div 
                    className="absolute -bottom-10 left-0 right-0 h-1.5 bg-zinc-800 rounded-full"
                >
                    <motion.div 
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 border-4 border-emerald-500 rounded-full shadow-lg z-10 cursor-pointer"
                        initial={{ left: "10%" }}
                        animate={{ left: "90%" }}
                        transition={{ duration: 2, delay: 1, ease: "easeInOut" }}
                    />
                </motion.div>

                {/* Result Card - Moved to Right Side, distinct from graph */}
                <motion.div 
                    className="absolute top-4 right-[-4rem] bg-zinc-900 border border-emerald-800 p-4 rounded-2xl shadow-xl flex flex-col items-center"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.5, type: "spring" }}
                >
                    <span className="text-xs font-bold text-zinc-400 uppercase">Revenue</span>
                    <div className="text-2xl font-black text-emerald-400">+120%</div>
                    <TrendingUp className="w-4 h-4 text-emerald-500 mt-1" />
                </motion.div>
            </div>
        </motion.div>
    )
}

// --- Scene 3: "The Sync" (Collaboration) ---
// V5: Central Shared Hub to visualize "Same Object".
function SceneCollaboration() {
    return (
        <motion.div className="relative w-full h-full flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Alice (Left) */}
            <motion.div 
                className="absolute left-[10%]"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className="w-16 h-16 bg-zinc-900 rounded-full border-4 border-blue-500 flex items-center justify-center shadow-2xl z-10 relative">
                    <span className="text-xl font-bold text-blue-400">A</span>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-zinc-900" />
                </div>
                <div className="mt-4 text-center">
                    <div className="text-xs font-bold bg-blue-950 text-blue-300 px-2 py-1 rounded-full inline-block">Editor</div>
                </div>
            </motion.div>

            {/* Bob (Right) */}
            <motion.div 
                className="absolute right-[10%]"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <div className="w-16 h-16 bg-zinc-900 rounded-full border-4 border-emerald-500 flex items-center justify-center shadow-2xl z-10 relative">
                    <span className="text-xl font-bold text-emerald-400">B</span>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-zinc-900" />
                </div>
                <div className="mt-4 text-center">
                    <div className="text-xs font-bold bg-emerald-950 text-emerald-300 px-2 py-1 rounded-full inline-block">Viewer</div>
                </div>
            </motion.div>

            {/* Central Shared Hub */}
            <motion.div 
                className="absolute z-20 bg-zinc-900 p-4 rounded-2xl shadow-2xl border-2 border-zinc-700 flex flex-col items-center gap-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
            >
                <Database className="w-8 h-8 text-zinc-500" />
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse delay-75" />
                </div>
            </motion.div>

            {/* Connection Lines (Alice -> Hub -> Bob) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10">
                {/* Line Alice -> Hub */}
                <motion.line 
                    x1="15%" y1="50%" x2="50%" y2="50%"
                    stroke="url(#gradient-beam-left)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                />
                {/* Line Hub -> Bob */}
                <motion.line 
                    x1="50%" y1="50%" x2="85%" y2="50%"
                    stroke="url(#gradient-beam-right)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 1.2 }}
                />
                <defs>
                    <linearGradient id="gradient-beam-left" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#52525b" />
                    </linearGradient>
                    <linearGradient id="gradient-beam-right" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#52525b" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Data Packets */}
            {/* Alice sending data */}
            <motion.div 
                className="absolute top-[50%] w-3 h-3 bg-blue-500 rounded-full shadow-lg z-10"
                style={{ marginTop: -6 }}
                initial={{ left: "15%", opacity: 0 }}
                animate={{ left: "50%", opacity: 1 }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2, ease: "easeInOut", delay: 2 }}
            />
            {/* Bob receiving update */}
            <motion.div 
                className="absolute top-[50%] w-3 h-3 bg-emerald-500 rounded-full shadow-lg z-10"
                style={{ marginTop: -6 }}
                initial={{ left: "50%", opacity: 0 }}
                animate={{ left: "85%", opacity: 1 }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2, ease: "easeInOut", delay: 2.5 }}
            />

            {/* Security Shield (Floating above) */}
            <motion.div 
                className="absolute -top-12 bg-zinc-800 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.5 }}
            >
                <Shield className="w-3 h-3" />
                Encrypted
            </motion.div>
        </motion.div>
    )
}
