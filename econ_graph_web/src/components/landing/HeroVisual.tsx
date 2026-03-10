"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";

const CARD_W = 120;
const CARD_H = 52;
const GAP_X = 28;
const GAP_Y = 32;
const ROWS = 5;
const COLS = 10;

const LABELS = [
  "12.3 ans","380€/j","8 mois","+47%","2.4x","18k€/an","6.2%","3/10","Louer","850€/mois",
  "42%","520€","14 mois","+32%","1.8x","24k€","7.1%","4/10","Oui","1 200€",
  "9.5 ans","290€/j","6 mois","+28%","3.1x","15k€/an","5.8%","2/10","Acheter","1 100€",
  "38%","445€/j","18 mois","+41%","2.2x","31k€","8.3%","5/10","Non","2 400€",
  "11.2 ans","350€/j","10 mois","+55%","1.5x","19k€","6.9%","6/10","Garder","780€",
];

const GRID_W = COLS * (CARD_W + GAP_X);
const TOTAL_CARDS = COLS * ROWS;
const MAX_ACTIVE_CARDS = 5;
const CARD_LIFESPAN_MS = 5000;
const MIN_SPAWN_INTERVAL = 600;
const MAX_SPAWN_INTERVAL = 1400;
const ROW_SPEEDS = [45, 55, 40, 60, 50];

type TrackedCard = { index: number; activatedAt: number };

export function HeroVisual() {
  const [cards, setCards] = useState<TrackedCard[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const spawnRandomCard = () => {
      setCards((prev) => {
        const currentTime = Date.now();
        const activeCards = prev.filter((c) => currentTime - c.activatedAt < CARD_LIFESPAN_MS);
        if (activeCards.length >= MAX_ACTIVE_CARDS) return activeCards;
        const activeIndices = new Set(activeCards.map((c) => c.index));
        const availableIndices = Array.from({ length: TOTAL_CARDS }, (_, i) => i).filter((i) => !activeIndices.has(i));
        if (availableIndices.length === 0) return activeCards;
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        return [...activeCards, { index: randomIndex, activatedAt: currentTime }];
      });
      const nextDelay = MIN_SPAWN_INTERVAL + Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);
      setTimeout(spawnRandomCard, nextDelay);
    };

    const initialTimeout = setTimeout(spawnRandomCard, 800);
    return () => clearTimeout(initialTimeout);
  }, []);

  const getCardOpacity = (activatedAt: number): number => {
    const age = now - activatedAt;
    if (age >= CARD_LIFESPAN_MS) return 0;
    const fadeStart = CARD_LIFESPAN_MS * 0.5;
    if (age < fadeStart) return 1;
    return 1 - (age - fadeStart) / (CARD_LIFESPAN_MS - fadeStart);
  };

  const activeCards = cards.filter((c) => now - c.activatedAt < CARD_LIFESPAN_MS);
  const activeCardMap = new Map(activeCards.map((c) => [c.index, c]));
  const activeCardSet = new Set(activeCardMap.keys());

  const rows = Array.from({ length: ROWS }, (_, rowIndex) => {
    const rowCards = [];
    for (let col = 0; col < COLS; col++) {
      const index = rowIndex * COLS + col;
      rowCards.push({ label: LABELS[index % LABELS.length], index, col });
    }
    return rowCards;
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute"
        style={{
          width: "140%",
          height: ROWS * (CARD_H + GAP_Y),
          right: "-20%",
          top: "50%",
          transform: "translateY(-50%) scale(1.15)",
          transformOrigin: "center center",
        }}
      >
        {rows.map((rowCards, rowIndex) => (
          <div
            key={rowIndex}
            className="absolute overflow-hidden"
            style={{ top: rowIndex * (CARD_H + GAP_Y), left: 0, right: 0, height: CARD_H }}
          >
            <motion.div
              className="absolute flex gap-7"
              style={{ height: CARD_H }}
              animate={{ x: rowIndex % 2 === 0 ? [0, -GRID_W] : [-GRID_W, 0] }}
              transition={{ duration: ROW_SPEEDS[rowIndex], repeat: Infinity, ease: "linear" }}
            >
              {[...rowCards, ...rowCards].map(({ label, index }, i) => {
                const isActive = activeCardSet.has(index);
                const cardData = activeCardMap.get(index);
                const cardOpacity = cardData ? getCardOpacity(cardData.activatedAt) : 1;
                return (
                  <div key={`${label}-${index}-${i}`} className="flex-shrink-0" style={{ width: CARD_W, height: CARD_H }}>
                    <div
                      className={`w-full h-full flex items-center justify-center rounded-lg text-[13px] font-medium transition-all duration-700 ease-out
                        ${isActive
                          ? "bg-white border-2 border-violet-300 text-zinc-800 shadow-md shadow-violet-100"
                          : "bg-white/70 border border-zinc-200 text-zinc-400"
                        }`}
                      style={{ opacity: isActive ? cardOpacity : 1 }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Floating Logo card */}
      <div className="absolute z-30 pointer-events-none" style={{ right: "24%", top: "50%", transform: "translateY(-50%)" }}>
        <div className="relative">
          <div className="absolute -inset-10 rounded-full blur-[50px]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)" }} />
          <div className="relative bg-white border border-zinc-200 rounded-2xl px-6 py-5 shadow-xl shadow-zinc-200/60">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-violet-400/10 rounded-xl blur-md scale-125" />
                <div className="relative"><SmartGraphLogo size={44} /></div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-zinc-900 tracking-[-0.01em]">SmartGraph</span>
                <span className="text-[11px] text-zinc-500 font-medium tracking-wider uppercase">Tableur Visuel IA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vignettes — adapted for light background */}
      <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: "radial-gradient(ellipse 45% 55% at 68% 50%, transparent 0%, transparent 15%, rgba(245,245,247,0.4) 35%, rgba(245,245,247,0.85) 55%, rgb(245,245,247) 75%)" }} />
      <div className="absolute inset-x-0 top-0 h-48 z-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgb(255,255,255) 0%, rgb(255,255,255) 40%, transparent 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-48 z-20 pointer-events-none" style={{ background: "linear-gradient(to top, rgb(245,245,247) 0%, rgb(245,245,247) 40%, transparent 100%)" }} />
      <div className="absolute inset-y-0 left-0 w-[36%] z-20 pointer-events-none" style={{ background: "rgb(255,255,255)" }} />
      <div className="absolute inset-y-0 left-[36%] w-[20%] z-20 pointer-events-none" style={{ background: "linear-gradient(to right, rgb(255,255,255), transparent)" }} />
      <div className="absolute inset-y-0 right-0 w-32 z-20 pointer-events-none" style={{ background: "linear-gradient(to left, rgb(245,245,247) 0%, transparent 100%)" }} />
    </div>
  );
}
