/**
 * FloatingAiHub — Floating AI assistant.
 * Notifications are handled by NotificationBell (rendered alongside).
 */

"use client";

import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useProjectChat } from "@/hooks/useProjectChat";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUp,
  ChevronRight,
  ChevronUp,
  Circle,
  Pencil,
  Triangle,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageBubble } from "./chat/MessageBubble";
import type { MentionData, MentionInputHandle } from "./chat/MentionInput";
import { MentionInput } from "./chat/MentionInput";
import { QuickAction } from "./chat/QuickAction";
import { TypingDots } from "./chat/TypingDots";

// ─── Main Component ─────────────────────────────────────────────────
export function FloatingAiHub({ hidePill = false }: { hidePill?: boolean } = {}) {
  const { isLightMode } = useGraphTheme();

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentRole = useProjectStore((s) => s.getCurrentRole)();

  const aiAssistantOpen = useUIStore((s) => s.aiAssistantOpen);
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);
  const aiPromptPrefill = useUIStore((s) => s.aiPromptPrefill);
  const aiAutoSend = useUIStore((s) => s.aiAutoSend);
  const aiContext = useUIStore((s) => s.aiContext);
  const setAiPromptPrefill = useUIStore((s) => s.setAiPromptPrefill);
  const setAiAutoSend = useUIStore((s) => s.setAiAutoSend);
  const setAiContext = useUIStore((s) => s.setAiContext);
  const clearAiContext = useUIStore((s) => s.clearAiContext);
  const flashNodeHighlight = useUIStore((s) => s.flashNodeHighlight);

  const {
    conversation,
    isLoading,
    isSending,
    error,
    suggestedActions,
    loadConversation,
    sendMessage,
  } = useProjectChat(currentProjectId);

  const { nodes, edges, refresh } = useGraphData();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const [chatOpen, setChatOpen] = useState(false);
  const [compactThread, setCompactThread] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [textValue, setTextValue] = useState(""); // shadow for isEmpty checks
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSelectedIdx, setMentionSelectedIdx] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const mentionInputRef = useRef<MentionInputHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const prevIsSendingRef = useRef(false);

  const isExpanded = aiAssistantOpen;
  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0;
  const hideHub = currentRole === "public" || !currentProjectId;

  // ── Categorized node lists ─────────────────────────────────────────
  const resultNodeIds = useMemo(() => {
    if (!edges) return new Set<string>();
    const nodesWithOutgoing = new Set<string>();
    for (const e of edges) {
      if (e.edge_type === "dependency") nodesWithOutgoing.add(e.source);
    }
    return new Set(
      nodes
        .filter((n) => n.status !== "imposed" && !nodesWithOutgoing.has(n.id))
        .map((n) => n.id)
    );
  }, [nodes, edges]);

  const parameterNodes = useMemo(
    () => nodes.filter((n) => n.status === "imposed"),
    [nodes]
  );
  const calculationNodes = useMemo(
    () => nodes.filter((n) => n.status !== "imposed" && !resultNodeIds.has(n.id)),
    [nodes, resultNodeIds]
  );
  const resultNodes = useMemo(
    () => nodes.filter((n) => resultNodeIds.has(n.id)),
    [nodes, resultNodeIds]
  );

  // ── Mention item type (nodes + sub-fields) ──────────────────────────
  type MentionItem = {
    id: string;
    node: (typeof nodes)[0];
    displayLabel: string;
    field?: "formula" | "value" | "notes";
    category: string;
  };

  // ── Build mention items per category (node + sub-fields) ───────────
  const buildMentionItems = useCallback(
    (list: typeof nodes, category: string): MentionItem[] => {
      const items: MentionItem[] = [];
      for (const node of list) {
        const label = node.label || node.slug;
        // Node itself
        items.push({ id: node.id, node, displayLabel: label, category });
        // Sub-fields
        if (node.status === "imposed") {
          // Parameters: value sub-field
          items.push({
            id: `${node.id}:value`,
            node,
            displayLabel: `Valeur — ${label}`,
            field: "value",
            category,
          });
        } else {
          // Calculations / Results: formula sub-field
          if (node.computation_definition) {
            items.push({
              id: `${node.id}:formula`,
              node,
              displayLabel: `Formule — ${label}`,
              field: "formula",
              category,
            });
          }
        }
        if (node.notes) {
          items.push({
            id: `${node.id}:notes`,
            node,
            displayLabel: `Notes — ${label}`,
            field: "notes",
            category,
          });
        }
      }
      return items;
    },
    []
  );

  const paramItems = useMemo(
    () => buildMentionItems(parameterNodes, "params"),
    [buildMentionItems, parameterNodes]
  );
  const calcItems = useMemo(
    () => buildMentionItems(calculationNodes, "calcs"),
    [buildMentionItems, calculationNodes]
  );
  const resultItems = useMemo(
    () => buildMentionItems(resultNodes, "results"),
    [buildMentionItems, resultNodes]
  );

  // ── @ mention: filtered and categorized ────────────────────────────
  const mentionActive = mentionQuery !== null;
  const hasQuery = mentionQuery !== null && mentionQuery.length > 0;

  const filterMentionItems = useCallback(
    (list: MentionItem[]) => {
      if (!mentionActive) return [];
      if (!hasQuery) return list;
      const q = mentionQuery!.toLowerCase();
      return list.filter((item) =>
        item.displayLabel.toLowerCase().includes(q)
      );
    },
    [mentionActive, hasQuery, mentionQuery]
  );

  const filteredParams = useMemo(
    () => filterMentionItems(paramItems),
    [filterMentionItems, paramItems]
  );
  const filteredCalcs = useMemo(
    () => filterMentionItems(calcItems),
    [filterMentionItems, calcItems]
  );
  const filteredResults = useMemo(
    () => filterMentionItems(resultItems),
    [filterMentionItems, resultItems]
  );

  // Auto-expand categories with matches, manual toggle otherwise
  const paramsExpanded = hasQuery
    ? filteredParams.length > 0
    : expandedCategories.has("params");
  const calcsExpanded = hasQuery
    ? filteredCalcs.length > 0
    : expandedCategories.has("calcs");
  const resultsExpanded = hasQuery
    ? filteredResults.length > 0
    : expandedCategories.has("results");

  // Flat list for keyboard navigation
  const flatMentionItems = useMemo(() => {
    const items: MentionItem[] = [];
    if (paramsExpanded) items.push(...filteredParams);
    if (calcsExpanded) items.push(...filteredCalcs);
    if (resultsExpanded) items.push(...filteredResults);
    return items;
  }, [
    paramsExpanded,
    calcsExpanded,
    resultsExpanded,
    filteredParams,
    filteredCalcs,
    filteredResults,
  ]);

  const mentionDropdownVisible =
    mentionActive &&
    (filteredParams.length > 0 ||
      filteredCalcs.length > 0 ||
      filteredResults.length > 0 ||
      !hasQuery);

  // ── Resolve @Label from prefill text → MentionData ─────────────────
  const allMentionItems = useMemo(
    () => [...paramItems, ...calcItems, ...resultItems],
    [paramItems, calcItems, resultItems]
  );

  const resolveNodeLabel = useCallback(
    (textAfterAt: string): MentionData | null => {
      let bestMatch: MentionData | null = null;
      let bestLength = 0;
      for (const item of allMentionItems) {
        const label = item.displayLabel;
        if (
          textAfterAt.startsWith(label) &&
          label.length > bestLength
        ) {
          const nodeType = item.node.status === "imposed"
            ? ("parameter" as const)
            : resultNodeIds.has(item.node.id)
              ? ("result" as const)
              : ("calculation" as const);
          bestMatch = {
            nodeId: item.node.id,
            label,
            type: nodeType,
            field: item.field,
          };
          bestLength = label.length;
        }
      }
      return bestMatch;
    },
    [allMentionItems, resultNodeIds]
  );

  // ── Click outside ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setChatOpen(false);
        setCompactThread(false);
        setIsClosing(true);
        setAiAssistantOpen(false);
      }
    };
    const timer = setTimeout(
      () => document.addEventListener("mousedown", handler),
      80
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [isExpanded, setAiAssistantOpen]);

  // ── Load conversation ─────────────────────────────────────────────
  useEffect(() => {
    if (isExpanded && currentProjectId) loadConversation();
  }, [isExpanded, currentProjectId, loadConversation]);

  // ── Refresh graph data when AI finishes ───────────────────────────
  useEffect(() => {
    if (prevIsSendingRef.current && !isSending) refresh();
    prevIsSendingRef.current = isSending;
  }, [isSending, refresh]);

  // ── Auto-scroll ───────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, isSending]);

  useEffect(() => {
    if (!chatOpen) return;
    requestAnimationFrame(() => {
      if (scrollRef.current)
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, [chatOpen]);

  // ── Focus ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isExpanded) {
      const t = setTimeout(() => mentionInputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isSending && isExpanded) mentionInputRef.current?.focus();
  }, [isSending, isExpanded]);

  // ── Prefill from AiActionableArea ─────────────────────────────────
  useEffect(() => {
    let tid: NodeJS.Timeout;
    if (aiPromptPrefill !== null) {
      // Set content in MentionInput (parses @mentions into tags)
      setTimeout(() => {
        mentionInputRef.current?.setContent(aiPromptPrefill, resolveNodeLabel);
        setTextValue(aiPromptPrefill);
        mentionInputRef.current?.focus();
      }, 50);

      if (aiAutoSend) {
        if (isSending) return;
        tid = setTimeout(async () => {
          setAiAutoSend(false);
          setAiPromptPrefill(null);
          const text = aiPromptPrefill.trim();
          if (text && !isSending) {
            const prefix = aiContext ? `"${aiContext.label}" : ` : "";
            // Show chat + loading BEFORE sending
            setChatOpen(true);
            setCompactThread(true);
            try {
              await sendMessage(prefix + text, aiContext || undefined);
              refresh();
              clearAiContext();
              mentionInputRef.current?.clear();
              setTextValue("");
            } catch (e) {
              console.error("Failed to send auto message", e);
            }
          }
        }, 150);
      }
    }
    return () => {
      if (tid) clearTimeout(tid);
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
    resolveNodeLabel,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleMentionSelect = useCallback(
    (item: MentionItem) => {
      const node = item.node;
      const nodeType = node.status === "imposed"
        ? ("parameter" as const)
        : resultNodeIds.has(node.id)
          ? ("result" as const)
          : ("calculation" as const);
      const data: MentionData = {
        nodeId: node.id,
        label: item.displayLabel,
        type: nodeType,
        field: item.field,
      };
      mentionInputRef.current?.insertMentionAtQuery(data);
      setAiContext({
        label: item.displayLabel,
        type: nodeType,
        target: item.field
          ? { kind: "node-field", id: node.id, field: item.field }
          : { kind: "node", id: node.id },
      });
      setMentionQuery(null);
      setMentionSelectedIdx(0);
      setExpandedCategories(new Set());
    },
    [resultNodeIds, setAiContext]
  );

  const handleInputChange = useCallback(
    (text: string) => {
      if (aiPromptPrefill !== null) setAiPromptPrefill(null);
      if (compactThread) setCompactThread(false);
      setTextValue(text);
    },
    [aiPromptPrefill, compactThread, setAiPromptPrefill]
  );

  const handleMentionHover = useCallback(
    (nodeId: string | null) => {
      flashNodeHighlight(nodeId, nodeId ? 1500 : 0);
    },
    [flashNodeHighlight]
  );

  const handleMentionQueryChange = useCallback(
    (query: string | null) => {
      setMentionQuery(query);
      setMentionSelectedIdx(0);
      if (query === null) setExpandedCategories(new Set());
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    const text = mentionInputRef.current?.getTextValue()?.trim() || "";
    if ((!text && !aiContext) || isSending) return;
    mentionInputRef.current?.clear();
    setTextValue("");
    setMentionQuery(null);
    if (aiPromptPrefill !== null) setAiPromptPrefill(null);
    // Only add prefix if there's no @mention already in the text
    const hasMention = text.includes("@");
    const prefix = aiContext && !hasMention ? `"${aiContext.label}" : ` : "";
    // Show chat immediately so user sees their message + loading
    setChatOpen(true);
    setCompactThread(true);
    try {
      await sendMessage(prefix + (text || "Explique"), aiContext || undefined);
      refresh();
      clearAiContext();
      setCompactThread(false);
    } catch (e) {
      console.error("Failed to send message", e);
    }
  }, [
    aiPromptPrefill,
    aiContext,
    isSending,
    sendMessage,
    refresh,
    clearAiContext,
    setAiPromptPrefill,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // ── @ mention keyboard navigation ──
      if (mentionActive && flatMentionItems.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionSelectedIdx((i) =>
            Math.min(i + 1, flatMentionItems.length - 1)
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionSelectedIdx((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const item = flatMentionItems[mentionSelectedIdx];
          if (item) handleMentionSelect(item);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setMentionQuery(null);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        setAiAssistantOpen(false);
        setChatOpen(false);
      }
    },
    [
      mentionActive,
      flatMentionItems,
      mentionSelectedIdx,
      handleMentionSelect,
      handleSubmit,
      setAiAssistantOpen,
    ]
  );

  const handleToggle = () => {
    if (isExpanded) {
      setChatOpen(false);
      setCompactThread(false);
      setIsClosing(true);
      setAiAssistantOpen(false);
    } else {
      setAiAssistantOpen(true);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── Visible messages ──────────────────────────────────────────────
  const visibleMessages = messages;

  // ── Render ────────────────────────────────────────────────────────
  const aiSurface = isLightMode
    ? "bg-white text-zinc-900"
    : "bg-zinc-900 text-zinc-100";
  const aiMuted = isLightMode ? "text-zinc-500" : "text-zinc-400";
  const aiStrong = isLightMode ? "text-zinc-900" : "text-zinc-100";

  if (hideHub) return null;

  // ── Mention dropdown category renderer ────────────────────────────
  const renderMentionCategory = (
    label: string,
    key: string,
    icon: React.ReactNode,
    items: MentionItem[],
    expanded: boolean,
    globalIdx: number
  ) => {
    const count = items.length;
    if (hasQuery && count === 0) return { element: null, nextIdx: globalIdx };

    const headerEl = (
      <button
        key={`cat-${key}`}
        onMouseDown={(e) => {
          e.preventDefault();
          toggleCategory(key);
        }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
          isLightMode
            ? "hover:bg-zinc-50 text-zinc-500"
            : "hover:bg-zinc-800/50 text-zinc-400"
        )}
      >
        {icon}
        <span className="text-[12px] font-semibold uppercase tracking-wider flex-1">
          {label}
        </span>
        <span className={cn("text-[11px]", aiMuted)}>{count}</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
    );

    const itemEls = expanded
      ? items.slice(0, 15).map((item) => {
          const idx = globalIdx++;
          const isSubField = !!item.field;
          return (
            <button
              key={item.id}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMentionSelect(item);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                isSubField ? "pl-10" : "pl-7",
                idx === mentionSelectedIdx
                  ? isLightMode
                    ? "bg-violet-50"
                    : "bg-violet-500/15"
                  : isLightMode
                    ? "hover:bg-zinc-50"
                    : "hover:bg-zinc-800/50"
              )}
            >
              <span
                className={cn(
                  "truncate",
                  isSubField
                    ? cn("text-[12px]", aiMuted)
                    : cn("text-[13px] font-medium", isLightMode ? "text-zinc-800" : "text-zinc-200")
                )}
              >
                {item.displayLabel}
              </span>
            </button>
          );
        })
      : [];

    return {
      element: (
        <div key={key}>
          {headerEl}
          {itemEls}
        </div>
      ),
      nextIdx: globalIdx,
    };
  };

  const hasInputContent = textValue.trim().length > 0 || !!aiContext;

  return (
    <>
      {/* Mobile backdrop when AI open */}
      <AnimatePresence>
        {isExpanded && isMobile && (
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setAiAssistantOpen(false)}
          />
        )}
      </AnimatePresence>
      <div
      ref={containerRef}
      className="fixed bottom-[66px] md:bottom-6 right-4 md:right-6 z-50 flex flex-col md:flex-row items-end gap-2"
    >
      <div className="relative">
        {/* Collapsed pill — hidden when managed by topbar */}
        {!hidePill && !isExpanded && !isClosing && (
          <button
            onClick={handleToggle}
            className={cn(
              "ai-bounce-on-hover relative flex items-stretch cursor-pointer select-none w-full overflow-hidden",
              "transition-all duration-200 md:rounded-[25px] rounded-full border",
              "hover:-translate-y-0.5 hover:shadow-md hover:shadow-violet-500/15",
              isLightMode
                ? "bg-white border-zinc-200 shadow-md hover:shadow-lg hover:border-zinc-300"
                : "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center md:px-4 w-14 h-14 md:w-auto md:h-auto",
                isLightMode ? "bg-violet-100" : "bg-violet-900"
              )}
            >
              <Pencil
                className={cn(
                  "ai-bounce-target w-5 h-5",
                  isLightMode ? "text-violet-600" : "text-violet-300"
                )}
              />
            </div>
            <div className="hidden md:flex flex-col justify-center px-4 py-3">
              <span
                className={cn(
                  "text-[15px] font-semibold tracking-tight",
                  aiStrong
                )}
              >
                Éditer, comprendre…
              </span>
              <span className={cn("text-[12px] font-medium", aiMuted)}>
                Assistant IA
              </span>
            </div>
          </button>
        )}

        <AnimatePresence
          initial={false}
          onExitComplete={() => setIsClosing(false)}
        >
          {isExpanded && (
            <motion.div
              key="module"
              initial={{ x: 24, opacity: 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 1 }}
              transition={{ duration: 0.22, ease: [0.22, 0.8, 0.35, 1] }}
              className="relative origin-bottom-right w-[min(94vw,620px)]"
            >
              <div
                className={cn(
                  "rounded-[26px] border",
                  isLightMode ? "border-zinc-200" : "border-zinc-700"
                )}
              >
                <div
                  className={cn(
                    "rounded-[25px] flex flex-col",
                    aiSurface
                  )}
                >
                  {/* Toggle chat header */}
                  <div
                    onClick={() => {
                      setChatOpen((v) => {
                        const next = !v;
                        if (next) setCompactThread(false);
                        return next;
                      });
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-2.5 transition-colors cursor-pointer",
                      isLightMode
                        ? "hover:bg-zinc-200/40"
                        : "hover:bg-zinc-800/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[12px] font-medium",
                          isLightMode
                            ? "text-violet-600"
                            : "text-violet-300"
                        )}
                      >
                        {chatOpen
                          ? "Masquer la discussion"
                          : "Afficher la discussion"}
                      </span>
                      <span className={cn("text-[11px]", aiMuted)}>
                        {messages.length} messages
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle();
                      }}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        "transition-colors",
                        isLightMode
                          ? "hover:bg-zinc-200"
                          : "hover:bg-zinc-800"
                      )}
                    >
                      <X className={cn("w-4 h-4", aiMuted)} />
                    </button>
                  </div>

                  {/* Chat area */}
                  {chatOpen && (
                    <div
                      className={cn(
                        "px-5 pb-4 pt-2 border-t",
                        isLightMode
                          ? "border-zinc-200"
                          : "border-zinc-700"
                      )}
                    >
                      {/* Empty state — quick actions */}
                      {!hasMessages && (
                        <div className="py-2 space-y-3">
                          <p className={cn("text-[13px]", aiMuted)}>
                            Posez une question ou sélectionnez un élément.
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <QuickAction
                              label="Résumer le modèle"
                              onClick={() => {
                                mentionInputRef.current?.setContent(
                                  "Résume ce modèle en quelques phrases"
                                );
                                setTextValue(
                                  "Résume ce modèle en quelques phrases"
                                );
                                mentionInputRef.current?.focus();
                              }}
                            />
                            {nodes.some((n) => n.computation_error) ? (
                              <QuickAction
                                label="Corriger les erreurs"
                                onClick={() => {
                                  mentionInputRef.current?.setContent(
                                    "Il y a des erreurs de calcul, peux-tu les corriger ?"
                                  );
                                  setTextValue(
                                    "Il y a des erreurs de calcul, peux-tu les corriger ?"
                                  );
                                  mentionInputRef.current?.focus();
                                }}
                              />
                            ) : (
                              <QuickAction
                                label="Créer un scénario"
                                onClick={() => {
                                  mentionInputRef.current?.setContent(
                                    "Propose un scénario intéressant pour ce modèle"
                                  );
                                  setTextValue(
                                    "Propose un scénario intéressant pour ce modèle"
                                  );
                                  mentionInputRef.current?.focus();
                                }}
                              />
                            )}
                            <QuickAction
                              label="Enrichir le modèle"
                              onClick={() => {
                                mentionInputRef.current?.setContent(
                                  "Quels paramètres ou calculs pourraient enrichir ce modèle ?"
                                );
                                setTextValue(
                                  "Quels paramètres ou calculs pourraient enrichir ce modèle ?"
                                );
                                mentionInputRef.current?.focus();
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <div
                        ref={scrollRef}
                        className="max-h-[60vh] overflow-y-auto pr-1"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: isLightMode
                            ? "#d4d4d8 transparent"
                            : "#27272a transparent",
                        }}
                      >
                        <div className="space-y-3">
                          {(compactThread
                            ? visibleMessages.slice(-2)
                            : visibleMessages
                          ).map((message, index, list) => {
                            const baseIndex = compactThread
                              ? messages.length - list.length + index
                              : index;
                            return (
                              <MessageBubble
                                key={message.id}
                                message={message}
                                nodes={nodes}
                                isLastAssistant={
                                  message.role === "assistant" &&
                                  baseIndex === messages.length - 1 &&
                                  !isSending
                                }
                                isStreaming={
                                  message.role === "assistant" &&
                                  baseIndex === messages.length - 1 &&
                                  isSending &&
                                  !message.content
                                }
                                suggestedActions={
                                  message.role === "assistant" &&
                                  baseIndex === messages.length - 1 &&
                                  !isSending
                                    ? suggestedActions
                                    : undefined
                                }
                                onSuggestedAction={(a) => {
                                  mentionInputRef.current?.setContent(a);
                                  setTextValue(a);
                                  mentionInputRef.current?.focus();
                                }}
                                onClosePanel={() =>
                                  setAiAssistantOpen(false)
                                }
                              />
                            );
                          })}
                          {isSending && messages.length === 0 && (
                            <div className="flex gap-2.5 items-start">
                              <div
                                className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                  isLightMode
                                    ? "bg-zinc-200"
                                    : "bg-zinc-800"
                                )}
                              >
                                <SmartGraphLogo size={12} />
                              </div>
                              <TypingDots />
                            </div>
                          )}
                          {error && (
                            <div className="flex gap-2.5 items-start text-red-500 text-sm">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Input area */}
                  <div
                    className={cn(
                      "px-5 pt-3 pb-4 border-t relative",
                      isLightMode
                        ? "border-zinc-200"
                        : "border-zinc-700"
                    )}
                  >
                    {/* @ Mention dropdown */}
                    <AnimatePresence>
                      {mentionDropdownVisible && (
                        <motion.div
                          ref={mentionListRef}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            "absolute bottom-full left-5 right-5 mb-1 rounded-xl border shadow-lg overflow-hidden z-50",
                            isLightMode
                              ? "bg-white border-zinc-200"
                              : "bg-zinc-900 border-zinc-700"
                          )}
                        >
                          <div className="max-h-[240px] overflow-y-auto py-1">
                            {(() => {
                              let idx = 0;
                              const sections: React.ReactNode[] = [];

                              // Paramètres
                              const pItems = hasQuery ? filteredParams : paramItems;
                              if (!hasQuery || pItems.length > 0) {
                                const r = renderMentionCategory(
                                  "Paramètres",
                                  "params",
                                  <Circle className="h-2.5 w-2.5 fill-current text-blue-400 shrink-0" />,
                                  pItems,
                                  paramsExpanded,
                                  idx
                                );
                                if (r.element) sections.push(r.element);
                                idx = r.nextIdx;
                              }

                              // Calculs
                              const cItems = hasQuery ? filteredCalcs : calcItems;
                              if (!hasQuery || cItems.length > 0) {
                                const r = renderMentionCategory(
                                  "Calculs",
                                  "calcs",
                                  <Triangle className="h-2.5 w-2.5 fill-current rotate-90 text-purple-400 shrink-0" />,
                                  cItems,
                                  calcsExpanded,
                                  idx
                                );
                                if (r.element) sections.push(r.element);
                                idx = r.nextIdx;
                              }

                              // Résultats
                              const rItems = hasQuery ? filteredResults : resultItems;
                              if (!hasQuery || rItems.length > 0) {
                                const r = renderMentionCategory(
                                  "Résultats",
                                  "results",
                                  <Circle className="h-2.5 w-2.5 fill-current text-emerald-400 shrink-0" />,
                                  rItems,
                                  resultsExpanded,
                                  idx
                                );
                                if (r.element) sections.push(r.element);
                              }

                              return sections;
                            })()}
                          </div>
                          <div
                            className={cn(
                              "px-3 py-1.5 text-[11px] border-t",
                              isLightMode
                                ? "text-zinc-400 border-zinc-100 bg-zinc-50"
                                : "text-zinc-500 border-zinc-800 bg-zinc-900/50"
                            )}
                          >
                            <kbd className="font-mono text-[10px]">
                              ↑↓
                            </kbd>{" "}
                            naviguer ·{" "}
                            <kbd className="font-mono text-[10px]">
                              Enter
                            </kbd>{" "}
                            sélectionner ·{" "}
                            <kbd className="font-mono text-[10px]">
                              Esc
                            </kbd>{" "}
                            fermer
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative flex items-end gap-3">
                      <MentionInput
                        ref={mentionInputRef}
                        placeholder={
                          aiContext
                            ? "Votre question..."
                            : "Demander à l'IA... (@ pour mentionner)"
                        }
                        disabled={isSending || isLoading}
                        isLightMode={isLightMode}
                        onInput={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onMentionQueryChange={handleMentionQueryChange}
                        onMentionHover={handleMentionHover}
                        maxHeight={100}
                      />

                      <div className="relative">
                        <button
                          onClick={handleSubmit}
                          disabled={!hasInputContent || isSending}
                          className={cn(
                            "relative w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0 transition-colors",
                            hasInputContent && !isSending
                              ? "bg-violet-500 text-white hover:bg-violet-600"
                              : isLightMode
                                ? "bg-zinc-200 text-zinc-500"
                                : "bg-zinc-800 text-zinc-500"
                          )}
                        >
                          <ArrowUp className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
}
