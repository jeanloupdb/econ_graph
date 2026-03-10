/**
 * ConversationalChat — Gemini-style conversational UI.
 *
 * Clean, centered, with generous spacing.
 * Welcome screen is vertically centered; conversation flows naturally.
 * Input bar is anchored at the bottom with a soft gradient fade.
 */

"use client";

import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { cn } from "@/lib/utils";
import { WizardOption, WizardState } from "@/types/wizard";
import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
    buildMessages,
    ChatMessage,
    Message,
    TypingDots,
    WelcomeMessage
} from "./chat";

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
}

export function ConversationalChat({
  state,
  onSubmitAnswer,
  onCreateProject,
  onReset,
}: ConversationalChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [isExpertMode, setIsExpertMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);

  // Send validation
  const canSend =
    !!state.currentQuestion &&
    state.currentStep === "question" &&
    !state.isLoading;
  const inputPlaceholder =
    state.currentQuestion?.freeform_placeholder ||
    "Décrivez ce que vous voulez modéliser...";

  // Build messages
  const messages: Message[] = buildMessages(state, state.isLoading);
  const isFirstMessage = messages.length === 0 || (messages.length === 1 && !state.conversationHistory.length);

  // When showing WelcomeMessage, skip the duplicate current question from messages
  const displayMessages = isFirstMessage ? [] : messages;

  // Auto-scroll
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

  // Keep input above mobile keyboard using fixed + visualViewport
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport!;
    const update = () => {
      if (!inputBarRef.current) return;
      if (window.innerWidth >= 1024) {
        // Desktop: reset any transform
        inputBarRef.current.style.transform = "";
        return;
      }
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
  }, []);

  // Auto-create project when summary arrives (skip summary UI)
  const hasTriggeredCreate = useRef(false);
  useEffect(() => {
    if (state.currentStep === 'summary' && state.summary && !hasTriggeredCreate.current) {
      hasTriggeredCreate.current = true;
      onCreateProject();
    }
    if (state.currentStep !== 'summary') {
      hasTriggeredCreate.current = false;
    }
  }, [state.currentStep, state.summary, onCreateProject]);

  const handleSubmit = () => {
    const text = inputValue.trim();
    if (!text || !canSend) return;
    onSubmitAnswer(undefined, text, { choiceType: 'freeform', displayText: text });
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickOption = (option: WizardOption) => {
    if (option.value === "expert_mode") {
      setIsExpertMode(true);
      return;
    }
    if (option.value === "accept") {
      onCreateProject();
      return;
    }
    const details = option.description?.trim();
    const formatted = details ? `${option.label} — ${details}` : option.label;
    onSubmitAnswer(option.label, undefined, {
      selectedOption: option,
      choiceType: 'option',
      displayText: formatted,
    });
  };

  if (!state.currentQuestion && !state.error && !state.isLoading && state.stepNumber === 0) {
    return <FullChatLoader />;
  }

  if (state.currentStep === 'summary') {
    return <FullChatLoader />;
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* Messages area — scrollable, vertically centered for welcome */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6 scroll-smooth custom-scrollbar"
      >
        <div
          className={`max-w-2xl mx-auto ${
            isFirstMessage 
              ? "min-h-full flex flex-col items-center justify-center" 
              : "space-y-6 min-h-full flex flex-col justify-end pb-4"
          }`}
        >
          {/* Welcome message with proposals (shown only on first message) */}
          {isFirstMessage && (
            <WelcomeMessage
              state={state}
              onOptionClick={handleQuickOption}
              onReload={onReset}
              onFocusInput={() => inputRef.current?.focus()}
            />
          )}

          {/* Message history (skip when WelcomeMessage is shown) */}
          {displayMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onQuickOption={handleQuickOption}
              isLoading={state.isLoading}
              onCreateProject={(customPrompt) => onCreateProject(customPrompt)}
            />
          ))}

          {/* Loading indicator */}
          {state.isLoading && (
            <div className="flex gap-3 items-center">
              <div className="flex-shrink-0 mt-1">
                <SmartGraphLogo size={20} />
              </div>
              <TypingDots />
            </div>
          )}

        </div>
      </div>

      {/* Input bar — fixed on mobile (above keyboard via JS transform), relative on desktop */}
      <div
        ref={inputBarRef}
        className="fixed bottom-0 left-0 right-0 lg:relative lg:bottom-auto z-30 will-change-transform"
      >
        {/* Gradient fade */}
        <div className="absolute -top-20 left-0 right-0 h-20 bg-gradient-to-t from-[#f5f5f7] to-transparent pointer-events-none" />

        <div className="bg-[#f5f5f7] px-3 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="max-w-2xl mx-auto">
            {isExpertMode ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] font-medium text-zinc-700">Mode Expert</span>
                  <button
                    onClick={() => setIsExpertMode(false)}
                    className="text-[12px] text-zinc-500 hover:text-zinc-700 transition-colors"
                  >
                    Revenir au mode guidé
                  </button>
                </div>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Décrivez votre modèle complet ici..."
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-blue-500/50 min-h-[50px] resize-none py-3 custom-scrollbar leading-relaxed rounded-lg px-3"
                  disabled={state.isLoading}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || state.isLoading}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative bg-white border border-zinc-200 rounded-2xl transition-all duration-200 focus-within:border-zinc-300 flex items-end shadow-md">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={inputPlaceholder}
                      rows={1}
                      disabled={state.isLoading}
                      className="flex-1 bg-transparent pl-4 pr-2 py-3.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none max-h-[160px] min-h-[48px] custom-scrollbar leading-relaxed disabled:opacity-40"
                      style={{ height: 'auto', overflow: 'hidden' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                        target.style.overflowY = target.scrollHeight > 160 ? 'auto' : 'hidden';
                      }}
                    />

                    {/* Send button */}
                    <div className="p-2 shrink-0">
                      <button
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || state.isLoading}
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200",
                          inputValue.trim()
                            ? "bg-zinc-900 text-white hover:bg-zinc-800"
                            : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 disabled:opacity-50"
                        )}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FullChatLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[40vh] animate-in fade-in duration-500 bg-[#f5f5f7]">
      <div className="mb-4">
        <SmartGraphLogo size={40} />
      </div>
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Chargement...</span>
      </div>
    </div>
  );
}
