"use client";

import { motion, Variants, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { createDemoProject } from "@/lib/api/demo";
import { API_BASE_URL } from "@/lib/api/client";

const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const up: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 0.8, 0.35, 1] } },
};

const PLACEHOLDERS = [
  "Marge nette d'un restaurant avec 2 salariés...",
  "Rentabilité d'un SaaS à 3 offres...",
  "Impact d'une hausse de prix de 15%...",
  "Business plan d'un e-commerce mode...",
];

const EXAMPLES = [
  "Restaurant 20 couverts/jour",
  "SaaS B2B 3 plans tarifaires",
  "E-commerce avec stock et livraison",
];

export type DemoState =
  | { phase: "idle" }
  | { phase: "generating"; logs: string[]; step?: string }
  | { phase: "done"; demoToken: string; redirectUrl: string }
  | { phase: "error"; message: string };

// ── Step constants ───────────────────────────────────────────────────────────

const STEPS = [
  { id: "init",     label: "Init" },
  { id: "analyze",  label: "Analyse" },
  { id: "build",    label: "Construction" },
  { id: "validate", label: "Validation" },
];

const STEP_TO_INDEX: Record<string, number> = {
  analyste: 1, executeur: 2, validateur: 3, correcteur: 3,
};

const PHASE_MESSAGES: Record<number, string[]> = {
  0: ["Préparation de l'environnement", "Configuration des agents"],
  1: ["Analyse de votre demande", "Identification des variables", "Structuration du modèle"],
  2: ["Création des nœuds", "Génération des formules", "Construction du graphe"],
  3: ["Validation des calculs", "Vérification de la cohérence", "Finalisation"],
};

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function createAuthenticatedProject(prompt: string): Promise<{ task_id: string }> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("prompt", prompt);

  const response = await fetch(`${API_BASE_URL}/ai/agent-project-create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "Erreur lors de la création du projet.");
  }

  return response.json();
}

// ── Inline Progress ──────────────────────────────────────────────────────────
// Replaces the prompt input area during generation — no overlay.

function InlineProgress({ state, onCancel, onReset }: { state: DemoState; onCancel: () => void; onReset: () => void }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const isSuccess = state.phase === "done";

  const currentStepIndex = state.phase === "generating" && state.step
    ? (STEP_TO_INDEX[state.step] ?? 0)
    : isSuccess ? STEPS.length : 0;

  useEffect(() => {
    if (isSuccess) return;
    const msgs = PHASE_MESSAGES[currentStepIndex] || PHASE_MESSAGES[0];
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % msgs.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentStepIndex, isSuccess]);

  const nodeCount = useMemo(() => {
    if (state.phase !== "generating") return 0;
    return state.logs.filter(l =>
      l.includes("✓ Nœud:") || l.includes("Created node") || l.includes("Création du nœud")
    ).length;
  }, [state]);

  const message = useMemo(() => {
    if (isSuccess) return "Votre modèle est prêt";
    const msgs = PHASE_MESSAGES[currentStepIndex] || PHASE_MESSAGES[0];
    return msgs[messageIndex % msgs.length] || msgs[0];
  }, [isSuccess, currentStepIndex, messageIndex]);

  const progress = isSuccess
    ? 100
    : Math.min(92, ((currentStepIndex + 0.5) / STEPS.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="w-full"
    >
      {/* Same rounded-2xl shell as the input */}
      <div className={`rounded-2xl border bg-white overflow-hidden transition-all duration-500 ${
        isSuccess
          ? "border-emerald-200 shadow-lg shadow-emerald-100/50"
          : "border-violet-200 shadow-lg shadow-violet-100/40"
      }`}>
        {/* Thin progress bar at top */}
        <div className="h-[2px] bg-zinc-100">
          <motion.div
            className={isSuccess ? "h-full bg-emerald-400" : "h-full bg-gradient-to-r from-violet-500 to-indigo-500"}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Content — same height as the input (py-3.5 px-5) */}
        <div className="px-5 py-3.5 flex items-center gap-3">
          {/* Animated icon — same position as the › chevron */}
          <div className="shrink-0 w-4 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="spin"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message — same font-mono as input text */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2 }}
                className={`font-mono text-sm truncate ${
                  isSuccess ? "text-emerald-600 font-medium" : "text-zinc-500"
                }`}
              >
                {message}{!isSuccess && nodeCount > 0 && currentStepIndex >= 2 ? ` · ${nodeCount} variables` : ""}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Step indicators — compact, right-aligned */}
          <div className="shrink-0 flex items-center gap-1">
            {STEPS.map((step, index) => {
              const isDone = index < currentStepIndex || isSuccess;
              const isActive = index === currentStepIndex && !isSuccess;
              return (
                <motion.div
                  key={step.id}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    isDone ? "bg-emerald-400 w-3" :
                    isActive ? "bg-violet-500 w-5" :
                    "bg-zinc-200 w-1.5"
                  }`}
                  layout
                />
              );
            })}
          </div>

          {/* Cancel / Open CTA */}
          {!isSuccess ? (
            <button
              onClick={onCancel}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-all active:scale-95"
              aria-label="Annuler"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <a
              href={state.phase === "done" ? state.redirectUrl : "#"}
              className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
            >
              Ouvrir <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Reset link when done */}
      {isSuccess && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.2 }}
          onClick={onReset}
          className="mt-3 text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors underline underline-offset-2 decoration-zinc-300"
        >
          Nouvelle analyse
        </motion.button>
      )}
    </motion.div>
  );
}

