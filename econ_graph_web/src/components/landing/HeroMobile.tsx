"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Download, Network, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// ── Types & data ─────────────────────────────────────────────────────────────
type ScenarioKey = "normal" | "optimiste" | "pessimiste";
const ORDER: ScenarioKey[] = ["normal", "optimiste", "pessimiste"];
const SCENARIOS: Record<ScenarioKey, {
  label: string;
  params: { l: string; v: string }[];
  results: { l: string; v: string; d: string | null; pos: boolean | null }[];
}> = {
  normal: {
    label: "Normal",
    params: [{ l: "Deals / vendeur", v: "4" }, { l: "Panier moyen", v: "3 200 €" }, { l: "Taux conv.", v: "12%" }],
    results: [{ l: "CA mensuel", v: "64 000 €", d: null, pos: null }, { l: "Profit net", v: "41 500 €", d: null, pos: null }],
  },
  optimiste: {
    label: "Optimiste",
    params: [{ l: "Deals / vendeur", v: "7" }, { l: "Panier moyen", v: "3 800 €" }, { l: "Taux conv.", v: "18%" }],
    results: [{ l: "CA mensuel", v: "112 000 €", d: "+75%", pos: true }, { l: "Profit net", v: "89 500 €", d: "+116%", pos: true }],
  },
  pessimiste: {
    label: "Pessimiste",
    params: [{ l: "Deals / vendeur", v: "2" }, { l: "Panier moyen", v: "2 800 €" }, { l: "Taux conv.", v: "7%" }],
    results: [{ l: "CA mensuel", v: "28 000 €", d: "−56%", pos: false }, { l: "Profit net", v: "13 500 €", d: "−67%", pos: false }],
  },
};

const STEPS = [
  { num: "01", tag: "IA",      icon: Sparkles, iconColor: "text-violet-400", iconBg: "bg-violet-500/[0.08]", border: "border-violet-800/40", numColor: "text-violet-400", title: "Décrivez votre modèle",  desc: "L'IA structure variables, formules et dépendances." },
  { num: "02", tag: "Cascade", icon: Network,  iconColor: "text-blue-400",   iconBg: "bg-blue-500/[0.08]",   border: "border-blue-800/40",   numColor: "text-blue-400",   title: "L'impact se propage",   desc: "Modifiez un chiffre — tout recalcule en cascade." },
  { num: "03", tag: "Excel",   icon: Download, iconColor: "text-emerald-400", iconBg: "bg-emerald-500/[0.08]", border: "border-emerald-800/40", numColor: "text-emerald-400", title: "Exportez en Excel",     desc: "Scénarios comparés, mis en forme, prêts à partager." },
];

const easeOut = [0.22, 0.61, 0.36, 1] as [number, number, number, number];

// ── Hero — plein écran, centré ───────────────────────────────────────────────
export function MobileHero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-violet-500/[0.08] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-indigo-500/[0.05] rounded-full blur-[80px] pointer-events-none" />

      <motion.div
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="visible"
        className="relative flex flex-col items-center"
      >
        {/* Badge */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } } }}
          className="mb-7"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-medium tracking-wide">
            <Sparkles className="w-3 h-3" />
            IA · Modélisation · Export Excel
          </span>
        </motion.div>

        {/* H1 */}
        <motion.h1
          variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } } }}
          className="text-[2.1rem] font-semibold text-zinc-100 leading-[1.1] tracking-[-0.025em] mb-5"
        >
          Du brainstorming
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400">
            au modèle Excel.
          </span>
          <br />
          <span className="text-zinc-400">En quelques mots.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } } }}
          className="text-zinc-400 text-[14px] leading-relaxed mb-9 max-w-[280px]"
        >
          Décrivez votre modèle économique. SmartGraph génère le graphe, calcule en cascade, compare vos scénarios et exporte en Excel.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } } }}
          className="flex flex-col items-center gap-3 w-full max-w-[280px]"
        >
          <Link href="/register" className="w-full">
            <button className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-zinc-100 text-zinc-900 font-semibold text-[14px] rounded-xl hover:bg-white transition-colors">
              Essayer gratuitement
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/login">
            <button className="text-zinc-500 font-medium text-[13px] transition-colors hover:text-zinc-300">
              Se connecter →
            </button>
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.p
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5, delay: 0.4 } } }}
          className="mt-6 text-[11px] text-zinc-500"
        >
          Gratuit · Sans carte bancaire · Export Excel inclus
        </motion.p>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border border-zinc-700/50 flex items-start justify-center p-1.5"
        >
          <div className="w-0.5 h-1.5 rounded-full bg-zinc-600" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Features = Demo + Steps + CTA ───────────────────────────────────────────
export function MobileFeatures() {
  return (
    <>
      <ScenarioSection />
      <StepsSection />
      <CtaSection />
    </>
  );
}

