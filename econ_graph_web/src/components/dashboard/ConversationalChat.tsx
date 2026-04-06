"use client";

import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { cn } from "@/lib/utils";
import { WizardAttachment, WizardOption, WizardState } from "@/types/wizard";
import { motion } from "framer-motion";
import { ArrowUp, FileCode2, FileSpreadsheet, FileText, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    buildMessages,
    ChatMessage,
    Message,
    TypingDots,
} from "./chat";
import { parseInlineMarkdown } from "./chat/types";

export interface ConversationalChatProps {
  state: WizardState;
  onSubmitAnswer: (
    userChoice?: string,
    userFreeform?: string,
    meta?: {
      selectedOption?: WizardOption;
      choiceType?: 'option' | 'freeform' | 'mixed';
      displayText?: string;
    }
  ) => void;
  onGoBack: () => void;
  onCreateProject: (customPrompt?: string) => void;
  onReset: () => void;
  onCancelLoading?: () => void;
  onAddAttachment: (file: File) => Promise<WizardAttachment | null>;
  onRemoveAttachment: (attachmentId: string) => void;
}

const WIZARD_FILE_ACCEPT = ".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json,.yaml,.yml,.xml,.smgp";

export function ConversationalChat({
  state,
  onSubmitAnswer,
  onCreateProject,
  onReset,
  onAddAttachment,
  onRemoveAttachment,
}: ConversationalChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend =
    !!state.currentQuestion &&
    state.currentStep === "question" &&
    !state.isLoading;
  const hasAttachments = state.attachments.length > 0;
  const canSubmit = canSend && (inputValue.trim().length > 0 || hasAttachments) && !isUploadingAttachment;

  const inputPlaceholder =
    hasAttachments
      ? "Décrivez ce que vous voulez tirer de ces documents…"
      : state.currentQuestion?.freeform_placeholder || "Décrivez ce que vous voulez modéliser…";

  const messages: Message[] = buildMessages(state, state.isLoading);
  const isWelcome = messages.length === 0 || (messages.length === 1 && !state.conversationHistory.length);
  const displayMessages = isWelcome ? [] : messages;
  const options = state.currentQuestion?.options || [];

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, state.isLoading]);

  // Focus input
  useEffect(() => {
    if (!state.isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.isLoading, state.currentQuestion?.step]);

  // Reset input on question change
  useEffect(() => {
    setInputValue("");
  }, [state.currentQuestion?.step]);

  // Mobile keyboard: keep input above keyboard
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport || isWelcome) return;
    const vv = window.visualViewport!;
    const update = () => {
      if (!inputBarRef.current) return;
      if (window.innerWidth >= 1024) { inputBarRef.current.style.transform = ""; return; }
      const keyboardH = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      inputBarRef.current.style.transform = `translateY(-${keyboardH}px)`;
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isWelcome]);

  // Auto-create when summary
  const hasTriggeredCreate = useRef(false);
  useEffect(() => {
    if (state.currentStep === 'summary' && state.summary && !hasTriggeredCreate.current) {
      hasTriggeredCreate.current = true;
      onCreateProject();
    }
    if (state.currentStep !== 'summary') hasTriggeredCreate.current = false;
  }, [state.currentStep, state.summary, onCreateProject]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const text = inputValue.trim();
    const attachmentLabel = formatAttachmentLabel(state.attachments);
    const fallbackPrompt =
      state.attachments.length === 1
        ? `Je joins le document "${state.attachments[0].file_name}". Appuie-toi dessus pour construire le bon modèle.`
        : `Je joins ${state.attachments.length} documents. Appuie-toi dessus pour construire le bon modèle.`;
    const freeform = text || fallbackPrompt;
    const displayText = text || attachmentLabel;

    onSubmitAnswer(undefined, freeform, { choiceType: 'freeform', displayText });
    setInputValue("");
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleQuickOption = (option: WizardOption) => {
    if (option.value === "accept") { onCreateProject(); return; }
    const details = option.description?.trim();
    const formatted = details ? `${option.label} — ${details}` : option.label;
    onSubmitAnswer(option.label, undefined, { selectedOption: option, choiceType: 'option', displayText: formatted });
  };

  const handleAttachmentPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setIsUploadingAttachment(true);
      await onAddAttachment(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’analyser ce fichier");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const openAttachmentPicker = () => {
    if (state.isLoading || isUploadingAttachment) return;
    fileInputRef.current?.click();
  };

  if (!state.currentQuestion && !state.error && !state.isLoading && state.stepNumber === 0) {
    return <FullChatLoader />;
  }
  if (state.currentStep === 'summary') return <FullChatLoader />;

  // ─── WELCOME MODE ────────────────────────────────────────────────────────────
  if (isWelcome) {
    const title = state.currentQuestion?.question || "Que souhaitez-vous modéliser ?";
    // Show only the first 4 non-"autre" options to keep it clean
    const primaryOptions = options.filter(o => !o.label.toLowerCase().includes("autre chose")).slice(0, 4);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center px-4 py-8 min-h-0 overflow-y-auto"
      >
        <div className="w-full max-w-lg">

          {/* Motif + titre */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center mb-7"
          >
            <div
              className="font-mono font-black text-violet-400 leading-none select-none mb-4"
              style={{ fontSize: "36px" }}
            >›</div>
            <h1 className="text-[19px] font-bold text-zinc-900 tracking-tight leading-snug">
              {parseInlineMarkdown(title)}
            </h1>
          </motion.div>

          {/* Input — élément central */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="mb-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={WIZARD_FILE_ACCEPT}
              onChange={handleAttachmentPick}
            />
            <AttachmentList
              attachments={state.attachments}
              onRemove={onRemoveAttachment}
            />
            <div className={cn(
              "bg-white rounded-xl border transition-all duration-200",
              "border-zinc-300 focus-within:border-violet-400"
            )}>
              <div className="flex items-start px-4 pt-4 pb-1">
                <button
                  type="button"
                  onClick={openAttachmentPicker}
                  disabled={state.isLoading || isUploadingAttachment}
                  className={cn(
                    "mr-3 mt-[-2px] flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                    state.isLoading || isUploadingAttachment
                      ? "border-zinc-200 bg-zinc-50 text-zinc-300"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-violet-300 hover:text-violet-600"
                  )}
                  aria-label="Ajouter un fichier"
                  title="Ajouter un fichier"
                >
                  {isUploadingAttachment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </button>
                <span className="font-mono font-bold text-violet-500 text-[15px] leading-none select-none mt-[2px] mr-3 shrink-0">›</span>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  disabled={state.isLoading}
                  rows={3}
                  className="flex-1 bg-transparent text-[14px] text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed custom-scrollbar"
                />
              </div>
              <div className="flex items-center justify-between px-4 pb-3 pt-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-300 select-none hidden sm:block">
                  + Document · ↵ Envoyer · ⇧↵ Retour à la ligne
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    "ml-auto flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
                    canSubmit
                      ? "bg-zinc-900 text-white hover:bg-zinc-800"
                      : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Suggestions */}
          {primaryOptions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.18 }}
              className="grid grid-cols-2 gap-1.5"
            >
              {primaryOptions.map((option, i) => (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 + i * 0.04 }}
                  onClick={() => handleQuickOption(option)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-white hover:border-violet-300 hover:bg-violet-50/30 text-left transition-all duration-150 group"
                >
                  <span className="font-mono font-bold text-violet-400 text-sm shrink-0 group-hover:text-violet-600 transition-colors">›</span>
                  <span className="text-[13px] font-medium text-zinc-600 group-hover:text-zinc-900 leading-snug transition-colors">
                    {option.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Reload */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.4 }}
            className="flex justify-center mt-4"
          >
            <button
              onClick={onReset}
              title="Autres suggestions"
              className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </motion.div>

        </div>
      </motion.div>
    );
  }

  // ─── CONVERSATION MODE ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-32 scroll-smooth custom-scrollbar"
      >
        <div className="max-w-2xl mx-auto space-y-6 min-h-full flex flex-col justify-end pb-4">
          {displayMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onQuickOption={handleQuickOption}
              isLoading={state.isLoading}
              onCreateProject={(customPrompt) => onCreateProject(customPrompt)}
            />
          ))}
          {state.isLoading && (
            <div className="flex gap-3 items-center">
              <div className="flex-shrink-0 mt-1"><SmartGraphLogo size={20} /></div>
              <TypingDots />
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div
        ref={inputBarRef}
        className="fixed bottom-0 left-0 right-0 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 z-30 will-change-transform"
      >
        <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
        <div className="px-3 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0">
          <div className="max-w-2xl mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={WIZARD_FILE_ACCEPT}
              onChange={handleAttachmentPick}
            />
            <AttachmentList
              attachments={state.attachments}
              onRemove={onRemoveAttachment}
              className="mb-3"
            />
            <div
              className={cn(
                "relative bg-white rounded-xl border transition-all duration-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]",
                state.isLoading ? "border-zinc-200 opacity-70" : "border-zinc-300 focus-within:border-violet-400"
              )}
            >
              <div className="flex items-end">
                <div className="pl-3 pb-[10px] pt-[10px] shrink-0 self-start flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openAttachmentPicker}
                    disabled={state.isLoading || isUploadingAttachment}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      state.isLoading || isUploadingAttachment
                        ? "border-zinc-200 bg-zinc-50 text-zinc-300"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-violet-300 hover:text-violet-600"
                    )}
                    aria-label="Ajouter un fichier"
                    title="Ajouter un fichier"
                  >
                    {isUploadingAttachment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                  <span className="font-mono font-bold text-violet-500 text-[15px] leading-none select-none">›</span>
                </div>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  rows={1}
                  disabled={state.isLoading}
                  className="flex-1 bg-transparent pl-2.5 pr-2 py-[14px] text-[14px] text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none max-h-[120px] min-h-[48px] custom-scrollbar leading-relaxed disabled:cursor-not-allowed"
                  style={{ height: 'auto', overflow: 'hidden' }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                    t.style.overflowY = t.scrollHeight > 120 ? 'auto' : 'hidden';
                  }}
                />
                <div className="p-2 shrink-0">
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
                      canSubmit
                        ? "bg-zinc-900 text-white hover:bg-zinc-800"
                        : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
                    )}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="px-4 pb-2.5 -mt-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-300 select-none hidden sm:block">
                  + Document &nbsp;·&nbsp; ↵ Envoyer &nbsp;·&nbsp; ⇧↵ Retour à la ligne
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FullChatLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[40vh] animate-in fade-in duration-500 bg-white gap-4">
      <SmartGraphLogo size={36} loading />
      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Chargement…</span>
    </div>
  );
}

function AttachmentList({
  attachments,
  onRemove,
  className,
}: {
  attachments: WizardAttachment[];
  onRemove: (attachmentId: string) => void;
  className?: string;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-600"
        >
          <span className="text-zinc-400">{getAttachmentIcon(attachment.file_kind)}</span>
          <span className="max-w-[220px] truncate">{attachment.file_name}</span>
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            className="rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={`Retirer ${attachment.file_name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function getAttachmentIcon(fileKind: string) {
  switch (fileKind) {
    case "excel":
    case "csv":
      return <FileSpreadsheet className="h-3.5 w-3.5" />;
    case "pdf":
    case "docx":
    case "txt":
    case "md":
      return <FileText className="h-3.5 w-3.5" />;
    default:
      return <FileCode2 className="h-3.5 w-3.5" />;
  }
}

function formatAttachmentLabel(attachments: WizardAttachment[]) {
  if (attachments.length === 0) return "";
  if (attachments.length === 1) {
    return `Document joint: ${attachments[0].file_name}`;
  }
  return `${attachments.length} documents joints`;
}
