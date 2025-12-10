"use client";

import Link from "next/link";
import { Network, Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-950">
                <Network className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-white">EconGraph</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Transformez vos hypothèses en décisions éclairées avec des modèles économiques visuels et interactifs.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Produit</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/composites" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Composites
                </Link>
              </li>
              <li>
                <Link href="/graph" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Graph Editor
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Ressources</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Tutoriels
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Entreprise</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  À propos
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              © {new Date().getFullYear()} EconGraph. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
