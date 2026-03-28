"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, TrendingUp, CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

const USE_CASES = [
  {
    id: "bakery",
    sector: "Boulangerie",
    insight: "Arrêtez les Sandwichs.",
    reason: "Votre marge est 3x inférieure à la moyenne de vos produits.",
    data: [
      { label: "Croissants", value: 38, status: "good" },
      { label: "Baguettes", value: 42, status: "good" },
      { label: "Sandwichs", value: 12, status: "bad" },
    ],
    prompt: "Analyse ma rentabilité : croissants, baguettes et sandwichs...",
  },
  {
    id: "saas",
    sector: "SaaS",
    insight: "Baissez le Churn de 1%.",
    reason: "Cela avance votre point mort de 4 mois et sauve 12k€ de MRR.",
    data: [
      { label: "Churn Actuel", value: 3.2, status: "bad" },
      { label: "Cible", value: 2.2, status: "good" },
    ],
    prompt: "Calcule l'impact d'une baisse de 1% du churn sur mon MRR...",
  },
  {
    id: "airbnb",
    sector: "Immobilier",
    insight: "Ciblez 72% d'occupation.",
    reason: "En dessous, votre cash-flow net devient négatif après impôts.",
    data: [
      { label: "Pessimiste", value: -120, status: "bad", unit: "€" },
      { label: "Cible 72%", value: 260, status: "good", unit: "€" },
    ],
    prompt: "A quel taux d'occupation mon Airbnb devient-il rentable ?",
  },
] as const;

export function UseCasesSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const sectionRef = useRef(null);
  const active = USE_CASES[activeIdx];

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const handleTest = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sg_prefill_prompt", active.prompt);
    }
    router.push("/dashboard");
  }, [active, router]);

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden bg-white border-t border-zinc-100 font-mono" id="cas">
      <div className="relative z-10 max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col items-center mb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6">
            <span className="px-3 py-1 rounded bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest shadow-sm">
              INSIGHTS IA
            </span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-sans font-bold text-zinc-900 tracking-tight max-w-3xl">
            Ne lisez plus des chiffres. <br/>
            <span className="text-zinc-400 font-normal">Prenez des décisions.</span>
          </h2>
        </div>

        {/* Navigation Tabs (Monospace) */}
        <div className="flex justify-center gap-1 mb-16 p-1 bg-zinc-50 border border-zinc-200 rounded w-fit mx-auto shadow-sm">
          {USE_CASES.map((uc, i) => (
            <button
              key={uc.id}
              onClick={() => setActiveIdx(i)}
              className={cn(
                "px-6 py-2 rounded text-[11px] font-bold uppercase tracking-widest transition-all duration-300 relative",
                activeIdx === i ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <span className="relative z-10">{uc.sector}</span>
              {activeIdx === i && (
                <motion.div
                  layoutId="caseTab"
                  className="absolute inset-0 bg-white border border-zinc-200 rounded shadow-sm"
                  transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Decision Dashboard Visual (White background, Zinc borders) */}
        <motion.div
          style={{ y: y1 }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-white border border-zinc-200 rounded shadow-2xl shadow-zinc-200 p-8 md:p-12">

            {/* Action Side */}
            <div className="space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("font-bold text-lg", active.data.some(d => d.status === 'bad') ? "text-red-500" : "text-emerald-500")}>✦</span>
                    <span className="text-zinc-400 font-bold text-[10px] tracking-[0.2em] uppercase">Conclusion IA</span>
                  </div>

                  <h3 className="text-3xl md:text-4xl font-sans font-bold text-zinc-900 leading-tight">
                    {active.insight}
                  </h3>
                  <p className="text-lg text-zinc-500 leading-relaxed font-sans">
                    {active.reason}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="pt-8">
                <button
                  onClick={handleTest}
                  className="group flex items-center gap-3 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded transition-all text-[11px] uppercase tracking-widest"
                >
                  Générer ce modèle
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Data Side (CLI like cards) */}
            <div className="bg-zinc-50 rounded border border-zinc-200 p-8 space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id + "-viz"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {active.data.map((item, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-zinc-500">{item.label}</span>
                        <span className={cn(
                          item.status === 'good' ? "text-emerald-600" : "text-red-500"
                        )}>
                          {item.value}{item.unit || '%'}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, item.value * (item.unit ? 0.1 : 1))}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className={cn(
                            "h-full",
                            item.status === 'good' ? "bg-emerald-500" : "bg-red-400"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>

              <div className="pt-6 grid grid-cols-2 gap-4">
                <div className="p-4 rounded border border-zinc-200 bg-white shadow-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-600 mb-2" />
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Optimisation</div>
                  <div className="text-[13px] text-zinc-900 font-bold mt-1">Boost de marge +18%</div>
                </div>
                <div className="p-4 rounded border border-zinc-200 bg-white shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-violet-600 mb-2" />
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Confiance</div>
                  <div className="text-[13px] text-zinc-900 font-bold mt-1">Calcul certifié</div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
