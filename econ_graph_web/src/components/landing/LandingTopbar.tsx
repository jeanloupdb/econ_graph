"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Menu, X } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "../chrome/UserMenu";
import { useState } from "react";

export function LandingTopbar() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between rounded-full px-6 py-2">
            <Link href="/" className="flex items-center gap-2">
              <Network className="h-6 w-6 text-white" />
              <span className="text-xl font-bold text-white">EconGraph</span>
            </Link>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard" passHref>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-white text-zinc-900 font-semibold rounded-full"
                    >
                      Ouvrir l&apos;app
                    </motion.button>
                  </Link>
                  <UserMenu />
                </>
              ) : (
                <>
                  <Link href="/login" passHref>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 text-white font-semibold"
                    >
                      Se connecter
                    </motion.button>
                  </Link>
                  <Link href="/register" passHref>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-white text-zinc-900 font-semibold rounded-full"
                    >
                      Commencer gratuitement
                    </motion.button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile burger menu button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-white"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 md:hidden"
          >
            <div className="mx-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex flex-col p-4 space-y-3">
                {user ? (
                  <>
                    <Link href="/dashboard" passHref onClick={() => setIsMenuOpen(false)}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="w-full px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl text-center"
                      >
                        Ouvrir l&apos;app
                      </motion.button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/login" passHref onClick={() => setIsMenuOpen(false)}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="w-full px-4 py-3 text-zinc-900 dark:text-white font-semibold rounded-xl text-center border border-zinc-200 dark:border-zinc-700"
                      >
                        Se connecter
                      </motion.button>
                    </Link>
                    <Link href="/register" passHref onClick={() => setIsMenuOpen(false)}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="w-full px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl text-center"
                      >
                        Commencer gratuitement
                      </motion.button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
