"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────
export interface MentionData {
  nodeId: string;
  label: string;
  type: "parameter" | "calculation" | "result";
  field?: "formula" | "value" | "notes";
}

export interface MentionInputHandle {
  focus: () => void;
  getTextValue: () => string;
  getMentions: () => MentionData[];
  setContent: (
    text: string,
    resolveNode?: (textAfterAt: string) => MentionData | null
  ) => void;
  insertMentionAtQuery: (data: MentionData) => void;
  clear: () => void;
  isEmpty: () => boolean;
}

interface MentionInputProps {
  placeholder?: string;
  disabled?: boolean;
  isLightMode?: boolean;
  className?: string;
  onInput?: (text: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onMentionQueryChange?: (query: string | null) => void;
  onMentionHover?: (nodeId: string | null) => void;
  maxHeight?: number;
}

// ─── Type color maps ────────────────────────────────────────────────
const typeStylesLight: Record<string, string> = {
  parameter: "bg-blue-50 text-blue-700 border-blue-200",
  calculation: "bg-purple-50 text-purple-700 border-purple-200",
  result: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const typeStylesDark: Record<string, string> = {
  parameter: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  calculation: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  result: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function createTypeIconSvg(type: string): string {
  if (type === "parameter") {
    return '<svg style="width:8px;height:8px;display:inline-block;vertical-align:baseline;margin-right:2px;" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>';
  }
  if (type === "calculation") {
    return '<svg style="width:8px;height:8px;display:inline-block;vertical-align:baseline;margin-right:2px;" viewBox="0 0 10 10"><polygon points="5,0 10,10 0,10" fill="currentColor"/></svg>';
  }
  return '<svg style="width:8px;height:8px;display:inline-block;vertical-align:baseline;margin-right:2px;" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>';
}

// ─── Helpers ────────────────────────────────────────────────────────
function createMentionSpan(
  data: MentionData,
  isLightMode: boolean
): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.setAttribute("data-mention-id", data.nodeId);
  span.setAttribute("data-mention-type", data.type);
  span.setAttribute("data-mention-label", data.label);
  if (data.field) span.setAttribute("data-mention-field", data.field);

  const styles = isLightMode ? typeStylesLight : typeStylesDark;
  const typeStyle = styles[data.type] || styles.calculation;

  span.className = [
    "inline-flex items-center rounded px-1 mx-px text-[13px] font-medium border",
    "cursor-default whitespace-nowrap align-baseline",
    typeStyle,
  ].join(" ");
  span.innerHTML = `${createTypeIconSvg(data.type)}@${data.label}`;
  return span;
}

function extractTextFromEditor(el: HTMLDivElement): string {
  let text = "";
  const walk = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
    } else if (node instanceof HTMLElement) {
      if (node.getAttribute("data-mention-id")) {
        text += node.textContent || "";
      } else if (node.tagName === "BR") {
        text += "\n";
      } else if (
        node.tagName === "DIV" &&
        text.length > 0 &&
        !text.endsWith("\n")
      ) {
        text += "\n";
        node.childNodes.forEach(walk);
      } else {
        node.childNodes.forEach(walk);
      }
    }
  };
  el.childNodes.forEach(walk);
  return text;
}

function extractMentionsFromEditor(el: HTMLDivElement): MentionData[] {
  const mentions: MentionData[] = [];
  el.querySelectorAll("[data-mention-id]").forEach((span) => {
    const s = span as HTMLElement;
    mentions.push({
      nodeId: s.getAttribute("data-mention-id") || "",
      label:
        s.getAttribute("data-mention-label") ||
        (s.textContent || "").replace(/^@/, ""),
      type:
        (s.getAttribute("data-mention-type") as MentionData["type"]) ||
        "parameter",
    });
  });
  return mentions;
}

