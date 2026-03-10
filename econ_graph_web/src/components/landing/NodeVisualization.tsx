"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { Download, Settings2, Sparkles, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

// Step 0 — "Décrivez → l'IA construit votre modèle"
export function Step0Visualization() {
  const [text, setText] = useState("");
  const fullText = "Mon activité SaaS est-elle rentable ?";
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
        setTimeout(() => setShowNodes(true), 0);
      }
    }, 22);
    return () => clearInterval(interval);
  }, [isInView]);

  const baseDelay = 0.7;
  const nodes = [
    { id: 1, label: "Prix", value: "49€", x: "12%", y: "5%", delay: baseDelay + 0 },
    { id: 2, label: "Volume", value: "100/mois", x: "37%", y: "5%", delay: baseDelay + 0.15 },
    { id: 3, label: "Coûts fixes", value: "500€", x: "62%", y: "5%", delay: baseDelay + 0.3 },
    { id: 4, label: "Coût unit.", value: "12€", x: "87%", y: "5%", delay: baseDelay + 0.45 },
  ];

  return (
    <motion.div
      ref={containerRef}
      className="absolute inset-0 flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full flex-1"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: baseDelay, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {showNodes && (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {[
                { x1: "12%", y1: "5%", x2: "25%", y2: "28%", delay: baseDelay + 0.55 },
                { x1: "37%", y1: "5%", x2: "25%", y2: "28%", delay: baseDelay + 0.65 },
                { x1: "62%", y1: "5%", x2: "75%", y2: "28%", delay: baseDelay + 0.75 },
                { x1: "87%", y1: "5%", x2: "75%", y2: "28%", delay: baseDelay + 0.85 },
                { x1: "25%", y1: "28%", x2: "50%", y2: "50%", delay: baseDelay + 0.95 },
                { x1: "75%", y1: "28%", x2: "50%", y2: "50%", delay: baseDelay + 1.05 },
              ].map((line, i) => (
                <motion.line
                  key={i}
                  x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                  stroke="currentColor" className="text-violet-400" strokeWidth="1.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.5 }}
                  transition={{ delay: line.delay, duration: 0.4 }}
                />
              ))}
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
                <div className="bg-white border border-violet-200 rounded-xl p-2 min-w-[70px] shadow-md shadow-violet-100/50">
                  <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">{node.label}</div>
                  <div className="text-sm font-bold text-violet-600">{node.value}</div>
                </div>
              </motion.div>
            ))}

            {/* CA intermédiaire */}
            <motion.div
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: "25%", top: "28%" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, delay: baseDelay + 0.6 }}
            >
              <div className="bg-white border border-violet-300 rounded-xl p-2.5 shadow-md min-w-[80px] text-center">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">CA</div>
                <div className="text-sm font-bold text-violet-600">4 900€</div>
              </div>
            </motion.div>

            {/* Coûts intermédiaire */}
            <motion.div
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: "75%", top: "28%" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, delay: baseDelay + 0.7 }}
            >
              <div className="bg-white border border-violet-300 rounded-xl p-2.5 shadow-md min-w-[80px] text-center">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">Coûts</div>
                <div className="text-sm font-bold text-violet-600">1 700€</div>
              </div>
            </motion.div>

            {/* Résultat final */}
            <motion.div
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: "50%", top: "50%" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, delay: baseDelay + 0.9 }}
            >
              <motion.div
                className="absolute inset-0 bg-violet-400/15 rounded-2xl blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative bg-white border-2 border-violet-400 rounded-2xl p-4 shadow-xl shadow-violet-100 min-w-[130px] text-center">
                <div className="text-[10px] uppercase tracking-wider text-violet-600 font-bold mb-1">Profit mensuel</div>
                <div className="text-2xl font-black text-zinc-900 tracking-tight">3 200€</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">✓ Rentable</div>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* AI input bar */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-10 bg-white border border-violet-200 rounded-full shadow-md shadow-violet-100/60 flex items-center px-4 gap-2 overflow-hidden"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Sparkles className="w-4 h-4 text-violet-500 animate-pulse flex-shrink-0" />
        <div className="text-sm text-zinc-700 font-medium whitespace-nowrap truncate">
          {text}
          <span className="animate-pulse">|</span>
        </div>
        <motion.div
          className="absolute right-1 top-1 bottom-1 w-8 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md"
          initial={{ scale: 0 }}
          animate={{ scale: text === fullText ? 1 : 0 }}
        >
          <div className="w-2 h-2 bg-white rounded-full" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Step 1 — "Modifiez un paramètre → l'impact se propage"
