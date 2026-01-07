"use client";

import Link from "next/link";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-zinc-950">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <SmartGraphLogo size={20} />
              <span className="text-[15px] font-medium text-zinc-100 tracking-[-0.01em]">
                SmartGraph
              </span>
            </div>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Transformez vos hypothèses en décisions éclairées avec des modèles économiques visuels.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-14">
            {/* Product */}
            <div>
              <h3 className="text-[13px] font-medium text-zinc-400 mb-3">Produit</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors">
                    Commencer
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-[13px] font-medium text-zinc-400 mb-3">Légal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors">
                    Confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors">
                    CGU
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-white/[0.04]">
          <p className="text-[12px] text-zinc-600 text-center">
            © {new Date().getFullYear()} SmartGraph. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
