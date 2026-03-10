/**
 * ProjectChatPanel - Panel de chat IA minimaliste
 * Design inspiré de Google Gemini et Linear.app
 */

"use client";

import { Button } from "@/components/ui/button";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useProjectChat } from "@/hooks/useProjectChat";
import { useUIStore } from "@/store/uiState";
import type { AiContextInfo } from "@/types/ai-context";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatInput } from "./chat/ChatInput";
import { MessageBubble } from "./chat/MessageBubble";
import { QuickAction } from "./chat/QuickAction";
import { TypingDots } from "./chat/TypingDots";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const aiPromptPrefill = useUIStore((s) => s.aiPromptPrefill);
  const aiAutoSend = useUIStore((s) => s.aiAutoSend);
  const aiContext = useUIStore((s) => s.aiContext);
  const setAiPromptPrefill = useUIStore((s) => s.setAiPromptPrefill);
  const setAiAutoSend = useUIStore((s) => s.setAiAutoSend);
  const clearAiContext = useUIStore((s) => s.clearAiContext);

  const { nodes, refresh } = useGraphData();

  const {
    conversation,
    isLoading,
    isSending,
    error,
    suggestedActions,
    loadConversation,
    sendMessage,
    clearHistory,
  } = useProjectChat(projectId);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages.length, isSending]);

  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSending && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isSending]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (aiPromptPrefill !== null) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);

      if (aiAutoSend) {
        if (isSending) {
          return () => {
            if (timeoutId) clearTimeout(timeoutId);
          };
        }
        timeoutId = setTimeout(async () => {
          setAiAutoSend(false);
          setAiPromptPrefill(null);
          setInputValue(""); // Clear input after auto-send

          const text = aiPromptPrefill.trim();
          if (text && !isSending) {
            const contextPrefix = aiContext ? `"${aiContext.label}" : ` : "";
            try {
              await sendMessage(contextPrefix + text, aiContext || undefined);
              refresh();
              clearAiContext();
            } catch (e) {
              console.error("Failed to send auto message", e);
            }
          }
        }, 150);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    aiPromptPrefill,
    aiAutoSend,
    aiContext,
    setAiPromptPrefill,
    setAiAutoSend,
    clearAiContext,
    isSending,
    sendMessage,
    refresh,
  ]);

  const displayedValue = aiPromptPrefill ?? inputValue;

  const handleInputChange = (value: string) => {
    if (aiPromptPrefill !== null) {
      setAiPromptPrefill(null);
    }
    setInputValue(value);
  };

  const handleSubmit = async () => {
    const text = displayedValue.trim();
    if ((!text && !aiContext) || isSending) return;

    setInputValue("");
    if (aiPromptPrefill !== null) {
      setAiPromptPrefill(null);
    }
    const contextPrefix = aiContext ? `"${aiContext.label}" : ` : "";
    const finalText = text || "Explique";
    try {
      await sendMessage(contextPrefix + finalText, aiContext || undefined);
      refresh();
      clearAiContext();
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
    if (e.key === "Backspace" && !displayedValue && aiContext) {
      e.preventDefault();
      clearAiContext();
    }
  };

  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0;

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 left-0 bottom-0 w-[400px] bg-white border-r border-zinc-200 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-200 shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <SmartGraphLogo size={18} />
          <span className="text-sm font-medium text-zinc-700">Assistant</span>
        </div>
        <div className="flex items-center gap-0.5">
          {hasMessages && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              title="Effacer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-28 bg-zinc-50"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#e4e4e7 transparent" }}
      >
        <div className="p-4 space-y-4">
          {!hasMessages && (
            <div className="pt-4">
              <p className="text-zinc-500 text-sm">
                Posez une question ou sélectionnez un élément.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <QuickAction
                  label="Expliquer le modèle"
                  onClick={() => {
                    if (aiPromptPrefill !== null) {
                      setAiPromptPrefill(null);
                    }
                    setInputValue("Explique-moi ce modèle");
                    textareaRef.current?.focus();
                  }}
                />
                <QuickAction
                  label="Ajouter un paramètre"
                  onClick={() => {
                    if (aiPromptPrefill !== null) {
                      setAiPromptPrefill(null);
                    }
                    setInputValue("Ajoute un nouveau paramètre");
                    textareaRef.current?.focus();
                  }}
                />
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              nodes={nodes}
              isLastAssistant={
                message.role === "assistant" &&
                index === messages.length - 1 &&
                !isSending
              }
              isStreaming={
                message.role === "assistant" &&
                index === messages.length - 1 &&
                isSending &&
                !message.content
              }
              suggestedActions={
                message.role === "assistant" &&
                index === messages.length - 1 &&
                !isSending
                  ? suggestedActions
                  : undefined
              }
              onSuggestedAction={(action) => {
                if (aiPromptPrefill !== null) {
                  setAiPromptPrefill(null);
                }
                setInputValue(action);
                textareaRef.current?.focus();
              }}
              onClosePanel={onClose}
            />
          ))}

          {isSending && messages.length === 0 && (
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                <SmartGraphLogo size={12} />
              </div>
              <TypingDots />
            </div>
          )}

          {error && (
            <div className="flex gap-2.5 items-start bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <ChatInput
        value={displayedValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        placeholder={aiContext ? "Votre question..." : "Message..."}
        isSending={isSending}
        isLoading={isLoading}
        context={aiContext as AiContextInfo | null}
        onClearContext={clearAiContext}
        inputRef={textareaRef}
      />
    </motion.div>
  );
}
