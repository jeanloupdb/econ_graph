"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, Circle, Triangle, Hexagon, Sparkles } from "lucide-react";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { HeroSection } from "./HeroSection";
import { LandingTopbar } from "./LandingTopbar";
import { cn } from "@/lib/utils";

// ── Animation Helpers ────────────────────────────────────────────────────────

function NumberTicker({ value, unit = "" }: { value: number; unit?: string }) {
  const [displayValue, setValue] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      let start = 0;
      const end = value;
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);

        const current = Math.floor(easeOutQuart * end);
        setValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setValue(end);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {displayValue.toLocaleString("fr-FR")} {unit}
    </span>
  );
}

function Reveal({ children, delay = 0, y = 20 }: { children: React.ReactNode; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

// ── Styled Slider ────────────────────────────────────────────────────────────

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("auth_token"));
  }, []);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <SmartGraphLogo size={18} />
          <span className="text-sm font-semibold text-zinc-900 tracking-tight">SmartGraph</span>
        </Link>
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
            className="flex items-center gap-2 text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <SmartGraphLogo size={14} forceHover={logoHovered} />
            Accès à l'IA
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors px-3 py-1.5 rounded-lg">
              Connexion
            </Link>
            <Link href="/register" className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors">
              Essayer
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

// ── Styled Slider ────────────────────────────────────────────────────────────

function LandingSlider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
  color = "blue",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  color?: "blue" | "violet";
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const trackColor = color === "blue" ? "bg-blue-500" : "bg-violet-500";
  const thumbBorder = color === "blue" ? "border-blue-500" : "border-violet-500";
  const thumbShadow = color === "blue" ? "shadow-blue-200" : "shadow-violet-200";
  const valueBg = color === "blue" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <span className={cn("text-xs font-bold tabular-nums px-2 py-0.5 rounded-md", valueBg)}>
          {value} {unit}
        </span>
      </div>
      <div className="relative h-6 flex items-center group">
        {/* Track bg */}
        <div className="absolute inset-x-0 h-[5px] rounded-full bg-zinc-100" />
        {/* Track fill */}
        <div
          className={cn("absolute left-0 h-[5px] rounded-full transition-none", trackColor)}
          style={{ width: `${pct}%` }}
        />
        {/* Thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md pointer-events-none transition-shadow",
            thumbBorder, thumbShadow,
            "group-hover:shadow-lg group-hover:scale-110"
          )}
          style={{ left: `calc(${pct}% - 8px)` }}
        />
        {/* Invisible native input */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-grab active:cursor-grabbing"
        />
      </div>
    </div>
  );
}

