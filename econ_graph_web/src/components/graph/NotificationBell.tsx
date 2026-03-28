"use client";

import { apiClient } from "@/lib/api/client";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import type {
  InsightsResponse,
  ProjectNotification,
} from "@/types/notifications";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronRight,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "maintenant";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function getCategory(n: ProjectNotification): "important" | "advice" | "info" {
  if (n.category === "important" || n.category === "advice" || n.category === "info") {
    return n.category;
  }
  if (n.type === "alert") return "important";
  if (n.type === "suggestion" || n.type === "insight") return "advice";
  return "info";
}

// ─── Main component ─────────────────────────────────────────────────────────

export function NotificationBell({ dropDown = false, topbarMode = false }: { dropDown?: boolean; topbarMode?: boolean } = {}) {
  const { isLightMode } = useGraphTheme();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentRole = useProjectStore((s) => s.getCurrentRole)();
  const aiAssistantOpen = useUIStore((s) => s.aiAssistantOpen);
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);
  const setAiPromptPrefill = useUIStore((s) => s.setAiPromptPrefill);
  const setAiAutoSend = useUIStore((s) => s.setAiAutoSend);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);

  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // Transient chip for headline notification
  const [transientNotif, setTransientNotif] = useState<ProjectNotification | null>(null);
  const [transientVisible, setTransientVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const transientTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shownHeadlineIds = useRef<Set<string>>(new Set());
  const autoRefreshedRef = useRef(false);
  const mountTimeRef = useRef<number>(Date.now());

  const unreadCount = insights?.unread_count || 0;
  const headline = insights?.headline;
  const notifications = insights?.notifications || [];
  const sections = useMemo(() => {
    if (insights?.sections && insights.sections.length > 0) {
      return insights.sections;
    }
    const buckets: Record<"important" | "advice" | "info", ProjectNotification[]> = {
      important: [],
      advice: [],
      info: [],
    };
    for (const n of notifications) {
      buckets[getCategory(n)].push(n);
    }
    const built = [];
    if (buckets.important.length) built.push({ key: "important", title: "Important", notifications: buckets.important });
    if (buckets.advice.length) built.push({ key: "advice", title: "Conseils", notifications: buckets.advice });
    if (buckets.info.length) built.push({ key: "info", title: "Infos", notifications: buckets.info });
    return built;
  }, [insights?.sections, notifications]);

  const hideHub = currentRole === "public" || !currentProjectId || aiAssistantOpen;

  // ── Load notifications (60s polling) ──────────────────────────────────────
  useEffect(() => {
    if (!currentProjectId) return;
    autoRefreshedRef.current = false;
    let mounted = true;
    const load = async (refresh: boolean) => {
      try {
        const data = await apiClient.get<InsightsResponse>(
          refresh
            ? `/projects/${currentProjectId}/insights?refresh=true`
            : `/projects/${currentProjectId}/insights`
        );
        if (mounted) setInsights(data);
        return data;
      } catch {
        // Silent fail — non-critical feature
        return null;
      }
    };
    const run = async () => {
      const initial = await load(false);
      if (
        !autoRefreshedRef.current &&
        initial &&
        (initial.notifications || []).length === 0
      ) {
        autoRefreshedRef.current = true;
        await load(true);
      }
    };
    run();
    const iv = setInterval(() => {
      void load(false);
    }, 60_000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [currentProjectId]);

  // ── Transient chip: show when a new headline arrives ──────────────────────
  useEffect(() => {
    if (!headline) return;
    if (headline.read_at) return; // already read
    if (shownHeadlineIds.current.has(headline.id)) return; // already shown this session
    if (panelOpen) return; // panel open — user already sees it

    shownHeadlineIds.current.add(headline.id);

    const INITIAL_DELAY_MS = 30_000;
    const elapsed = Date.now() - mountTimeRef.current;
    const delay = Math.max(0, INITIAL_DELAY_MS - elapsed);

    if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
    transientTimerRef.current = setTimeout(() => {
      setTransientNotif(headline);
      setTransientVisible(true);
      transientTimerRef.current = setTimeout(() => setTransientVisible(false), 8000);
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline?.id, headline?.read_at]);

  // ── Click outside closes panel ────────────────────────────────────────────
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 80);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [panelOpen]);

  // ── Periodic notification rotation (every 30s) ──────────────────────────────
  useEffect(() => {
    if (!notifications || notifications.length === 0 || panelOpen || aiAssistantOpen) {
      return;
    }

    const interval = setInterval(() => {
      if (notifications.length > 0 && !panelOpen && !aiAssistantOpen) {
        // Pick a random notification from the list
        const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];
        setTransientNotif(randomNotif);
        setTransientVisible(true);

        // Auto-hide after 8 seconds
        if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
        transientTimerRef.current = setTimeout(() => setTransientVisible(false), 8000);
      }
    }, 30_000); // 30 seconds

    return () => clearInterval(interval);
  }, [notifications, panelOpen, aiAssistantOpen]);

  // ── Auto-refresh notifications every 5 minutes ─────────────────────────────
  useEffect(() => {
    if (!currentProjectId) return;

    const refreshInterval = setInterval(() => {
      void (async () => {
        try {
          const data = await apiClient.get<InsightsResponse>(
            `/projects/${currentProjectId}/insights?refresh=true`
          );
          setInsights(data);
        } catch {
          // Silent fail — non-critical
        }
      })();
    }, 5 * 60_000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [currentProjectId]);

  // ── Cleanup timer on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
    };
  }, []);

  // ── Delete notification ────────────────────────────────────────────────────
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!currentProjectId) return;
      try {
        await apiClient.delete(
          `/projects/${currentProjectId}/notifications/${notificationId}`
        );
        // Remove from local state immediately
        setInsights((p) =>
          p
            ? {
                ...p,
                unread_count: Math.max((p.unread_count || 1) - 1, 0),
                notifications: (p.notifications || []).filter((x) => x.id !== notificationId),
                headline: p.headline?.id === notificationId ? null : p.headline,
                sections: undefined,
              }
            : p
        );
      } catch {
        // Silent fail
      }
    },
    [currentProjectId]
  );

  // ── Trigger notification action ────────────────────────────────────────────
  const triggerNotification = useCallback(
    (n: ProjectNotification) => {
      const scenarioId = (n.payload as Record<string, unknown>)?.scenario_id as
        | string
        | undefined;

      if (scenarioId) {
        // Direct scenario activation — no AI involved
        setActiveScenario(scenarioId);
      } else {
        // AI action
        const payloadPrompt = (
          (n.payload as Record<string, unknown>)?.action_prompt as string | undefined
        )?.trim();

        const prompt = payloadPrompt
          ? `Lance cette modification :\n${payloadPrompt}`
          : `Analyse et explique ce problème :\n${n.body || n.title}`;

        setAiPromptPrefill(prompt);
        // Only auto-send if we have an explicit action_prompt (suggestions/ai insights)
        // For alerts without action_prompt, let user decide to send
        setAiAutoSend(!!payloadPrompt);
        setAiAssistantOpen(true);
      }

      void deleteNotification(n.id);
    },
    [setActiveScenario, setAiPromptPrefill, setAiAutoSend, setAiAssistantOpen, deleteNotification]
  );

  // ── Bell button click ──────────────────────────────────────────────────────
  const handleBellClick = () => {
    // Dismiss transient chip when opening panel
    setTransientVisible(false);
    if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
    setPanelOpen((v) => !v);
  };

  // ── Transient chip handlers ────────────────────────────────────────────────
  const handleTransientClick = () => {
    if (!transientNotif) return;
    setTransientVisible(false);
    if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
    triggerNotification(transientNotif);
  };

  const handleTransientDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTransientVisible(false);
    if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
  };

  if (hideHub) return null;

  const isScenarioAction = (n: ProjectNotification) =>
    !!(n.payload as Record<string, unknown>)?.scenario_id;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative flex flex-col items-end">

      {/* ── Notification panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 0.8, 0.35, 1] }}
            className={cn(
              "rounded-2xl border shadow-xl overflow-hidden z-[200]",
              dropDown
                ? "fixed top-14 left-2 right-2 w-auto"
                : topbarMode
                  ? "absolute top-full right-0 mt-2 w-[340px]"
                  : "absolute w-[340px] bottom-full right-0 mb-2",
              isLightMode
                ? "bg-white border-zinc-200"
                : "bg-zinc-900 border-zinc-700/60"
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center justify-between px-4 py-3 border-b",
                isLightMode ? "border-zinc-100" : "border-zinc-800"
              )}
            >
              <div className="flex items-center gap-2">
                <Bell
                  className={cn(
                    "w-4 h-4",
                    isLightMode ? "text-zinc-500" : "text-zinc-400"
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isLightMode ? "text-zinc-900" : "text-zinc-100"
                  )}
                >
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold bg-violet-500 text-white px-1">
                    {unreadCount}
                  </span>
                )}
              </div>

            </div>

            {/* List */}
            <div
              className={cn("overflow-y-auto", dropDown ? "max-h-[60svh]" : "max-h-[360px]")}
              style={{ scrollbarWidth: "thin" }}
            >
              {sections.length === 0 ? (
                <div
                  className={cn(
                    "px-4 py-8 text-center text-[13px]",
                    isLightMode ? "text-zinc-400" : "text-zinc-500"
                  )}
                >
                  Aucune notification
                </div>
              ) : (
                <div className="py-1">
                  {sections.map((section) => (
                    <div key={section.key} className="pb-2">
                      <div
                        className={cn(
                          "px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide",
                          isLightMode ? "text-zinc-400" : "text-zinc-500"
                        )}
                      >
                        {section.title}
                      </div>
                      {section.notifications.map((n) => {
                        const isUnread = !n.read_at;
                        const scenarioAction = isScenarioAction(n);
                        const eventAt = n.last_event_at || n.created_at;
                        const aggregateCount = n.aggregate_count ?? 1;
                        return (
                          <button
                            key={n.id}
                            onClick={() => triggerNotification(n)}
                            className={cn(
                              "group relative w-full text-left px-4 py-2.5 transition-colors",
                              isUnread
                                ? isLightMode ? "bg-violet-50/50" : "bg-violet-500/5"
                                : "",
                              isLightMode ? "hover:bg-zinc-50" : "hover:bg-zinc-800/40"
                            )}
                          >
                            {/* Unread dot */}
                            {isUnread && (
                              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-violet-500" />
                            )}

                            <div className="flex items-center gap-3">
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className={cn(
                                    "text-[13px] font-medium leading-snug truncate",
                                    isLightMode ? "text-zinc-900" : "text-zinc-100"
                                  )}>
                                    {n.title}
                                  </p>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {aggregateCount > 1 && (
                                      <span
                                        className={cn(
                                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                          isLightMode
                                            ? "bg-zinc-100 text-zinc-600"
                                            : "bg-zinc-800 text-zinc-300"
                                        )}
                                      >
                                        x{aggregateCount}
                                      </span>
                                    )}
                                    <span className={cn(
                                      "text-[11px] tabular-nums",
                                      isLightMode ? "text-zinc-400" : "text-zinc-500"
                                    )}>
                                      {timeAgo(eventAt)}
                                    </span>
                                  </div>
                                </div>
                                {n.body && (
                                  <p className={cn(
                                    "text-[12px] leading-snug mt-0.5 line-clamp-1",
                                    isLightMode ? "text-zinc-500" : "text-zinc-400"
                                  )}>
                                    {n.body}
                                  </p>
                                )}
                              </div>

                              {/* Hover action icon */}
                              <div className={cn(
                                "shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                scenarioAction ? "text-emerald-400" : isLightMode ? "text-zinc-400" : "text-zinc-500"
                              )}>
                                {scenarioAction
                                  ? <Play className="w-3.5 h-3.5" />
                                  : <ChevronRight className="w-3.5 h-3.5" />
                                }
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bell button OR Transient notification (floating mode) ─────────── */}
      <AnimatePresence mode="popLayout">
        {transientVisible && transientNotif && !panelOpen && !dropDown && !topbarMode ? (
          <motion.div
            key="transient"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 0.8, 0.35, 1] }}
            onClick={handleTransientClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTransientClick(); }}
            className={cn(
              "group relative flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all max-w-[320px] text-left cursor-pointer",
              isLightMode
                ? "bg-white border-violet-300 hover:bg-violet-50 hover:border-violet-400 hover:shadow-violet-200"
                : "bg-zinc-800 border-violet-500/50 hover:bg-zinc-700 hover:border-violet-400 hover:shadow-violet-900/60"
            )}
          >
            {/* Icon */}
            <div className={cn(
              "shrink-0 p-1.5 rounded-lg mt-0.5",
              isLightMode
                ? "bg-violet-100 text-violet-600"
                : "bg-violet-900/40 text-violet-300"
            )}>
              <Sparkles className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[13px] font-medium leading-snug",
                isLightMode ? "text-zinc-900" : "text-zinc-100"
              )}>
                {transientNotif.title}
              </p>
              {transientNotif.body && (
                <p className={cn(
                  "text-[12px] leading-snug mt-1",
                  isLightMode ? "text-zinc-600" : "text-zinc-400"
                )}>
                  {transientNotif.body}
                </p>
              )}
            </div>

            {/* Action indicator */}
            <ChevronRight
              className={cn(
                "shrink-0 w-4 h-4 transition-transform group-hover:translate-x-0.5",
                isLightMode ? "text-zinc-400 group-hover:text-violet-600" : "text-zinc-500 group-hover:text-violet-400"
              )}
            />

            {/* Dismiss button */}
            <button
              onClick={handleTransientDismiss}
              className={cn(
                "shrink-0 p-0.5 rounded-full transition-colors",
                isLightMode
                  ? "hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                  : "hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Auto-dismiss progress bar */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 rounded-b-lg origin-left",
                isLightMode ? "bg-violet-400" : "bg-violet-500",
                "animate-shrink-8s"
              )}
              style={{ width: "100%" }}
            />
          </motion.div>
        ) : (
          <motion.button
            key="bell"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 0.8, 0.35, 1] }}
            onClick={handleBellClick}
            className={cn(
              "relative flex items-center justify-center transition-all duration-150",
              topbarMode
                ? cn(
                    "w-7 h-7 rounded-md",
                    panelOpen
                      ? "bg-accent text-violet-500"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )
                : cn(
                    "rounded-full border w-10 h-10",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    panelOpen
                      ? isLightMode
                        ? "bg-violet-50 border-violet-300 shadow-violet-100"
                        : "bg-violet-600 border-violet-500 shadow-lg shadow-violet-900/40"
                      : isLightMode
                        ? "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700"
                        : "bg-zinc-700 border-zinc-500 hover:border-zinc-400 hover:bg-zinc-600"
                  )
            )}
          >
            <Bell
              className={cn(
                "transition-colors",
                topbarMode
                  ? "w-4 h-4"
                  : cn(
                      "w-[18px] h-[18px]",
                      panelOpen
                        ? isLightMode ? "text-violet-600" : "text-white"
                        : isLightMode ? "text-zinc-600" : "text-zinc-100"
                    )
              )}
            />

            {/* Count badge */}
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key={unreadCount}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold bg-gradient-to-r from-violet-500 to-blue-500 text-white px-1 shadow-sm"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