function Step1Visualization() {
  const progress = useMotionValue(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [pulsing, setPulsing] = useState<null | "prix" | "ca" | "profit">(null);
  const lastCascadeRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const baseDelay = 0.7;

  const triggerCascade = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPulsing("prix");
    timersRef.current.push(setTimeout(() => setPulsing("ca"), 220));
    timersRef.current.push(setTimeout(() => setPulsing("profit"), 440));
    timersRef.current.push(setTimeout(() => setPulsing(null), 700));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(progress, 0.8, {
        duration: 2.2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
        repeatDelay: 1.5,
      });
      return () => controls.stop();
    }, baseDelay * 1000);
    return () => clearTimeout(timeout);
  }, [progress]);

  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  useMotionValueEvent(progress, "change", (latest) => {
    setSliderValue(latest);
    if (Math.abs(latest - lastCascadeRef.current) > 0.06) {
      lastCascadeRef.current = latest;
      triggerCascade();
    }
  });

  const ratio = sliderValue / 0.8;
  const prix = Math.round(39 + ratio * 40);
  const ca = prix * 100;
  const profit = ca - 1200;

  const nodeClass = (node: "prix" | "ca" | "profit") =>
    pulsing === node ? "border-blue-400 shadow-blue-200/60 shadow-lg" : "";
  const edgeOpacity = (a: "prix" | "ca", b: "ca" | "profit") =>
    pulsing === a || pulsing === b ? 0.9 : 0.3;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full flex-1 mb-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: baseDelay, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {/* Prix → CA */}
          <motion.line
            x1="22%" y1="42%" x2="48%" y2="42%"
            stroke="currentColor" className="text-blue-400" strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: edgeOpacity("prix", "ca") }}
            transition={{ delay: baseDelay + 0.2, duration: 0.4 }}
          />
          {/* Arrowhead Prix→CA */}
          <motion.polygon
            points="48,41 44,39 44,43"
            style={{ left: "48%", top: "42%" }}
            fill="currentColor" className="text-blue-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: edgeOpacity("prix", "ca") }}
            transition={{ delay: baseDelay + 0.5 }}
          />
          {/* CA → Profit */}
          <motion.line
            x1="52%" y1="42%" x2="78%" y2="42%"
            stroke="currentColor" className="text-blue-400" strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: edgeOpacity("ca", "profit") }}
            transition={{ delay: baseDelay + 0.35, duration: 0.4 }}
          />
        </svg>

        {/* Node Prix */}
        <motion.div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: "22%", top: "42%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: pulsing === "prix" ? 1.07 : 1, opacity: 1 }}
          transition={pulsing === "prix" ? { type: "spring", damping: 8, stiffness: 300 } : { type: "spring", damping: 12, delay: baseDelay }}
        >
          <div className={`bg-white border rounded-xl p-3 min-w-[88px] text-center shadow-sm transition-all duration-150 ${pulsing === "prix" ? "border-blue-400 shadow-blue-100" : "border-blue-200"}`}>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">Prix</div>
            <div className="text-base font-bold text-blue-600">{prix}€</div>
          </div>
        </motion.div>

        {/* Node CA */}
        <motion.div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: "50%", top: "42%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: pulsing === "ca" ? 1.07 : 1, opacity: 1 }}
          transition={pulsing === "ca" ? { type: "spring", damping: 8, stiffness: 300 } : { type: "spring", damping: 12, delay: baseDelay + 0.15 }}
        >
          <div className={`bg-white border rounded-xl p-3 min-w-[88px] text-center shadow-sm transition-all duration-150 ${pulsing === "ca" ? "border-blue-300 shadow-lg shadow-blue-100" : "border-blue-200"}`}>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">CA mensuel</div>
            <div className="text-base font-bold text-blue-600">{ca.toLocaleString("fr-FR")}€</div>
          </div>
        </motion.div>

        {/* Node Profit */}
        <motion.div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: "78%", top: "42%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: pulsing === "profit" ? 1.09 : 1, opacity: 1 }}
          transition={pulsing === "profit" ? { type: "spring", damping: 8, stiffness: 300 } : { type: "spring", damping: 12, delay: baseDelay + 0.3 }}
        >
          <motion.div
            className={`absolute inset-0 rounded-xl blur-xl transition-all duration-300 ${pulsing === "profit" ? "bg-blue-400/20" : "bg-blue-400/5"}`}
          />
          <div className={`relative bg-white border-2 rounded-xl p-3.5 min-w-[96px] text-center shadow-sm transition-all duration-150 ${pulsing === "profit" ? "border-blue-400" : "border-blue-300"}`}>
            <div className="text-[9px] uppercase tracking-wider text-blue-600 font-bold mb-0.5">Profit</div>
            <div className="text-xl font-black text-zinc-900 tracking-tight">{profit.toLocaleString("fr-FR")}€</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Slider control */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 bg-white border border-blue-100 rounded-2xl shadow-md shadow-blue-50 p-3 flex flex-col gap-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: baseDelay + 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Settings2 className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Prix unitaire</span>
          </div>
          <span className="text-xs text-zinc-700 font-semibold">{prix}€</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span>39€</span><span>79€</span>
        </div>
        <div className="relative w-full h-2">
          <div className="absolute inset-0 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style={{ width: `${ratio * 100}%` }} />
          </div>
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm z-20"
            style={{ left: `${ratio * 100}%`, x: "-50%" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Step 2 — "Comparez vos scénarios → exportez en Excel"
function Step2Visualization() {
  const [scenario, setScenario] = useState<"base" | "optimiste">("optimiste");
  const [exported, setExported] = useState(false);
  const baseDelay = 0.7;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setScenario((s) => (s === "base" ? "optimiste" : "base"));
      }, 2800);
      return () => clearInterval(interval);
    }, baseDelay * 1000);
    return () => clearTimeout(timeout);
  }, []);

  const metrics = [
    { label: "CA mensuel",  base: "4 900€",  opt: "7 350€",  diff: "+50%" },
    { label: "Marge brute", base: "2 800€",  opt: "4 100€",  diff: "+46%" },
    { label: "Profit net",  base: "3 200€",  opt: "5 050€",  diff: "+58%" },
  ];

  const isOpt = scenario === "optimiste";

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Comparison table */}
      <motion.div
        className="relative w-full max-w-xs"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: baseDelay, duration: 0.4 }}
      >
        {/* Column headers */}
        <div className="grid grid-cols-3 gap-2 mb-2 px-1">
          <div className="text-[9px] uppercase tracking-wider text-zinc-400" />
          <div className="text-[9px] uppercase tracking-wider text-zinc-500 text-center font-medium">Base</div>
          <div className={`text-[9px] uppercase tracking-wider text-center font-medium transition-colors duration-300 ${isOpt ? "text-emerald-600" : "text-zinc-500"}`}>
            Optimiste
          </div>
        </div>

        {/* Metric rows */}
        <div className="space-y-1.5">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              className={`grid grid-cols-3 gap-2 px-3 py-2.5 rounded-xl border transition-all duration-500 ${isOpt ? "bg-white border-emerald-100 shadow-sm" : "bg-white border-zinc-200 shadow-sm"}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: baseDelay + 0.08 * i, duration: 0.4 }}
            >
              <div className="text-[11px] text-zinc-600 font-medium self-center">{m.label}</div>
              <div className="text-[12px] font-semibold text-zinc-400 text-center self-center">{m.base}</div>
              <div className="text-center self-center">
                <motion.div
                  key={`${scenario}-${i}`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`text-[12px] font-bold transition-colors duration-300 ${isOpt ? "text-emerald-600" : "text-zinc-400"}`}
                >
                  {isOpt ? m.opt : m.base}
                </motion.div>
                {isOpt && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[9px] text-emerald-500 font-medium"
                  >
                    {m.diff}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Controls: Base / Optimiste / Export */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 bg-white border border-zinc-200 rounded-2xl shadow-md p-1.5 flex gap-1"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: baseDelay + 0.4 }}
      >
        <button
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${!isOpt ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-50"}`}
          onClick={() => setScenario("base")}
        >
          Base
        </button>
        <button
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1 ${isOpt ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "text-zinc-400 hover:bg-zinc-50"}`}
          onClick={() => setScenario("optimiste")}
        >
          Optimiste
          {isOpt && <TrendingUp className="w-3 h-3" />}
        </button>
        <button
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1 ${exported ? "text-emerald-600 bg-emerald-50" : "text-zinc-400 hover:text-emerald-600 hover:bg-zinc-50"}`}
          onClick={() => { setExported(true); setTimeout(() => setExported(false), 2000); }}
        >
          {exported ? (
            <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1">
              <Download className="w-3 h-3" /> Exporté !
            </motion.span>
          ) : (
            <><Download className="w-3 h-3" /> Excel</>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
