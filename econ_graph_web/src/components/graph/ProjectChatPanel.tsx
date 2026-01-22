/**
 * ProjectChatPanel - Panel de chat IA pour un projet
 *
 * Features:
 * - Affiche le brief de création initial (déroulé)
 * - Message de confirmation "Modèle généré"
 * - Chat conversationnel avec l'IA
 * - Overlay à gauche de la page
 */

"use client";

import { Button } from "@/components/ui/button";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { useProjectChat } from "@/hooks/useProjectChat";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/project-chat";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    Check,
    ChevronDown,
    ChevronUp,
    FileText,
    MessageSquare,
    RotateCcw,
    Send,
    X,
    Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ProjectChatPanelProps {
  projectId: string;
  projectName: string;
  generationPrompt?: string | null;
  onClose: () => void;
}

export function ProjectChatPanel({
  projectId,
  projectName,
  generationPrompt,
  onClose,
}: ProjectChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [briefExpanded, setBriefExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    conversation,
    isLoading,
    isSending,
    error,
    loadConversation,
    sendMessage,
    clearHistory,
  } = useProjectChat(projectId);

  // Charger la conversation au montage
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Auto-scroll quand de nouveaux messages arrivent
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages.length, isSending]);

  // Focus input on mount
  useEffect(() => {
    // Small delay to ensure animation is complete
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Focus input after sending
  useEffect(() => {
    if (!isSending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSending]);

  const handleSubmit = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;

    setInputValue("");
    try {
      await sendMessage(text);
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0;
  const displayPrompt = generationPrompt || conversation?.generation_prompt;

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 left-0 bottom-0 w-[420px] bg-zinc-950 border-r border-zinc-800 z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white">Assistant IA</h2>
            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasMessages && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="h-8 w-8 text-zinc-400 hover:text-white"
              title="Effacer l'historique"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#27272a transparent",
        }}
      >
        <div className="p-4 space-y-4">
          {/* Brief de création (toujours affiché en premier) */}
          {displayPrompt && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setBriefExpanded(!briefExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-zinc-200">Brief de création</span>
                </div>
                {briefExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              <AnimatePresence>
                {briefExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 border-t border-zinc-800/50">
                      <div className="mt-3 max-h-[200px] overflow-y-auto">
                        <BriefContent content={displayPrompt} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Message de confirmation */}
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-emerald-400">Modèle généré avec succès.</span>{" "}
                Je suis là pour vous aider à comprendre, modifier ou améliorer ce modèle.
              </p>
              {!hasMessages && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <QuickAction
                    label="Expliquer ce modèle"
                    onClick={() => {
                      setInputValue("Peux-tu m'expliquer ce modèle ?");
                      inputRef.current?.focus();
                    }}
                  />
                  <QuickAction
                    label="Ajouter un paramètre"
                    onClick={() => {
                      setInputValue("Je voudrais ajouter un nouveau paramètre");
                      inputRef.current?.focus();
                    }}
                  />
                  <QuickAction
                    label="Créer un scénario"
                    onClick={() => {
                      setInputValue("Aide-moi à créer un nouveau scénario");
                      inputRef.current?.focus();
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Messages de conversation */}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Loading indicator */}
          {isSending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 items-start"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                <SmartGraphLogo size={16} className="text-violet-400" />
              </div>
              <div className="py-2">
                <TypingDots />
              </div>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-zinc-800 bg-zinc-950">
        <div className="relative flex items-end gap-2 bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800/60 focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question sur ce modèle..."
            rows={1}
            disabled={isSending || isLoading}
            className={cn(
              "flex-1 bg-transparent text-white placeholder:text-zinc-500",
              "px-4 py-3 resize-none outline-none",
              "text-sm leading-relaxed"
            )}
            style={{
              minHeight: "44px",
              maxHeight: "120px",
              overflow: "hidden",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              const newHeight = Math.min(target.scrollHeight, 120);
              target.style.height = newHeight + "px";
              target.style.overflowY = target.scrollHeight > 120 ? "auto" : "hidden";
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isSending}
            className={cn(
              "p-2 m-1.5 rounded-lg transition-all",
              inputValue.trim() && !isSending
                ? "bg-violet-600 text-white hover:bg-violet-500"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2 px-1">
          Entrée pour envoyer • Échap pour fermer
        </p>
      </div>
    </motion.div>
  );
}

// ==================== SUB-COMPONENTS ====================

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors border border-zinc-700/50"
    >
      {label}
    </button>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-2xl rounded-br-md px-4 py-2.5">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  const actions = (message.metadata?.actions as any[]) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 items-start"
    >
      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
        <SmartGraphLogo size={16} className="text-violet-400" />
      </div>
      <div className="flex-1 py-1">
        <MarkdownContent content={message.content} />
        
        {actions.length > 0 && (
          <div className="mt-3 space-y-2">
             {actions.map((action, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-2 mb-1 text-zinc-500">
                     <Zap className="w-3 h-3 text-amber-500" />
                     <span className="font-mono uppercase text-[10px] tracking-wider">{action.tool}</span>
                  </div>
                  <div className={cn(
                     "pl-5",
                     action.result?.success ? "text-emerald-400" : "text-red-400"
                  )}>
                     {action.result?.message || action.result?.error || "Action exécutée"}
                  </div>
                </div>
             ))}
           </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 bg-zinc-500 rounded-full"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="text-zinc-200 text-sm leading-relaxed space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        const bulletMatch = line.match(/^[\s]*[•\-\*]\s*(.*)$/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
              <span className="text-violet-400 mt-1">•</span>
              <span>{parseInlineMarkdown(bulletMatch[1])}</span>
            </div>
          );
        }

        return <p key={i}>{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function BriefContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1 font-mono text-xs leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Titre de section
        if (line.match(/^[A-ZÉÈÀÙ\s]+(\s*:|\s*\()/) || line.match(/^[A-ZÉÈÀÙ]{3,}/)) {
          return (
            <div
              key={i}
              className="text-zinc-500 font-semibold pt-2 first:pt-0 uppercase text-[10px] tracking-wider"
            >
              {line}
            </div>
          );
        }

        // Bullet point
        if (line.match(/^[\s]*[-•]\s/)) {
          return (
            <div key={i} className="text-zinc-300 pl-2 flex">
              <span className="text-zinc-600 mr-2">•</span>
              <span>{parseInlineMarkdown(line.replace(/^[\s]*[-•]\s*/, ""))}</span>
            </div>
          );
        }

        // Numérotation
        if (line.match(/^[\s]*\d+\.\s/)) {
          const match = line.match(/^([\s]*\d+\.\s*)(.*)/);
          return (
            <div key={i} className="text-zinc-300 pl-2">
              <span className="text-zinc-500">{match?.[1]}</span>
              {parseInlineMarkdown(match?.[2] || "")}
            </div>
          );
        }

        // Première ligne
        if (i === 0) {
          return (
            <div
              key={i}
              className="text-white font-medium text-sm pb-2 border-b border-zinc-800/50 mb-2"
            >
              {parseInlineMarkdown(line)}
            </div>
          );
        }

        // Ligne normale
        return (
          <div key={i} className="text-zinc-400">
            {parseInlineMarkdown(line)}
          </div>
        );
      })}
    </div>
  );
}
