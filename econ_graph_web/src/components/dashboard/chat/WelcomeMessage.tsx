/**
 * WelcomeMessage — CLI × Linear design
 */

"use client";

import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { cn } from "@/lib/utils";
import { WizardOption, WizardState } from "@/types/wizard";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useRef } from "react";
import { parseInlineMarkdown } from "./types";

interface WelcomeMessageProps {
  state: WizardState;
  onOptionClick: (option: WizardOption) => void;
  onReload: () => void;
  onExcelImport?: (file: File) => void;
  onFocusInput?: () => void;
}

export function WelcomeMessage({ state, onOptionClick, onReload, onExcelImport, onFocusInput }: WelcomeMessageProps) {
  const options = state.currentQuestion?.options || [];
  const title = state.currentQuestion?.question || "Que souhaitez-vous modéliser ?";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    const name = file.name.toLowerCase();
    const validExtension = name.endsWith('.xlsx') || name.endsWith('.xls');
    const validMime = !file.type ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';
    if (validExtension && validMime && onExcelImport) {
      onExcelImport(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center w-full"
    >
      {/* ── Mobile hero ── */}
      <div className="sm:hidden flex flex-col items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <SmartGraphLogo size={18} />
          <span className="font-mono font-semibold text-[11px] text-zinc-700 tracking-widest uppercase">SmartGraph</span>
        </div>
        <p className="text-[15px] font-semibold text-zinc-900 text-center px-6 leading-snug">
          {parseInlineMarkdown(title)}
        </p>
      </div>

      {/* ── Desktop hero ── */}
      <div className="hidden sm:flex flex-col items-center mb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="font-mono font-black text-violet-400 leading-none select-none mb-4"
          style={{ fontSize: "40px", letterSpacing: "-0.02em" }}
        >›</motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="text-[20px] font-bold tracking-tight text-zinc-900 text-center leading-snug mb-2"
        >
          {parseInlineMarkdown(title)}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          className="font-mono text-[10px] text-zinc-400 tracking-widest uppercase"
        >
          Décrivez votre modèle — l&apos;IA fait le reste
        </motion.p>
      </div>

      {!options.length && (
        <p className="text-zinc-400 text-[13px] font-mono">Décrivez votre besoin ci-dessous.</p>
      )}

      {options.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
          className="w-full"
        >
          {/* ── Mobile: scroll horizontal ── */}
          <div className="sm:hidden -mx-4 px-4">
            <div className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {options.map((option, index) => {
                const isOther = option.label.toLowerCase().includes("autre chose");
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 + index * 0.04 }}
                    onClick={() => isOther && onFocusInput ? onFocusInput() : onOptionClick(option)}
                    className={cn(
                      "group flex items-center gap-2.5 px-4 py-3 rounded-xl text-left snap-start shrink-0 w-[68vw] max-w-[240px]",
                      "bg-white border border-zinc-200 transition-all duration-150",
                      isOther
                        ? "border-dashed opacity-60 hover:opacity-100"
                        : "hover:border-violet-300 hover:bg-violet-50/30"
                    )}
                  >
                    <span className="font-mono font-bold text-violet-400 text-sm shrink-0 group-hover:text-violet-600 transition-colors">›</span>
                    <span className="text-[13px] font-medium text-zinc-700 group-hover:text-zinc-900 leading-snug transition-colors">
                      {option.label}
                    </span>
                  </motion.button>
                );
              })}
              <div className="shrink-0 w-4" />
            </div>
          </div>

          {/* ── Desktop: grille 2 colonnes ── */}
          <div className="hidden sm:grid grid-cols-2 gap-1.5 max-w-lg mx-auto">
            {options.map((option, index) => {
              const isOther = option.label.toLowerCase().includes("autre chose");
              const isLastOdd = options.length % 2 !== 0 && index === options.length - 1;
              return (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.25 + index * 0.04 }}
                  onClick={() => isOther && onFocusInput ? onFocusInput() : onOptionClick(option)}
                  className={cn(
                    "group flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-left",
                    "border transition-all duration-150",
                    isLastOdd && "col-span-2",
                    isOther
                      ? "border-dashed border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300"
                      : "border-zinc-200 bg-white hover:border-violet-300 hover:bg-violet-50/30"
                  )}
                >
                  <span className={cn(
                    "font-mono font-bold text-sm shrink-0 transition-colors",
                    isOther ? "text-zinc-300 group-hover:text-zinc-400" : "text-violet-400 group-hover:text-violet-600"
                  )}>›</span>
                  <span className={cn(
                    "text-[13px] font-medium leading-snug transition-colors",
                    isOther ? "text-zinc-400 group-hover:text-zinc-600" : "text-zinc-700 group-hover:text-zinc-900"
                  )}>
                    {option.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Actions row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.45 }}
            className="mt-4 flex items-center justify-center gap-3"
          >
            {onExcelImport && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                › Importer un Excel
              </button>
            )}
            <button
              onClick={onReload}
              title="Autres suggestions"
              aria-label="Autres suggestions"
              className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </motion.div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />
        </motion.div>
      )}
    </motion.div>
  );
}
