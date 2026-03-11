"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UserMenu } from "../chrome/UserMenu";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";

export function LandingTopbar() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Track scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          hasScrolled
            ? "bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.06]"
            : "bg-white/80 backdrop-blur-sm border-b border-zinc-100"
        }`}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
              <SmartGraphLogo size={24} />
              <span className={`text-[15px] font-medium tracking-[-0.01em] transition-colors duration-300 ${hasScrolled ? "text-zinc-200" : "text-zinc-900"}`}>
                SmartGraph
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Section anchors — visible when not logged in */}
              {!user && (
                <div className="flex items-center gap-1 mr-3">
                  <a href="#methode">
                    <button className={`px-3 py-1.5 font-medium text-[13px] transition-colors ${hasScrolled ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-900"}`}>
                      Comment ça marche
                    </button>
                  </a>
                  <a href="#cas">
                    <button className={`px-3 py-1.5 font-medium text-[13px] transition-colors ${hasScrolled ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-900"}`}>
                      Cas d&apos;usage
                    </button>
                  </a>
                </div>
              )}
              {user ? (
                <>
                  <Link href="/dashboard">
                    <button className="px-4 py-1.5 bg-zinc-100 text-zinc-900 font-medium text-[13px] rounded-md hover:bg-white transition-colors">
                      Ouvrir l&apos;app
                    </button>
                  </Link>
                  <div className="ml-1">
                    <UserMenu />
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <button className={`px-3 py-1.5 font-medium text-[13px] transition-colors ${hasScrolled ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-900"}`}>
                      Se connecter
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="px-4 py-1.5 bg-zinc-900 text-white font-medium text-[13px] rounded-md hover:bg-zinc-700 transition-colors">
                      Commencer
                    </button>
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed top-14 left-4 right-4 z-50 md:hidden"
            >
              <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/[0.06] rounded-lg shadow-2xl overflow-hidden">
                <div className="p-3 space-y-1.5">
                  {user ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="block"
                    >
                      <button className="w-full px-4 py-2.5 bg-zinc-100 text-zinc-900 font-medium text-sm rounded-md text-center hover:bg-white transition-colors">
                        Ouvrir l&apos;app
                      </button>
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="block"
                      >
                        <button className="w-full px-4 py-2.5 text-zinc-300 font-medium text-sm rounded-md text-center border border-zinc-700 hover:bg-zinc-800 transition-colors">
                          Se connecter
                        </button>
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setIsMenuOpen(false)}
                        className="block"
                      >
                        <button className="w-full px-4 py-2.5 bg-zinc-100 text-zinc-900 font-medium text-sm rounded-md text-center hover:bg-white transition-colors">
                          Commencer
                        </button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
