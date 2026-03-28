"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  const canSubmit = (value.trim().length > 0 || !!context) && !isSending;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 border-t border-border">
      <div className={cn(
        "bg-muted rounded-xl border border-border shadow-sm",
        "focus-within:border-border/80 transition-colors",
      )}>
        {context && (
          <div className="px-3 pt-2.5 pb-1">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              {context.type === "parameter" && (
                <Circle className="h-2 w-2 fill-current text-blue-500" />
              )}
              {context.type === "calculation" && (
                <Triangle className="h-2 w-2 fill-current rotate-90 text-purple-500" />
              )}
              {context.type === "result" && (
                <Circle className="h-2 w-2 fill-current text-emerald-500" />
              )}
              <span className="text-foreground">{context.label}</span>
              <button
                onClick={onClearContext}
                className="text-muted-foreground/60 hover:text-muted-foreground ml-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
        <div className="flex items-center px-3 py-2 gap-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={isSending || isLoading}
            rows={1}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 border-none shadow-none focus-visible:ring-0 text-sm min-w-0 resize-none leading-relaxed p-0 min-h-0 h-9"
            style={{ maxHeight: "120px" }}
          />
          <Button
            size="icon"
            variant={canSubmit ? "default" : "ghost"}
            onClick={onSubmit}
            disabled={!canSubmit}
            className={cn(
              "h-7 w-7 rounded-lg shrink-0 transition-all",
              !canSubmit && "text-muted-foreground/40"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