// ── App Preview Section ──────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function AppPreviewSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D tilt effect
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [2, -2]), { stiffness: 200, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-2, 2]), { stiffness: 200, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };
  const handleMouseLeave = () => { mouseX.set(0.5); mouseY.set(0.5); };

  // Mini model data — two sliders
  const [prix, setPrix] = useState(22);
  const [couvertsManuel, setCouvertsManuel] = useState(45);
  const [scenario, setScenario] = useState<"base" | "ete">("base");
  const couverts = scenario === "ete" ? 70 : couvertsManuel;
  const charges = 18000;
  const ca = prix * couverts * 30;
  const marge = ca - charges;
  const tauxMarge = ca > 0 ? (marge / ca) * 100 : 0;

  return (
    <section ref={ref} className="py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-medium text-violet-600 mb-3">Votre modèle, en un coup d&apos;oeil</p>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">
            Bougez un paramètre, tout se recalcule.
          </h2>
        </motion.div>

        {/* App preview with 3D tilt */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ perspective: 1200 }}
          className="mx-auto max-w-4xl"
        >
          <motion.div
            style={{ rotateX, rotateY }}
            className="rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-200/40 overflow-hidden"
          >
            {/* Fake topbar — desktop only */}
            <div className="hidden md:flex h-10 bg-zinc-50 border-b border-zinc-100 items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <SmartGraphLogo size={12} />
                  <span>Mon Restaurant — SmartGraph</span>
                </div>
              </div>
              <div className="flex gap-1 p-0.5 bg-zinc-200/80 rounded-md">
                {(["base", "ete"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setScenario(key)}
                    className={cn(
                      "text-[10px] font-medium px-2.5 py-0.5 rounded transition-all",
                      scenario === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    {key === "base" ? "Base" : "Saison Haute"}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile scenario switcher */}
            <div className="md:hidden flex items-center justify-center gap-1 p-2 border-b border-zinc-100 bg-zinc-50">
              {(["base", "ete"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setScenario(key)}
                  className={cn(
                    "text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all",
                    scenario === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"
                  )}
                >
                  {key === "base" ? "Base" : "Saison Haute"}
                </button>
              ))}
            </div>

            {/* Desktop: 3-column layout */}
            <div className="hidden md:grid grid-cols-3 divide-x divide-zinc-100">

              {/* Parameters */}
              <div className="p-6">
                <Reveal delay={0.1}>
                  <div className="flex items-center gap-2 mb-5">
                    <Circle className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Paramètres</span>
                  </div>

                  <div className="space-y-5">
                    <LandingSlider
                      label="Prix moyen / couvert"
                      value={prix}
                      min={8}
                      max={45}
                      unit="€"
                      onChange={setPrix}
                      color="blue"
                    />
                    <LandingSlider
                      label="Couverts / jour"
                      value={couverts}
                      min={10}
                      max={120}
                      unit=""
                      onChange={(v) => { if (scenario === "base") setCouvertsManuel(v); }}
                      color="blue"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-medium text-zinc-500">Charges / mois</span>
                      <span className="text-xs font-bold tabular-nums text-zinc-700">{fmt(charges)} €</span>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Calculations */}
              <div className="p-6">
                <Reveal delay={0.2}>
                  <div className="flex items-center gap-2 mb-5">
                    <Triangle className="w-2.5 h-2.5 text-violet-500 fill-violet-500 rotate-90" />
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Calculs</span>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
                      <span className="text-xs font-medium text-zinc-500">CA mensuel</span>
                      <div className="text-2xl font-bold text-zinc-900 tabular-nums mt-1.5 tracking-tight">
                        <NumberTicker value={ca} unit="€" />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5 font-mono">= {prix} x {couverts} x 30</p>
                    </div>

                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
                      <span className="text-xs font-medium text-zinc-500">Charges fixes</span>
                      <div className="text-2xl font-bold text-zinc-900 tabular-nums mt-1.5 tracking-tight">
                        <NumberTicker value={charges} unit="€" />
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Results */}
              <div className="p-6">
                <Reveal delay={0.3}>
                  <div className="flex items-center gap-2 mb-5">
                    <Hexagon className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500" />
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Résultats</span>
                  </div>

                  <div className="space-y-3">
                    <div className={cn(
                      "rounded-xl border p-4 transition-all duration-500",
                      marge >= 0 ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"
                    )}>
                      <span className="text-xs font-medium text-zinc-500">Marge nette</span>
                      <div className={cn(
                          "text-3xl font-bold tabular-nums mt-1.5 tracking-tight transition-colors duration-300",
                          marge >= 0 ? "text-emerald-600" : "text-red-500"
                        )}
                      >
                        {marge < 0 && "-"}
                        <NumberTicker value={Math.abs(marge)} unit="€" />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5 font-mono">= {fmt(ca)} - {fmt(charges)}</p>
                    </div>

                    <div className={cn(
                      "rounded-xl border p-4 transition-all duration-500",
                      marge >= 0 ? "border-emerald-100 bg-emerald-50/30" : "border-red-100 bg-red-50/30"
                    )}>
                      <span className="text-xs font-medium text-zinc-500">Taux de marge</span>
                      <div className={cn(
                        "text-2xl font-bold tabular-nums mt-1.5 tracking-tight transition-colors duration-300",
                        tauxMarge >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {tauxMarge.toFixed(1)} %
                      </div>
                      {/* Mini bar */}
                      <div className="mt-2.5 h-1 rounded-full bg-zinc-100 overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", tauxMarge >= 0 ? "bg-emerald-400" : "bg-red-400")}
                          animate={{ width: `${Math.max(0, Math.min(100, Math.abs(tauxMarge)))}%` }}
                          transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        />
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            {/* Mobile: 2-column compact layout (Params + Result) */}
            <div className="md:hidden grid grid-cols-2 divide-x divide-zinc-100">
              {/* Parameters */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-4">
                  <Circle className="w-2 h-2 text-blue-500 fill-blue-500" />
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Paramètres</span>
                </div>
                <div className="space-y-4">
                  <LandingSlider
                    label="Prix / couvert"
                    value={prix}
                    min={8}
                    max={45}
                    unit="€"
                    onChange={setPrix}
                    color="blue"
                  />
                  <LandingSlider
                    label="Couverts / jour"
                    value={couverts}
                    min={10}
                    max={120}
                    unit=""
                    onChange={(v) => { if (scenario === "base") setCouvertsManuel(v); }}
                    color="blue"
                  />
                </div>
              </div>

              {/* Result — single key metric */}
              <div className="p-4 flex flex-col items-center justify-center bg-zinc-50/40">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Marge nette</span>
                <motion.div
                  key={marge}
                  initial={{ scale: 1.06 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={cn(
                    "text-3xl font-bold tabular-nums tracking-tight transition-colors duration-300",
                    marge >= 0 ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {marge >= 0 ? "+" : ""}{fmt(marge)} €
                </motion.div>
                <p className="text-[10px] text-zinc-400 mt-2 font-mono">/ mois</p>
                <div className="mt-3 w-full h-1 rounded-full bg-zinc-100 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", tauxMarge >= 0 ? "bg-emerald-400" : "bg-red-400")}
                    animate={{ width: `${Math.max(0, Math.min(100, Math.abs(tauxMarge)))}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-bold mt-1.5 tabular-nums",
                  tauxMarge >= 0 ? "text-emerald-600" : "text-red-500"
                )}>
                  {tauxMarge.toFixed(0)}% de marge
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-zinc-400 mt-5"
        >
          Bougez les curseurs ou changez de scénario.
        </motion.p>
      </div>
    </section>
  );
}

// ── Value Proposition ─────────────────────────────────────────────────────────

const PAIRS = [
  {
    label: "Dépendances",
    before: "Chercher quelle cellule impacte quel résultat",
    after: "Les dépendances sont visibles d'un coup d'œil",
  },
  {
    label: "Scénarios",
    before: "Dupliquer des onglets pour tester un scénario",
    after: "Comparez vos hypothèses côte à côte, en temps réel",
  },
  {
    label: "Génération IA",
    before: "Partir d'une feuille blanche pour un prévisionnel",
    after: "Décrivez votre activité, l'IA fait le reste",
  },
];

function ValuePropSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [idx, setIdx] = useState(0);
  const [userPicked, setUserPicked] = useState(false);

  useEffect(() => {
    if (userPicked) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % PAIRS.length);
    }, 6000);
    return () => clearInterval(t);
  }, [userPicked]);

  const pair = PAIRS[idx];

  return (
    <section ref={ref} className="py-28 px-6 bg-zinc-50/60">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-violet-600 mb-3 uppercase tracking-widest font-mono">./avant_après</p>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">
              La fin du bricolage Excel.
            </h2>
          </div>
        </Reveal>

        <div className="space-y-12">
          {/* Desktop: 3-col layout */}
          <div className="hidden md:grid grid-cols-[1fr_48px_1fr] items-center">
            {/* Before — struck through */}
            <div className="text-right">
              <Reveal delay={0.1} y={0}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`before-${idx}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
                    className="text-3xl lg:text-4xl font-bold text-zinc-300 line-through decoration-zinc-300 decoration-2 leading-tight"
                  >
                    {pair.before}
                  </motion.p>
                </AnimatePresence>
              </Reveal>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <Reveal delay={0.2} y={0}>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight className="w-5 h-5 text-zinc-300" />
                </motion.div>
              </Reveal>
            </div>

            {/* After — bold and clear */}
            <div>
              <Reveal delay={0.3} y={0}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`after-${idx}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
                    className="text-3xl lg:text-4xl font-bold text-zinc-900 leading-tight"
                  >
                    {pair.after}
                  </motion.p>
                </AnimatePresence>
              </Reveal>
            </div>
          </div>

          {/* Mobile: stacked before/after */}
          <div className="md:hidden text-center">
            <Reveal delay={0.1}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`mobile-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                  className="space-y-3"
                >
                  <p className="text-sm text-zinc-400 line-through decoration-zinc-300">
                    {pair.before}
                  </p>
                  <p className="text-xl font-bold text-zinc-900 leading-snug">
                    {pair.after}
                  </p>
                </motion.div>
              </AnimatePresence>
            </Reveal>
          </div>

          {/* Tab indicators */}
          <Reveal delay={0.4}>
            <div className="flex items-center justify-center gap-1 mt-14 bg-zinc-100 rounded-lg p-1 w-fit mx-auto">
              {PAIRS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setIdx(i); setUserPicked(true); }}
                  className={cn(
                    "relative px-4 py-2 text-xs font-semibold rounded-md transition-all",
                    i === idx ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {i === idx && (
                    <motion.div
                      layoutId="valueprop-tab"
                      className="absolute inset-0 bg-white rounded-md shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{p.label}</span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Use Cases ────────────────────────────────────────────────────────────────

const USE_CASES = [
  { label: "Restaurant", prompt: "Marge nette d'un restaurant 20 couverts/jour" },
  { label: "SaaS B2B", prompt: "Rentabilité d'un SaaS à 3 plans tarifaires" },
  { label: "E-commerce", prompt: "Business plan e-commerce avec stock et livraison" },
  { label: "Immobilier", prompt: "Rendement locatif d'un T2 à Lyon avec charges" },
];

function UseCasesSection() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-violet-600 mb-3 uppercase tracking-widest font-mono">./cas_d_usage</p>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">
              Un modèle pour chaque métier.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {USE_CASES.map((uc, i) => (
            <Reveal key={uc.label} delay={0.1 + i * 0.1}>
              <Link
                href={`/register`}
                className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/30 transition-all"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-violet-50 transition-colors">
                  <Sparkles className="w-4 h-4 text-zinc-400 group-hover:text-violet-500 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-zinc-900">{uc.label}</span>
                  <p className="text-xs text-zinc-400 truncate">{uc.prompt}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ──────────────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-28 px-6 bg-zinc-50/60">
      <Reveal y={30}>
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight mb-3">
            Prêt à modéliser ?
          </h2>
          <p className="text-zinc-500 text-[15px] mb-8">
            Gratuit, sans carte bancaire. Export Excel inclus.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-zinc-900 text-white font-medium text-sm rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Commencer gratuitement <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-zinc-100 py-6 px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SmartGraphLogo size={14} />
          <span className="text-xs text-zinc-400">SmartGraph</span>
        </div>
        <div className="flex gap-4">
          <Link href="/terms" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">CGU</Link>
          <Link href="/login" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Connexion</Link>
        </div>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-violet-500/10">
      <LandingTopbar />
      
      <main className="relative">
        <HeroSection />
        
        {/* Modern Card Overlapping Hero */}
        <div className="relative z-10 bg-white/70 backdrop-blur-2xl rounded-t-[2.5rem] md:rounded-t-[4rem] shadow-[0_-12px_60px_rgba(0,0,0,0.05)] -mt-16 md:-mt-24 border-t border-white/60">
          <div className="relative z-10">
            <AppPreviewSection />
            <ValuePropSection />
            <UseCasesSection />
            <CtaSection />
            <Footer />
          </div>
          
          {/* Suble inner glow effect */}
          <div className="absolute inset-0 rounded-t-[2.5rem] md:rounded-t-[4rem] pointer-events-none bg-gradient-to-b from-white/20 to-transparent z-0" />
        </div>
      </main>
    </div>
  );
}