// ── Scenario widget ──────────────────────────────────────────────────────────
function ScenarioSection() {
  const [active, setActive] = useState<ScenarioKey>("normal");
  const [userPicked, setUserPicked] = useState(false);
  const data = SCENARIOS[active];

  useEffect(() => {
    if (userPicked) return;
    const t = setTimeout(() => setActive(p => ORDER[(ORDER.indexOf(p) + 1) % 3]), 3200);
    return () => clearTimeout(t);
  }, [active, userPicked]);

  return (
    <section className="px-5 py-16 border-t border-white/[0.06]">
      {/* Section header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-500 mb-3">Simulation de scénarios</p>
        <h2 className="text-[1.45rem] font-semibold text-zinc-100 tracking-[-0.02em] leading-[1.2]">
          Testez vos hypothèses.
          <br />
          <span className="text-zinc-400">L&apos;impact se propage.</span>
        </h2>
      </motion.div>

      {/* Widget */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.55, delay: 0.1, ease: easeOut }}
        className="rounded-2xl border border-zinc-800/80 bg-[#0C0C0C] overflow-hidden"
      >
        {/* Chrome */}
        <div className="h-9 border-b border-zinc-800/60 bg-zinc-900/60 flex items-center px-4 gap-1.5">
          {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-zinc-700/60" />)}
          <span className="ml-auto text-[10px] font-mono text-zinc-600">forecast.sg</span>
        </div>

        <div className="p-4">
          {/* Switcher */}
          <div className="relative flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 mb-5">
            {ORDER.map((key) => (
              <button
                key={key}
                onClick={() => { setUserPicked(true); setActive(key); }}
                className="relative flex-1 py-2 text-[11px] font-mono transition-colors z-10"
              >
                {active === key && (
                  <motion.div
                    layoutId="m-pill"
                    className="absolute inset-0 bg-zinc-800 rounded-md border border-zinc-700/40"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className={`relative z-10 ${active === key ? "text-zinc-100" : "text-zinc-500"}`}>
                  {SCENARIOS[key].label}
                </span>
              </button>
            ))}
          </div>

          {/* Grid: params | results */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Params */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-3">Hypothèses</p>
                <div className="space-y-3">
                  {data.params.map(p => (
                    <div key={p.l}>
                      <p className="text-[9px] text-zinc-500 font-mono mb-0.5">{p.l}</p>
                      <p className="text-[13px] font-mono font-semibold text-zinc-200 tabular-nums">{p.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-3">Résultats</p>
                <div className="space-y-3">
                  {data.results.map((r, i) => (
                    <div key={r.l}>
                      <p className="text-[9px] text-zinc-500 font-mono mb-0.5">{r.l}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13px] font-mono font-bold text-zinc-100 tabular-nums">{r.v}</p>
                        {r.d && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.07 + 0.15 }}
                            className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.5 rounded ${r.pos ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"}`}
                          >
                            {r.pos ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                            {r.d}
                          </motion.span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}

// ── Steps ────────────────────────────────────────────────────────────────────
function StepsSection() {
  return (
    <section className="px-5 py-16 border-t border-white/[0.06]">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-500 mb-3">Comment ça marche</p>
        <h2 className="text-[1.45rem] font-semibold text-zinc-100 tracking-[-0.02em] leading-[1.2]">
          De la description
          <br />
          <span className="text-zinc-400">au fichier Excel.</span>
        </h2>
      </motion.div>

      <div className="space-y-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: easeOut }}
              className={`flex items-center gap-4 p-4 rounded-2xl border ${s.border} bg-zinc-900/30`}
            >
              {/* Icon box */}
              <div className={`w-11 h-11 rounded-xl ${s.iconBg} border ${s.border} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${s.iconColor}`} strokeWidth={1.5} />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-mono font-bold ${s.numColor}`}>{s.num}</span>
                  <span className={`text-[9px] font-mono uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border ${s.numColor} border-current opacity-50`}>{s.tag}</span>
                </div>
                <p className="text-[13px] font-semibold text-zinc-200 tracking-[-0.01em] mb-0.5">{s.title}</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────────────
function CtaSection() {
  return (
    <section className="px-6 py-16 border-t border-white/[0.06] text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] bg-violet-500/[0.05] rounded-full blur-[80px]" />
      </div>
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.55, ease: easeOut }}
      >
        <h2 className="text-[1.6rem] font-semibold text-zinc-100 tracking-[-0.025em] leading-[1.15] mb-3">
          Décrivez votre
          <br />premier modèle.
        </h2>
        <p className="text-zinc-400 text-[13px] leading-relaxed mb-8 max-w-[240px] mx-auto">
          Quelques mots suffisent. Graphe, calculs, scénarios, export.
        </p>
        <Link href="/register" className="block">
          <button className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-zinc-100 text-zinc-900 font-semibold text-[14px] rounded-xl hover:bg-white transition-colors">
            Commencer gratuitement
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
        <p className="mt-4 text-zinc-500 text-[11px]">Gratuit · Sans carte bancaire</p>
      </motion.div>
    </section>
  );
}

export function MobileCTA() { return null; }
