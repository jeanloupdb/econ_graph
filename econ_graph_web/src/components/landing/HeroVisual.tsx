"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";

// Grid configuration - larger cards, fewer visible
const CARD_W = 120;
const CARD_H = 52;
const GAP_X = 28;
const GAP_Y = 32;
const ROWS = 5;
const COLS = 10; // More cols for horizontal scroll

const LABELS = [
  "MRR",
  "CAC",
  "LTV",
  "ARR",
  "ROI",
  "Churn",
  "Conv",
  "ARPU",
  "NPS",
  "CLV",
  "Budget",
  "Margin",
  "Leads",
  "Sales",
  "Growth",
  "Revenue",
  "Costs",
  "Users",
  "Trials",
  "Score",
  "Pipeline",
  "Deals",
  "Burn",
  "GMV",
  "AOV",
  "Forecast",
  "Runway",
  "Spend",
  "ROAS",
  "CPA",
  "Profit",
  "Expense",
  "Target",
  "Quota",
  "Funnel",
  "Cohort",
  "Segment",
  "Tier",
  "Plan",
  "Upgrade",
  "Renew",
  "Expand",
  "Retain",
  "Acquire",
  "Convert",
  "Engage",
  "Activate",
  "Onboard",
  "Support",
  "Upsell",
];

const GRID_W = COLS * (CARD_W + GAP_X);
const TOTAL_CARDS = COLS * ROWS;

// Animation settings
const MAX_ACTIVE_CARDS = 5;
const CARD_LIFESPAN_MS = 5000;
const MIN_SPAWN_INTERVAL = 600;
const MAX_SPAWN_INTERVAL = 1400;

// Row scroll speeds - very slow for elegance
const ROW_SPEEDS = [45, 55, 40, 60, 50]; // seconds per cycle (slow!)

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
        const activeCards = prev.filter(
          (c) => currentTime - c.activatedAt < CARD_LIFESPAN_MS
        );

        if (activeCards.length >= MAX_ACTIVE_CARDS) {
          return activeCards;
        }

        const activeIndices = new Set(activeCards.map((c) => c.index));
        const availableIndices = Array.from(
          { length: TOTAL_CARDS },
          (_, i) => i
        ).filter((i) => !activeIndices.has(i));

        if (availableIndices.length === 0) return activeCards;

        const randomIndex =
          availableIndices[Math.floor(Math.random() * availableIndices.length)];

        return [
          ...activeCards,
          { index: randomIndex, activatedAt: currentTime },
        ];
      });

      const nextDelay =
        MIN_SPAWN_INTERVAL +
        Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);
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
    const fadeProgress = (age - fadeStart) / (CARD_LIFESPAN_MS - fadeStart);
    return 1 - fadeProgress;
  };

  const activeCards = cards.filter(
    (c) => now - c.activatedAt < CARD_LIFESPAN_MS
  );
  const activeCardMap = new Map(activeCards.map((c) => [c.index, c]));
  const activeCardSet = new Set(activeCardMap.keys());

  // Generate cards by row for horizontal scrolling
  const rows = Array.from({ length: ROWS }, (_, rowIndex) => {
    const rowCards = [];
    for (let col = 0; col < COLS; col++) {
      const index = rowIndex * COLS + col;
      rowCards.push({
        label: LABELS[index % LABELS.length],
        index,
        col,
      });
    }
    return rowCards;
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Grid container - zoomed in and centered */}
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
        {/* Each row scrolls independently horizontally */}
        {rows.map((rowCards, rowIndex) => (
          <div
            key={rowIndex}
            className="absolute overflow-hidden"
            style={{
              top: rowIndex * (CARD_H + GAP_Y),
              left: 0,
              right: 0,
              height: CARD_H,
            }}
          >
            {/* Scrolling container - duplicated for seamless loop */}
            <motion.div
              className="absolute flex gap-7"
              style={{ height: CARD_H }}
              animate={{
                x: rowIndex % 2 === 0 ? [0, -GRID_W] : [-GRID_W, 0],
              }}
              transition={{
                duration: ROW_SPEEDS[rowIndex],
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {/* First set of cards */}
              {rowCards.map(({ label, index }) => {
                const isActive = activeCardSet.has(index);
                const cardData = activeCardMap.get(index);
                const cardOpacity = cardData
                  ? getCardOpacity(cardData.activatedAt)
                  : 1;

                return (
                  <div
                    key={`${label}-${index}`}
                    className="flex-shrink-0"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                    }}
                  >
                    <div
                      className={`
                        w-full h-full flex items-center justify-center rounded-lg text-[13px] font-medium
                        transition-all duration-700 ease-out
                        ${
                          isActive
                            ? "bg-zinc-800/90 border border-zinc-500/50 text-zinc-100"
                            : "bg-zinc-900/80 border border-zinc-800/60 text-zinc-500"
                        }
                      `}
                      style={{
                        opacity: isActive ? cardOpacity : 1,
                      }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
              {/* Duplicated set for seamless loop */}
              {rowCards.map(({ label, index }) => {
                const isActive = activeCardSet.has(index);
                const cardData = activeCardMap.get(index);
                const cardOpacity = cardData
                  ? getCardOpacity(cardData.activatedAt)
                  : 1;

                return (
                  <div
                    key={`${label}-${index}-dup`}
                    className="flex-shrink-0"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                    }}
                  >
                    <div
                      className={`
                        w-full h-full flex items-center justify-center rounded-lg text-[13px] font-medium
                        transition-all duration-700 ease-out
                        ${
                          isActive
                            ? "bg-zinc-800/90 border border-zinc-500/50 text-zinc-100"
                            : "bg-zinc-900/80 border border-zinc-800/60 text-zinc-500"
                        }
                      `}
                      style={{
                        opacity: isActive ? cardOpacity : 1,
                      }}
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

      {/* Floating Logo - glass card with glow */}
      <div
        className="absolute z-30 pointer-events-none"
        style={{
          right: "24%",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <div className="relative">
          {/* Ambient glow behind card */}
          <div
            className="absolute -inset-10 rounded-full blur-[50px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.12) 40%, transparent 70%)",
            }}
          />

          {/* Glass card for readability */}
          <div className="relative bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-5 shadow-2xl shadow-violet-500/10">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {/* Logo glow */}
                <div className="absolute inset-0 bg-violet-500/25 rounded-xl blur-md scale-125" />
                <div className="relative">
                  <SmartGraphLogo size={44} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-white tracking-[-0.01em]">
                  SmartGraph
                </span>
                <span className="text-[11px] text-zinc-400 font-medium tracking-wider uppercase">
                  Modélisation IA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heavy vignettes - cards fade into darkness at edges */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 45% 55% at 68% 50%, transparent 0%, transparent 15%, rgba(9,9,11,0.4) 35%, rgba(9,9,11,0.85) 55%, rgb(9,9,11) 75%)`,
        }}
      />
      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 h-48 z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgb(9,9,11) 0%, rgb(9,9,11) 40%, transparent 100%)",
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-48 z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgb(9,9,11) 0%, rgb(9,9,11) 40%, transparent 100%)",
        }}
      />
      {/* Left solid + fade */}
      <div
        className="absolute inset-y-0 left-0 w-[36%] z-20 pointer-events-none"
        style={{ background: "rgb(9, 9, 11)" }}
      />
      <div
        className="absolute inset-y-0 left-[36%] w-[20%] z-20 pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgb(9,9,11), transparent)",
        }}
      />
      {/* Right fade */}
      <div
        className="absolute inset-y-0 right-0 w-32 z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(to left, rgb(9,9,11) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
