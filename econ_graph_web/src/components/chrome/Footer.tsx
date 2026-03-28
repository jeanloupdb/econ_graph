"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white font-mono">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[14px] font-bold text-zinc-900 tracking-tight">
                [ ✦ ] SMARTGRAPH
              </span>
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed font-sans">
              Transformez vos hypothèses en décisions éclairées avec des modèles économiques générés par IA.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            {/* Product */}
            <div>
              <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Produit</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className="text-[12px] text-zinc-600 hover:text-zinc-900 transition-colors font-bold uppercase tracking-wider">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-[12px] text-zinc-600 hover:text-zinc-900 transition-colors font-bold uppercase tracking-wider">
                    Commencer
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Système</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-[12px] text-zinc-600 hover:text-zinc-900 transition-colors font-bold uppercase tracking-wider">
                    Confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[12px] text-zinc-600 hover:text-zinc-900 transition-colors font-bold uppercase tracking-wider">
                    CGU
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} SMARTGRAPH_STABLE_1.2
          </p>
          <div className="flex gap-4">
            <span className="text-[10px] text-emerald-500 font-bold uppercase">● SYSTEM_ONLINE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
