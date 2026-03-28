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

  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-mono ${
          hasScrolled
            ? "bg-white/90 backdrop-blur-md border-b border-zinc-200"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex h-14 items-center justify-between">
            {/* Logo - Restored Original Component */}
            <Link href="/" className="flex items-center gap-2 group">
              <SmartGraphLogo size={24} />
              <span className="text-[15px] font-bold text-zinc-900 tracking-tight uppercase">
                SmartGraph
              </span>
            </Link>

            {/* Desktop Navigation - Monospace CLI style */}
            <nav className="hidden md:flex items-center gap-1">
              {!user && (
                <div className="flex items-center gap-2 mr-4">
                  <a href="#methode" className="px-3 py-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-widest">
                    ./méthode
                  </a>
                  <a href="#cas" className="px-3 py-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-widest">
                    ./exemples
                  </a>
                </div>
              )}
              {user ? (
                <div className="flex items-center gap-4">
                  <Link href="/dashboard" className="text-[12px] font-bold text-zinc-900 uppercase tracking-wider hover:underline underline-offset-4 decoration-zinc-300">
                    CD /DASHBOARD
                  </Link>
                  <UserMenu />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="px-3 py-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-widest">
                    LOGIN
                  </Link>
                  <Link href="/register">
                    <button className="px-4 py-2 bg-zinc-900 text-white font-bold text-[11px] rounded uppercase tracking-[0.15em] hover:bg-zinc-800 transition-all shadow-sm">
                      START
                    </button>
                  </Link>
                </div>
              )}
            </nav>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-zinc-500 hover:text-zinc-900"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-white/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-14 left-4 right-4 z-50 md:hidden"
            >
              <div className="bg-white border border-zinc-200 rounded-lg shadow-xl overflow-hidden font-mono">
                <div className="p-4 space-y-3">
                  {!user && (
                    <>
                      <a href="#methode" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">./méthode</a>
                      <a href="#cas" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">./exemples</a>
                    </>
                  )}
                  {user ? (
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 bg-zinc-100 text-zinc-900 font-bold text-xs rounded text-center">CD /DASHBOARD</Link>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 text-zinc-600 font-bold text-xs border border-zinc-200 rounded text-center uppercase tracking-widest">LOGIN</Link>
                      <Link href="/register" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 bg-zinc-900 text-white font-bold text-xs rounded text-center uppercase tracking-[0.2em]">START</Link>
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
