"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowDownRight, BarChart3 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type ScenarioKey = "normal" | "optimiste" | "pessimiste";

interface Param { id: string; label: string; value: string; }
interface Result { id: string; label: string; value: string; delta: string | null; positive: boolean | null; }
interface ScenarioData { label: string; params: Param[]; results: Result[]; }

// ── Data ─────────────────────────────────────────────────────────────────────
const SCENARIOS: Record<ScenarioKey, ScenarioData> = {
  normal: {
    label: "Normal",
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
    label: "Optimiste",
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
    label: "Pessimiste",
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
    <section ref={ref} className="relative min-h-screen flex flex-col justify-center py-24 bg-[#f5f5f7] overflow-hidden border-t border-zinc-200">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-400/[0.05] rounded-[100%] blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12 w-full relative z-10">
        {/* Heading */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="inline-flex items-center justify-center mb-6 px-3 py-1 rounded-full border border-zinc-200 bg-white shadow-sm">
            <BarChart3 className="w-3.5 h-3.5 text-zinc-500 mr-2" />
            <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-zinc-600">
              Simulation temps réel
            </span>
          </div>
          <h2 className="text-[2rem] lg:text-[2.5rem] font-semibold tracking-[-0.03em] text-zinc-900 leading-[1.15] mb-4">
            Testez vos hypothèses.
            <br className="hidden sm:block" />
            <span className="text-zinc-400"> Observez l&apos;impact.</span>
          </h2>
          <p className="text-[15px] text-zinc-500 max-w-xl mx-auto leading-relaxed">
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

// ── ScenarioComparison (Linear Style UI) ──────────────────────────────────────
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
    <div className="relative rounded-2xl bg-white border border-zinc-200 shadow-xl overflow-hidden">
      {/* Mac-like Window Header */}
      <div className="h-10 border-b border-zinc-100 bg-zinc-50 flex items-center px-4 justify-between">
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
        </div>
        <div className="text-[11px] font-mono text-zinc-400 font-medium tracking-wide">
          forecast-q3.sg
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-col md:flex-row">
        {/* ── Left Column: Parameters ──────────────────────────────────────── */}
        <div className="flex-1 p-6 md:p-8 md:border-r border-zinc-100 bg-white">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-medium text-zinc-900 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-zinc-400" />
              Hypothèses
            </h3>

            {/* Linear-style Switcher */}
            <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-md p-0.5">
              {ORDER.map((key) => {
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    className="relative px-3 py-1.5 text-[11px] font-medium transition-colors"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 bg-white rounded shadow-sm border border-zinc-200"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}>
                      {SCENARIOS[key].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            {data.params.map((param, idx) => (
              <div
                key={param.id}
                className="group flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <span className="text-[13px] text-zinc-500 font-medium">
                  {param.label}
                </span>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={`${active}-${param.id}`}
                    initial={{ opacity: 0, filter: "blur(4px)", y: 4 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    exit={{ opacity: 0, filter: "blur(4px)", y: -4 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className="text-[13px] font-mono text-zinc-900 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded shadow-sm"
                  >
                    {param.value}
                  </motion.div>
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column: Results ────────────────────────────────────────── */}
        <div className="flex-1 p-6 md:p-8 bg-[#fafafa] relative overflow-hidden">
          {/* Subtle connecting line */}
          <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-8 h-px bg-gradient-to-r from-violet-400/50 to-transparent" />

          <div className="flex items-center mb-8 px-3">
            <h3 className="text-sm font-medium text-zinc-900 flex items-center gap-2">
              <ResultsIcon className="w-4 h-4 text-violet-500" />
              Impact projeté
            </h3>
          </div>

          <div className="space-y-4 px-3">
            {data.results.map((result, idx) => (
              <div key={result.id} className="relative">
                <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-zinc-200 bg-white shadow-sm">
                  <span className="text-[12px] font-medium text-zinc-500">
                    {result.label}
                  </span>

                  <div className="flex items-end justify-between">
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={`${active}-val-${result.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.3, delay: idx * 0.08 }}
                        className="text-2xl font-semibold tracking-tight text-zinc-900"
                      >
                        {result.value}
                      </motion.div>
                    </AnimatePresence>

                    <AnimatePresence>
                      {result.delta && (
                        <motion.div
                          key={`${active}-delta-${result.id}`}
                          initial={{ opacity: 0, scale: 0.8, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: -5 }}
                          transition={{ duration: 0.3, delay: idx * 0.08 + 0.1, type: "spring", stiffness: 300 }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium font-mono ${
                            result.positive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                              : "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200"
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

// ── Icons ─────────────────────────────────────────────────────────────────────
function SettingsIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ResultsIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
