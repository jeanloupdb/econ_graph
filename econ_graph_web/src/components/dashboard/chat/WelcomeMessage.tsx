/**
 * WelcomeMessage - Gemini-style welcome screen with proposal cards.
 * Mobile: logo + name hero, horizontal scroll carousel of proposals.
 * Desktop: centered grid, 2 columns.
 */

"use client";

import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { cn } from "@/lib/utils";
import { WizardOption, WizardState } from "@/types/wizard";
import { motion } from "framer-motion";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useRef } from "react";
import { ICON_MAP, parseInlineMarkdown } from "./types";

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

  const cardClass = cn(
    "group relative flex items-center gap-3 px-4 py-3 rounded-xl text-left",
    "bg-white border border-zinc-200",
    "hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm",
    "transition-all duration-200 ease-out"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center w-full"
    >
      {/* ── Mobile hero: logo + name ───────────────────────────────────────── */}
      <div className="sm:hidden flex flex-col items-center gap-2 mb-6">
        <div className="flex items-center gap-2.5">
          <SmartGraphLogo size={28} className="text-blue-600" />
          <span className="text-lg font-semibold text-zinc-900 tracking-[-0.02em]">SmartGraph</span>
        </div>
        <p className="text-sm text-zinc-500 text-center px-6">
          {parseInlineMarkdown(title)}
        </p>
      </div>

      {/* ── Desktop title ──────────────────────────────────────────────────── */}
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="hidden sm:block text-xl font-medium text-zinc-800 mb-2 tracking-[-0.01em] text-center"
      >
        {parseInlineMarkdown(title)}
      </motion.h1>

      {!options.length && (
        <p className="text-zinc-500 text-sm">
          Décrivez votre besoin ci-dessous.
        </p>
      )}

      {options.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="w-full"
        >
          {/* ── Mobile: horizontal scroll carousel ──────────────────────────── */}
          <div className="sm:hidden -mx-4 px-4">
            <div
              className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" }}
            >
              {options.map((option, index) => {
                const IconComponent = option.icon ? ICON_MAP[option.icon] : null;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                    onClick={() => {
                      if (option.label.toLowerCase().includes("autre chose") && onFocusInput) {
                        onFocusInput();
                      } else {
                        onOptionClick(option);
                      }
                    }}
                    className={cn(cardClass, "snap-start shrink-0 w-[72vw] max-w-[260px]")}
                  >
                    {IconComponent && (
                      <div className="text-zinc-400 group-hover:text-blue-500 shrink-0 transition-colors duration-200">
                        <IconComponent className="w-4 h-4" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-zinc-700 group-hover:text-blue-700 transition-colors leading-snug">
                      {option.label}
                    </span>
                  </motion.button>
                );
              })}
              {/* Trailing spacer for last card visibility */}
              <div className="shrink-0 w-4" />
            </div>
          </div>

          {/* ── Desktop: 2-column grid ────────────────────────────────────── */}
          <div className="hidden sm:grid grid-cols-2 gap-2.5 max-w-xl mx-auto mt-8">
            {options.map((option, index) => {
              const IconComponent = option.icon ? ICON_MAP[option.icon] : null;
              const isOtherCta = option.label.toLowerCase().includes("autre chose");
              const isLastOdd = options.length % 2 !== 0 && index === options.length - 1;
              return (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                  onClick={() => {
                    if (isOtherCta && onFocusInput) {
                      onFocusInput();
                    } else {
                      onOptionClick(option);
                    }
                  }}
                  className={cn(
                    cardClass,
                    isLastOdd && "col-span-2",
                    isOtherCta && "border-dashed opacity-60 hover:opacity-100"
                  )}
                >
                  {IconComponent && (
                    <div className="text-zinc-400 group-hover:text-blue-500 transition-colors duration-200 shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-zinc-700 group-hover:text-blue-700 transition-colors">
                    {option.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Actions row: Excel import + reload */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="mt-4 sm:mt-5 flex items-center justify-center gap-2"
          >
            {onExcelImport && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "group flex items-center gap-2 px-3.5 py-2 rounded-lg",
                  "text-[13px] text-zinc-500 hover:text-zinc-700",
                  "border border-dashed border-zinc-300 hover:border-zinc-400",
                  "hover:bg-zinc-50 transition-all duration-200"
                )}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
                <span>Importer un Excel</span>
              </button>
            )}
            <button
              onClick={onReload}
              title="Autres idées"
              aria-label="Autres idées"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
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
