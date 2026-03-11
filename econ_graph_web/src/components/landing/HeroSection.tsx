"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { MobileCTA, MobileFeatures, MobileHero } from "./HeroMobile";
import { HeroVisual } from "./HeroVisual";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function HeroSection() {
  return (
    <>
      {/* Mobile */}
      <div className="md:hidden min-h-screen bg-gradient-to-b from-white to-[#f5f5f7]">
        <MobileHero />
        <MobileFeatures />
        <MobileCTA />
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-white to-[#f5f5f7]">

          {/* Scrolling cards background */}
          <div className="absolute inset-0 hidden lg:block overflow-hidden z-0">
            <HeroVisual />
          </div>

          {/* Copy — left side */}
          <div className="relative z-30 w-full px-6 lg:px-12 xl:px-20">
            <motion.div
              className="max-w-xl"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Badge */}
              <motion.div variants={itemVariants} className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-[13px] font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  Pour TPE, consultants & porteurs de projet
                </span>
              </motion.div>

              {/* H1 */}
              <motion.h1
                variants={itemVariants}
                className="text-[2.75rem] lg:text-[3.25rem] xl:text-[3.75rem] font-semibold text-zinc-900 leading-[1.08] tracking-[-0.02em] mb-5"
              >
                De l&apos;idée
                <br />
                à la décision chiffrée.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500">
                  En quelques mots.
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                variants={itemVariants}
                className="text-[17px] text-zinc-500 leading-relaxed mb-8 max-w-md"
              >
                Décrivez votre problème en français. SmartGraph structure
                les variables, relie les chiffres entre eux, et vous dit
                quelle décision prendre — avec un fichier Excel en bonus.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={itemVariants} className="flex items-center gap-3">
                <Link href="/register">
                  <button className="group flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-[14px] rounded-lg shadow-lg transition-all">
                    Commencer gratuitement
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </Link>
                <Link href="/login">
                  <button className="px-4 py-2.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-[14px] rounded-lg transition-colors">
                    Se connecter
                  </button>
                </Link>
              </motion.div>

              <motion.p variants={itemVariants} className="mt-5 text-[12px] text-zinc-400">
                Gratuit · Sans carte bancaire · Export Excel inclus
              </motion.p>

              {/* Social proof */}
              <motion.div variants={itemVariants} className="mt-8 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {["J", "M", "A", "T"].map((initial, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                      {initial}
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-zinc-500">
                  <span className="font-semibold text-zinc-700">+200 modèles</span> générés depuis le lancement
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
          >
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-8 rounded-full border border-zinc-300 flex items-start justify-center p-1.5"
            >
              <div className="w-0.5 h-1.5 rounded-full bg-zinc-400" />
            </motion.div>
          </motion.div>
        </section>
      </div>
    </>
  );
}
