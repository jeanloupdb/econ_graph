"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function LandingBackground() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll();

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -400]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -150]);

  return (
    <div ref={ref} className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-white">
      {/* Subtle violet orb — top left */}
      <motion.div
        style={{ y: y1 }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.06, 0.1, 0.06],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] rounded-full bg-violet-400/20 blur-[160px]"
      />

      {/* Indigo orb — top right */}
      <motion.div
        style={{ y: y2 }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.05, 0.08, 0.05],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute top-[20%] right-[-5%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-blue-400/15 blur-[140px]"
      />

      {/* Emerald orb — bottom */}
      <motion.div
        style={{ y: y3 }}
        animate={{
          x: [0, 50, 0],
          opacity: [0.04, 0.07, 0.04],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
        className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-emerald-400/10 blur-[120px]"
      />
    </div>
  );
}