// ─── Component ──────────────────────────────────────────────────────
export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  (
    {
      placeholder,
      disabled,
      isLightMode = false,
      className,
      onInput,
      onKeyDown,
      onMentionQueryChange,
      onMentionHover,
      maxHeight = 100,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showPlaceholder, setShowPlaceholder] = useState(true);
    const mentionStartOffsetRef = useRef<number>(-1);
    const mentionTextNodeRef = useRef<globalThis.Text | null>(null);

    // ── Placeholder logic ──
    const updatePlaceholder = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const text = (el.textContent || "").replace(/\u200B/g, "").trim();
      setShowPlaceholder(
        text === "" && el.querySelectorAll("[data-mention-id]").length === 0
      );
    }, []);

    // ── Detect @ mention query from cursor position ──
    const detectMentionQuery = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !sel.getRangeAt(0).collapsed) {
        onMentionQueryChange?.(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE || !el.contains(node)) {
        onMentionQueryChange?.(null);
        return;
      }

      const textBefore = (node.textContent || "").slice(0, range.startOffset);
      const lastAtIdx = textBefore.lastIndexOf("@");
      if (lastAtIdx >= 0) {
        const query = textBefore.slice(lastAtIdx + 1);
        if (!query.includes("\n") && !query.includes("  ")) {
          mentionStartOffsetRef.current = lastAtIdx;
          mentionTextNodeRef.current = node as globalThis.Text;
          onMentionQueryChange?.(query);
          return;
        }
      }
      onMentionQueryChange?.(null);
      mentionStartOffsetRef.current = -1;
      mentionTextNodeRef.current = null;
    }, [onMentionQueryChange]);

    // ── Insert mention replacing @query ──
    const insertMentionAtQuery = useCallback(
      (data: MentionData) => {
        const el = editorRef.current;
        if (!el) return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);
        const textNode =
          mentionTextNodeRef.current || range.startContainer;
        if (textNode.nodeType !== Node.TEXT_NODE) return;

        const text = textNode.textContent || "";
        const cursorOffset =
          textNode === range.startContainer
            ? range.startOffset
            : text.length;
        const atIdx = mentionStartOffsetRef.current;
        if (atIdx < 0 || atIdx > cursorOffset) return;

        const beforeAt = text.slice(0, atIdx);
        const afterCursor = text.slice(cursorOffset);
        const parent = textNode.parentNode;
        if (!parent) return;

        const mentionSpan = createMentionSpan(data, isLightMode);

        if (beforeAt) {
          parent.insertBefore(document.createTextNode(beforeAt), textNode);
        }
        parent.insertBefore(mentionSpan, textNode);
        const spacer = document.createTextNode(
          afterCursor ? ` ${afterCursor}` : " "
        );
        parent.insertBefore(spacer, textNode);
        parent.removeChild(textNode);

        // Move cursor after the space
        const newRange = document.createRange();
        newRange.setStart(spacer, 1);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        mentionStartOffsetRef.current = -1;
        mentionTextNodeRef.current = null;
        onMentionQueryChange?.(null);
        updatePlaceholder();
        onInput?.(extractTextFromEditor(el));
      },
      [isLightMode, onMentionQueryChange, updatePlaceholder, onInput]
    );

    // ── Set content from outside (e.g. prefill) ──
    const setContentFn = useCallback(
      (
        text: string,
        resolveNode?: (textAfterAt: string) => MentionData | null
      ) => {
        const el = editorRef.current;
        if (!el) return;
        el.innerHTML = "";
        if (!text) {
          updatePlaceholder();
          return;
        }

        let i = 0;
        let textBuffer = "";
        const flushText = () => {
          if (textBuffer) {
            el.appendChild(document.createTextNode(textBuffer));
            textBuffer = "";
          }
        };

        while (i < text.length) {
          if (text[i] === "@" && resolveNode) {
            const remaining = text.slice(i + 1);
            const match = resolveNode(remaining);
            if (match) {
              flushText();
              el.appendChild(createMentionSpan(match, isLightMode));
              i += 1 + match.label.length;
              continue;
            }
          }
          if (text[i] === "\n") {
            flushText();
            el.appendChild(document.createElement("br"));
          } else {
            textBuffer += text[i];
          }
          i++;
        }
        flushText();
        updatePlaceholder();

        // Move cursor to end
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      },
      [isLightMode, updatePlaceholder]
    );

    // ── Clear ──
    const clear = useCallback(() => {
      const el = editorRef.current;
      if (el) el.innerHTML = "";
      mentionStartOffsetRef.current = -1;
      mentionTextNodeRef.current = null;
      updatePlaceholder();
    }, [updatePlaceholder]);

    // ── isEmpty ──
    const checkEmpty = useCallback((): boolean => {
      const el = editorRef.current;
      if (!el) return true;
      const text = (el.textContent || "").replace(/\u200B/g, "").trim();
      return (
        text === "" && el.querySelectorAll("[data-mention-id]").length === 0
      );
    }, []);

    // ── Expose handle ──
    useImperativeHandle(
      ref,
      () => ({
        focus: () => editorRef.current?.focus(),
        getTextValue: () =>
          editorRef.current
            ? extractTextFromEditor(editorRef.current)
            : "",
        getMentions: () =>
          editorRef.current
            ? extractMentionsFromEditor(editorRef.current)
            : [],
        setContent: setContentFn,
        insertMentionAtQuery,
        clear,
        isEmpty: checkEmpty,
      }),
      [setContentFn, insertMentionAtQuery, clear, checkEmpty]
    );

    // ── Event handlers ──
    const handleInput = useCallback(() => {
      updatePlaceholder();
      detectMentionQuery();
      if (editorRef.current) {
        onInput?.(extractTextFromEditor(editorRef.current));
      }
    }, [updatePlaceholder, detectMentionQuery, onInput]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }, []);

    // ── Mention hover delegation ──
    const handleMouseOver = useCallback(
      (e: React.MouseEvent) => {
        if (!onMentionHover) return;
        const target = (e.target as HTMLElement).closest("[data-mention-id]");
        if (target) {
          onMentionHover(target.getAttribute("data-mention-id"));
        }
      },
      [onMentionHover]
    );

    const handleMouseOut = useCallback(
      (e: React.MouseEvent) => {
        if (!onMentionHover) return;
        const target = (e.target as HTMLElement).closest("[data-mention-id]");
        if (target) {
          onMentionHover(null);
        }
      },
      [onMentionHover]
    );

    return (
      <div className="relative flex-1">
        {/* Placeholder */}
        {showPlaceholder && (
          <div
            className={cn(
              "absolute inset-0 pointer-events-none px-3 py-2 text-[15px] leading-relaxed select-none",
              isLightMode ? "text-zinc-400" : "text-zinc-500"
            )}
          >
            {placeholder}
          </div>
        )}

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={onKeyDown}
          onPaste={handlePaste}
          onFocus={() => detectMentionQuery()}
          onClick={() => detectMentionQuery()}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          className={cn(
            "relative w-full rounded-[15px] bg-transparent outline-none text-[15px] min-w-0",
            "leading-relaxed py-2 px-3 overflow-y-auto whitespace-pre-wrap break-words",
            isLightMode ? "text-zinc-900" : "text-zinc-100",
            disabled && "opacity-50 pointer-events-none",
            className
          )}
          style={{
            maxHeight,
            minHeight: 40,
            scrollbarWidth: "thin",
            scrollbarColor: isLightMode
              ? "#d4d4d8 transparent"
              : "#3f3f46 transparent",
          }}
          role="textbox"
          aria-placeholder={placeholder}
        />
      </div>
    );
  }
);

MentionInput.displayName = "MentionInput";
