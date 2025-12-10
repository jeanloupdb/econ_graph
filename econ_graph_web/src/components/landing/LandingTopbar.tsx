"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { motion } from "framer-motion";
import { Network } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "../chrome/UserMenu";

export function LandingTopbar() {
  const { user } = useAuth();

  return (
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
          <div className="flex items-center gap-4">
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
        </div>
      </div>
    </motion.div>
  );
}
