"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowDownRight, BarChart3, Settings } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type ScenarioKey = "normal" | "optimiste" | "pessimiste";

interface Param { id: string; label: string; value: string; }
interface Result { id: string; label: string; value: string; delta: string | null; positive: boolean | null; }
interface ScenarioData { label: string; params: Param[]; results: Result[]; }

// ── Data ─────────────────────────────────────────────────────────────────────
const SCENARIOS: Record<ScenarioKey, ScenarioData> = {
  normal: {
    label: "NORMAL",
    params: [
      { id: "deals",  label: "Deals / vendeur",    value: "4" },
      { id: "panier", label: "Panier moyen",       value: "3 200 €" },
      { id: "conv",   label: "Taux de conversion", value: "12%" },
      { id: "lead",   label: "Coût d'acquisition", value: "45 €" },
    ],
    results: [
      { id: "ca",     label: "Chiffre d'Affaires", value: "64 000 €", delta: null, positive: null },
      { id: "marge",  label: "Marge brute",        value: "64%",      delta: null, positive: null },
      { id: "profit", label: "Profit net",         value: "41 500 €", delta: null, positive: null },
    ],
  },
  optimiste: {
    label: "OPTIMISTE",
    params: [
      { id: "deals",  label: "Deals / vendeur",    value: "7" },
      { id: "panier", label: "Panier moyen",       value: "3 800 €" },
      { id: "conv",   label: "Taux de conversion", value: "18%" },
      { id: "lead",   label: "Coût d'acquisition", value: "38 €" },
    ],
    results: [
      { id: "ca",     label: "Chiffre d'Affaires", value: "112 000 €", delta: "+75%",  positive: true },
      { id: "marge",  label: "Marge brute",        value: "79%",       delta: "+23pt", positive: true },
      { id: "profit", label: "Profit net",         value: "89 500 €",  delta: "+116%", positive: true },
    ],
  },
  pessimiste: {
    label: "PESSIMISTE",
    params: [
      { id: "deals",  label: "Deals / vendeur",    value: "2" },
      { id: "panier", label: "Panier moyen",       value: "2 800 €" },
      { id: "conv",   label: "Taux de conversion", value: "7%" },
      { id: "lead",   label: "Coût d'acquisition", value: "55 €" },
    ],
    results: [
      { id: "ca",     label: "Chiffre d'Affaires", value: "28 000 €", delta: "−56%",  positive: false },
      { id: "marge",  label: "Marge brute",        value: "48%",      delta: "−16pt", positive: false },
      { id: "profit", label: "Profit net",         value: "13 500 €", delta: "−67%",  positive: false },
    ],
  },
};

const ORDER: ScenarioKey[] = ["normal", "optimiste", "pessimiste"];

// ── Section ───────────────────────────────────────────────────────────────────
export function DemoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col justify-center py-32 bg-[#FAFAFA] overflow-hidden border-t border-zinc-200 font-mono">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-400/[0.03] rounded-[100%] blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12 w-full relative z-10">
        {/* Heading */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="inline-flex items-center justify-center mb-6 px-3 py-1 rounded bg-zinc-900 text-white shadow-sm">
            <BarChart3 className="w-3.5 h-3.5 text-violet-400 mr-2" />
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase">
              Simulation_Live
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-sans font-bold tracking-tight text-zinc-900 leading-tight mb-4">
            Testez vos hypothèses.
            <br className="hidden sm:block" />
            <span className="text-zinc-400 font-normal"> Observez l&apos;impact.</span>
          </h2>
          <p className="text-base md:text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed font-sans">
            Modifiez vos paramètres d'entrée, les résultats se recalculent instantanément à travers tout le graphe de dépendances.
          </p>
        </motion.div>

        {/* Demo App UI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <ScenarioComparison />
        </motion.div>
      </div>
    </section>
  );
}

// ── ScenarioComparison (CLI inspired UI) ──────────────────────────────────────
function ScenarioComparison() {
  const [active, setActive] = useState<ScenarioKey>("normal");
  const [userSelected, setUserSelected] = useState(false);
  const data = SCENARIOS[active];

  // Auto-cycle
  useEffect(() => {
    if (userSelected) return;
    const t = setTimeout(() => {
      setActive(prev => ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]);
    }, 3500);
    return () => clearTimeout(t);
  }, [active, userSelected]);

  const handleSelect = (k: ScenarioKey) => {
    setUserSelected(true);
    setActive(k);
  };

  return (
    <div className="relative rounded border border-zinc-200 bg-white shadow-2xl shadow-zinc-200 overflow-hidden">
      {/* CLI Window Header */}
      <div className="h-10 border-b border-zinc-100 bg-zinc-50 flex items-center px-4 justify-between">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
        </div>
        <div className="text-[10px] font-mono text-zinc-400 font-bold tracking-[0.2em] uppercase">
          ./models/forecast.yaml
        </div>
        <div className="w-10 text-right">
          <span className="text-[10px] text-emerald-500 font-bold">● LIVE</span>
        </div>
      </div>

      <div className="flex flex-col md:row-span-2 md:flex-row">
        {/* ── Left Column: Parameters ──────────────────────────────────────── */}
        <div className="flex-1 p-6 md:p-10 md:border-r border-zinc-100 bg-white">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Settings className="w-3 h-3" />
              INPUT_VARS
            </h3>

            {/* CLI style Switcher */}
            <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded p-0.5">
              {ORDER.map((key) => {
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    className="relative px-3 py-1.5 text-[10px] font-bold transition-all uppercase tracking-wider"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill-demo"
                        className="absolute inset-0 bg-white border border-zinc-200 rounded shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"}`}>
                      {SCENARIOS[key].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {data.params.map((param, idx) => (
              <div
                key={param.id}
                className="group flex items-center justify-between py-3 px-4 -mx-4 rounded hover:bg-zinc-50 transition-colors"
              >
                <span className="text-[12px] text-zinc-500 font-bold uppercase tracking-wider">
                  {param.label}
                </span>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={`${active}-${param.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-[13px] font-bold text-zinc-900 bg-white border border-zinc-200 px-3 py-1 rounded shadow-sm"
                  >
                    {param.value}
                  </motion.div>
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column: Results ────────────────────────────────────────── */}
        <div className="flex-1 p-6 md:p-10 bg-zinc-50 relative overflow-hidden">
          <div className="flex items-center mb-10">
            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="text-violet-500">✦</span>
              OUTPUT_RESULTS
            </h3>
          </div>

          <div className="space-y-4">
            {data.results.map((result, idx) => (
              <div key={result.id} className="relative">
                <div className="flex flex-col gap-2 p-5 rounded border border-zinc-200 bg-white shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {result.label}
                  </span>

                  <div className="flex items-center justify-between">
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={`${active}-val-${result.id}`}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 5 }}
                        className="text-2xl font-bold tracking-tight text-zinc-900"
                      >
                        {result.value}
                      </motion.div>
                    </AnimatePresence>

                    <AnimatePresence>
                      {result.delta && (
                        <motion.div
                          key={`${active}-delta-${result.id}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold tracking-tighter ${
                            result.positive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          {result.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {result.delta}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
