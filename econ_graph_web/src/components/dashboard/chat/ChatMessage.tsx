/**
 * ChatMessage - Minimal message components
 */

"use client";

import { Button } from "@/components/ui/button";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { cn } from "@/lib/utils";
import { WizardOption } from "@/types/wizard";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Pencil,
  Rocket,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Message } from "./types";

// ============================================
// TYPING DOTS
// ============================================

export function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ============================================
// PARSE INLINE MARKDOWN
// ============================================

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-zinc-900 font-medium">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ============================================
// MARKDOWN CONTENT
// ============================================

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="text-zinc-800 text-[14px] leading-relaxed space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        const bulletMatch = line.match(/^[\s]*[•\-\*]\s*(.*)$/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex items-start gap-2 ml-1">
              <span className="text-zinc-400 mt-1.5 text-[10px]">–</span>
              <span>{parseInlineMarkdown(bulletMatch[1])}</span>
            </div>
          );
        }

        return <p key={i}>{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

// ============================================
// BRIEF CONTENT
// ============================================

function BriefContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1 font-mono text-xs leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        if (line.match(/^[A-ZÉÈÀÙ\s]+(\s*:|\s*\()/) || line.match(/^[A-ZÉÈÀÙ]{3,}/)) {
          return (
            <div key={i} className="text-zinc-400 font-semibold pt-2 first:pt-0 uppercase text-[10px] tracking-wider">
              {line}
            </div>
          );
        }

        if (line.match(/^[\s]*[-•]\s/)) {
          return (
            <div key={i} className="text-zinc-700 pl-2 flex">
              <span className="text-zinc-400 mr-2">-</span>
              <span>{parseInlineMarkdown(line.replace(/^[\s]*[-•]\s*/, ''))}</span>
            </div>
          );
        }

        if (line.match(/^[\s]*\d+\.\s/)) {
          const match = line.match(/^([\s]*\d+\.\s*)(.*)/);
          return (
            <div key={i} className="text-zinc-700 pl-2">
              <span className="text-zinc-400">{match?.[1]}</span>
              {parseInlineMarkdown(match?.[2] || '')}
            </div>
          );
        }

        if (i === 0) {
          return (
            <div key={i} className="text-zinc-900 font-medium text-sm pb-2 border-b border-zinc-200 mb-2">
              {parseInlineMarkdown(line)}
            </div>
          );
        }

        return (
          <div key={i} className="text-zinc-500">
            {parseInlineMarkdown(line)}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// EDITABLE BRIEF BLOCK
// ============================================

function EditableBriefBlock({
  originalPrompt,
  onCreateProject,
}: {
  originalPrompt: string;
  onCreateProject: (customPrompt?: string) => void;
  embedded?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState(originalPrompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + "px";
    }
  }, [isEditing]);

  return (
    <div className="border-t border-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200">
        <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">› Brief généré</span>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Modifier
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-500 transition-colors"
          >
            <Check className="w-3 h-3" />
            Terminé
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-2.5">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[12px] font-mono text-zinc-700 focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 outline-none resize-none min-h-[120px] custom-scrollbar"
            spellCheck={false}
          />
        ) : (
          <div className="max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
            <BriefContent content={prompt} />
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-3 flex items-center gap-2">
        {isEditing && prompt !== originalPrompt && (
          <button
            onClick={() => { setPrompt(originalPrompt); setIsEditing(false); }}
            className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-1 shrink-0"
          >
            Rétablir
          </button>
        )}
        <Button
          onClick={() => onCreateProject(prompt !== originalPrompt ? prompt : undefined)}
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium h-9 text-[13px] transition-all rounded-lg"
        >
          <Rocket className="w-3.5 h-3.5 mr-2" />
          {prompt !== originalPrompt ? "Créer la version modifiée" : "Créer ce modèle"}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// CHAT MESSAGE
// ============================================

interface ChatMessageProps {
  message: Message;
  onQuickOption: (option: WizardOption) => void;
  isLoading: boolean;
  onCreateProject: (customPrompt?: string) => void;
}

export function ChatMessage({ message, onQuickOption, isLoading, onCreateProject }: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[76%] bg-zinc-900 text-white rounded-xl px-4 py-2.5 shadow-sm">
          <p className="text-[14px] leading-relaxed">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  if (message.isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 items-start"
      >
        <div className="w-7 h-7 rounded-full bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-[14px] text-red-700 leading-relaxed">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 items-start"
    >
      {/* AI avatar — bare logo, no circle */}
      <div className="flex-shrink-0 mt-1">
        <SmartGraphLogo size={20} />
      </div>

      {/* Single card wrapping ALL AI response content */}
      <div className="flex-1 min-w-0 rounded-xl bg-white border border-zinc-200 overflow-hidden">
        {/* Text */}
        <div className="px-4 py-3">
          <MarkdownContent content={message.content} />
        </div>

        {/* Editable brief — embedded (no own card) */}
        {message.isCurrentQuestion && message.modelReady && message.draftPrompt && !isLoading && (
          <EditableBriefBlock
            originalPrompt={message.draftPrompt}
            onCreateProject={onCreateProject}
            embedded
          />
        )}

        {/* Refine options when modelReady — compact chips */}
        {message.isCurrentQuestion && message.modelReady && message.options && message.options.length > 0 && !isLoading && (
          <div className="border-t border-zinc-100 px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] text-zinc-400 shrink-0 uppercase tracking-widest mr-1">› Affiner</span>
            {message.options.map(option => (
              <button
                key={option.value}
                onClick={() => onQuickOption(option)}
                className="text-[12px] text-zinc-500 hover:text-zinc-900 px-2.5 py-1 rounded-md border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 transition-all duration-150 leading-none"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Normal options — embedded (no own card) */}
        {message.isCurrentQuestion && !message.modelReady && message.options && message.options.length > 0 && !isLoading && (
          <NormalOptions options={message.options} onQuickOption={onQuickOption} embedded />
        )}

        {/* Closing remark — only when no options */}
        {message.isCurrentQuestion && message.closingRemark && !isLoading && (!message.options || message.options.length === 0) && (
          <div className="px-4 pb-3">
            <p className="text-[13px] text-zinc-400 leading-relaxed">{message.closingRemark}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// NORMAL OPTIONS
// ============================================

function NormalOptions({ options, onQuickOption, embedded = false }: { options: WizardOption[]; onQuickOption: (o: WizardOption) => void; embedded?: boolean }) {
  const creationOption = options.find(o => o.value === 'accept');
  const jokerOption = options.find(o => o.icon === 'Zap');
  const regularOptions = options.filter(o => o.value !== 'accept' && o !== jokerOption);

  const optionRows = (
    <>
      {regularOptions.map((option, i) => (
        <button
          key={option.value}
          onClick={() => onQuickOption(option)}
          className={cn(
            "group w-full flex items-center gap-2.5 px-4 py-2.5 text-left",
            "transition-colors hover:bg-zinc-50",
            (i < regularOptions.length - 1 || jokerOption) && "border-b border-zinc-100"
          )}
        >
          <span className="font-mono font-bold text-violet-400 text-sm shrink-0 group-hover:text-violet-600 transition-colors">›</span>
          <span className="flex-1 text-[13px] font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors leading-snug">
            {option.label}
          </span>
        </button>
      ))}

      {jokerOption && (
        <button
          type="button"
          onClick={() => onQuickOption(jokerOption)}
          className="group w-full flex items-center gap-2.5 px-4 py-2.5 bg-zinc-50/60 hover:bg-zinc-50 transition-colors text-left border-t border-zinc-100"
        >
          <span className="font-mono font-bold text-zinc-300 text-sm shrink-0 group-hover:text-zinc-400 transition-colors">›</span>
          <span className="flex-1 text-[13px] text-zinc-500 group-hover:text-zinc-700 transition-colors">
            Générer maintenant
          </span>
        </button>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="border-t border-zinc-100 overflow-hidden">
        {optionRows}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {(regularOptions.length > 0 || jokerOption) && (
        <div className="rounded-xl border border-zinc-200 shadow-sm overflow-hidden bg-white">
          {optionRows}
        </div>
      )}

      {creationOption && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mt-1 w-full"
        >
          <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <SmartGraphLogo size={20} />
              </div>
              <div>
                <h4 className="font-mono text-[11px] uppercase tracking-widest text-zinc-400 mb-0.5">› Prêt à créer</h4>
                <p className="text-zinc-700 font-medium text-[13px] leading-snug">
                  Le contexte est suffisant pour générer une première version.
                </p>
              </div>
            </div>
            <Button
              onClick={() => onQuickOption(creationOption)}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium h-9 text-[13px] transition-all rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Créer ce modèle
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
