"use client";

import { cn } from "@/lib/utils";
import type { AiContextInfo } from "@/types/ai-context";
import { Circle, Send, Triangle, X } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  placeholder,
  isSending,
  isLoading,
  context,
  onClearContext,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
  isSending: boolean;
  isLoading: boolean;
  context: AiContextInfo | null;
  onClearContext: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? fallbackRef;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [value]);

  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 border-t border-zinc-200">
      <div
        className={cn(
          "bg-zinc-50 rounded-xl border border-zinc-200",
          "shadow-sm",
          "focus-within:border-zinc-300 transition-colors",
        )}
      >
        {context && (
          <div className="px-3 pt-2.5 pb-1">
            <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
              {context.type === "parameter" && (
                <Circle className="h-2 w-2 fill-current text-blue-500" />
              )}
              {context.type === "calculation" && (
                <Triangle className="h-2 w-2 fill-current rotate-90 text-purple-500" />
              )}
              {context.type === "result" && (
                <Circle className="h-2 w-2 fill-current text-emerald-500" />
              )}
              <span className="text-zinc-700">{context.label}</span>
              <button
                onClick={onClearContext}
                className="text-zinc-400 hover:text-zinc-600 ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
        <div className="flex items-center px-3 py-2.5 gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={isSending || isLoading}
            rows={1}
            className="flex-1 bg-transparent text-zinc-900 placeholder:text-zinc-400 outline-none text-sm min-w-0 resize-none leading-relaxed"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={onSubmit}
            disabled={(!value.trim() && !context) || isSending}
            className={cn(
              "p-1.5 rounded-lg transition-colors shrink-0",
              (value.trim() || context) && !isSending
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "text-zinc-400",
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