// ── Prompt Input ──────────────────────────────────────────────────────────────

function PromptInput({ demoState, onDemoStateChange, cancelRef }: {
  demoState: DemoState;
  onDemoStateChange: (s: DemoState) => void;
  cancelRef: React.MutableRefObject<(() => void) | null>;
}) {
  const [value, setValue] = useState("");
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasDemoToken, setHasDemoToken] = useState(false);
  const logsRef = useRef<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setIsLoggedIn(!!getAuthToken());
    setHasDemoToken(!!localStorage.getItem("sg_demo_token"));
  }, []);

  const isGenerating = demoState.phase === "generating" || demoState.phase === "done";

  useEffect(() => {
    if (isGenerating) return;
    const iv = setInterval(() => {
      setShow(false);
      setTimeout(() => { setIdx((i) => (i + 1) % PLACEHOLDERS.length); setShow(true); }, 280);
    }, 3500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setIsSubmitting(false);
    setError(null);
    onDemoStateChange({ phase: "idle" });
  }, [onDemoStateChange]);

  useEffect(() => {
    cancelRef.current = cancel;
  }, [cancel, cancelRef]);

  const submitPrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    logsRef.current = [];
    onDemoStateChange({ phase: "generating", logs: [] });

    const isAuthenticated = !!getAuthToken();

    try {
      let taskId: string;

      if (isAuthenticated) {
        const result = await createAuthenticatedProject(prompt.trim());
        taskId = result.task_id;
      } else {
        const result = await createDemoProject(prompt.trim());
        taskId = result.task_id;
      }

      const url = `${API_BASE_URL}/ai/agent-status/${taskId}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "log" && data.message) {
            logsRef.current = [...logsRef.current, data.message];
            onDemoStateChange({ phase: "generating", logs: [...logsRef.current], step: data.step });
          }

          if (data.type === "start" || (data.step && data.type !== "complete")) {
            onDemoStateChange({ phase: "generating", logs: [...logsRef.current], step: data.step });
          }

          if (data.type === "complete") {
            es.close();
            eventSourceRef.current = null;

            if (data.status === "success") {
              if (isAuthenticated && data.project_id) {
                onDemoStateChange({ phase: "done", demoToken: "", redirectUrl: `/graph?project=${data.project_id}` });
              } else if (data.demo_token) {
                localStorage.setItem("sg_demo_token", data.demo_token);
                onDemoStateChange({ phase: "done", demoToken: data.demo_token, redirectUrl: `/public/${data.demo_token}` });
              } else {
                setError("Projet créé mais impossible de rediriger.");
                onDemoStateChange({ phase: "idle" });
                setIsSubmitting(false);
              }
            } else {
              setError(data.message || "Erreur lors de la génération.");
              onDemoStateChange({ phase: "idle" });
              setIsSubmitting(false);
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setError("Connexion perdue. Réessayez.");
        onDemoStateChange({ phase: "idle" });
        setIsSubmitting(false);
      };
    } catch (err: any) {
      setError(err.message || "Erreur inattendue.");
      onDemoStateChange({ phase: "idle" });
      setIsSubmitting(false);
    }
  }, [isSubmitting, onDemoStateChange]);

  const submit = useCallback(() => {
    submitPrompt(value);
  }, [value, submitPrompt]);


  // Logged-in: replace input with a dashboard CTA button
  if (isLoggedIn && !isGenerating) {
    return (
      <div className="w-full flex flex-col items-center">
        <a
          href="/dashboard"
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-zinc-200 bg-white shadow-lg shadow-zinc-200/50 hover:border-violet-300 hover:shadow-violet-500/10 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono font-bold text-violet-500 text-base shrink-0 select-none leading-[22px]">›</span>
            <span className="font-mono text-sm text-zinc-400 truncate">{PLACEHOLDERS[idx]}</span>
          </div>
          <span className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-zinc-900 group-hover:text-violet-700 transition-colors whitespace-nowrap">
            Accès à l'IA
            <ArrowRight className="w-4 h-4" />
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <AnimatePresence mode="wait">
        {isGenerating ? (
          <InlineProgress key="progress" state={demoState} onCancel={cancel} onReset={cancel} />
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`rounded-2xl border bg-white shadow-lg shadow-zinc-200/50 focus-within:shadow-violet-500/10 transition-all duration-200 ${
              error ? "border-red-300" : "border-zinc-200 focus-within:border-violet-300"
            }`}>
              <div className="flex items-center gap-3 px-5 py-3.5">
                <span className="font-mono font-bold text-violet-500 text-base shrink-0 select-none leading-[22px]">›</span>
                <div className="flex-1 relative h-[22px]">
                  {!value && (
                    <span
                      className="absolute inset-0 flex items-center pointer-events-none font-mono text-sm text-zinc-400 transition-opacity duration-300 truncate"
                      style={{ opacity: show ? 1 : 0 }}
                      aria-hidden
                    >
                      {PLACEHOLDERS[idx]}
                    </span>
                  )}
                  <input
                    value={value}
                    onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                    disabled={isSubmitting}
                    className="w-full h-full bg-transparent text-zinc-900 font-mono text-sm outline-none disabled:opacity-50"
                    aria-label="Décrivez votre modèle"
                  />
                </div>
                <button
                  onClick={submit}
                  disabled={!value.trim() || isSubmitting}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95"
                  aria-label="Envoyer"
                >
                  {isSubmitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ArrowRight className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[12px] text-red-500 mt-2 text-center"
              >
                {error.includes("Créez un compte") ? (
                  <>
                    Vous avez déjà généré un modèle démo.{" "}
                    <a href="/register" className="underline underline-offset-2 hover:text-red-700 transition-colors">
                      Créez un compte
                    </a>{" "}
                    pour continuer.
                  </>
                ) : error}
              </motion.p>
            )}

            {/* One-click examples */}
            {!isSubmitting && !error && (
              <div className="flex flex-wrap items-center gap-2 mt-3 justify-center">
                <span className="text-[11px] text-zinc-400">Essayez :</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setValue(ex)}
                    className="text-[12px] text-zinc-500 border border-zinc-200 hover:border-violet-300 hover:text-violet-700 rounded-full px-3 py-1 bg-white transition-all hover:shadow-sm"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {/* Demo token upsell */}
            {hasDemoToken && !isSubmitting && !error && (
              <p className="text-[11px] text-zinc-400 mt-3 text-center">
                Vous avez déjà généré un modèle démo.{" "}
                <a href="/register" className="underline underline-offset-2 hover:text-zinc-600 transition-colors">
                  Créer un compte
                </a>{" "}
                ou{" "}
                <a href="/login" className="underline underline-offset-2 hover:text-zinc-600 transition-colors">
                  se connecter
                </a>{" "}
                pour continuer.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export function HeroSection() {
  const [demoState, setDemoState] = useState<DemoState>({ phase: "idle" });
  const cancelRef = useRef<(() => void) | null>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.97]);

  const handleDemoStateChange = useCallback((s: DemoState) => {
    setDemoState(s);
  }, []);

  return (
    <>
      {/* Desktop */}
      <section className="sticky top-0 hidden md:flex items-center justify-center h-[100svh] bg-gradient-to-b from-white via-white to-zinc-50/80">
        <motion.div
          className="flex flex-col items-center text-center w-full max-w-xl px-8 -mt-8"
          variants={fade}
          initial="hidden"
          animate="visible"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <motion.div variants={up} className="mb-10">
            <SmartGraphLogo size={38} />
          </motion.div>

          <motion.h1
            variants={up}
            className="font-bold text-zinc-900 leading-[1.1] tracking-[-0.025em] mb-4"
            style={{ fontSize: "clamp(40px, 4.5vw, 56px)" }}
          >
            Vos chiffres,
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(125deg, #7c3aed 0%, #4f46e5 100%)" }}
            >
              enfin clairs.
            </span>
          </motion.h1>

          <motion.p variants={up} className="text-zinc-500 text-[17px] leading-relaxed mb-10 max-w-sm">
            Décrivez un projet, SmartGraph fait le modèle.
          </motion.p>

          <motion.p variants={up} className="text-[11px] text-zinc-400 mb-3">
            Démo gratuite · Sans inscription
          </motion.p>

          <motion.div variants={up} className="w-full max-w-md">
            <PromptInput demoState={demoState} onDemoStateChange={handleDemoStateChange} cancelRef={cancelRef} />
          </motion.div>
        </motion.div>

      </section>

      {/* Mobile */}
      <section className="sticky top-0 md:hidden flex flex-col items-center justify-center h-[100svh] px-6 pt-20 pb-12 bg-gradient-to-b from-white to-zinc-50/80">
        <motion.div variants={fade} initial="hidden" animate="visible" className="flex flex-col items-center text-center gap-5 w-full" style={{ opacity: heroOpacity, scale: heroScale }}>
          <motion.div variants={up}><SmartGraphLogo size={30} /></motion.div>
          <motion.h1 variants={up}
            className="font-bold text-zinc-900 leading-[1.1] tracking-[-0.025em]"
            style={{ fontSize: "clamp(32px, 9vw, 46px)" }}
          >
            Vos chiffres,{" "}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(125deg, #7c3aed 0%, #4f46e5 100%)" }}>
              enfin clairs.
            </span>
          </motion.h1>
          <motion.p variants={up} className="text-zinc-500 text-[15px] leading-relaxed max-w-xs">
            Décrivez un projet, SmartGraph fait le modèle.
          </motion.p>
          <motion.p variants={up} className="text-[11px] text-zinc-400 -mb-2">
            Démo gratuite · Sans inscription
          </motion.p>
          <motion.div variants={up} className="w-full">
            <PromptInput demoState={demoState} onDemoStateChange={handleDemoStateChange} cancelRef={cancelRef} />
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}

