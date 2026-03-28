"use client";

import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { cn } from "@/lib/utils";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import type { AiContextInfo } from "@/types/ai-context";
import type { ChatMessage, SuggestedAction } from "@/types/project-chat";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowRight,
    Check,
    Circle,
    Loader2,
    Play,
    Triangle,
} from "lucide-react";
import { buildNodeContext, detectNodes, getSuggestions } from "./chat-utils";
import { QuickAction } from "./QuickAction";
import { RenderContent } from "./RenderContent";
import { TypingDots } from "./TypingDots";

// ── Helpers to summarize verbose action lists ────────────────────

interface ActionSummary {
  type: "scenario" | "node-mutation" | "other";
  label: string;
  ok: boolean;
  isPending: boolean;
  scenarioId?: string;
  scenarioName?: string;
  overrideCount?: number;
  failedCount?: number;
}

function summarizeActions(actions: any[]): ActionSummary[] {
  const scenarioGroups = new Map<
    string,
    { name: string; id: string; created: boolean; ok: number; failed: number; pending: boolean }
  >();

  const otherActions: ActionSummary[] = [];

  for (const a of actions) {
    const tool: string = a.tool || "";
    const ok = a.status !== "pending" && a.result?.success !== false;
    const isPending = a.status === "pending";

    // Group scenario-related tools
    if (tool === "create_scenario" || tool === "set_scenario_override" || tool === "delete_scenario_override") {
      const sid =
        a.result?.scenario_id || a.args?.scenario_id || "unknown";
      const existing = scenarioGroups.get(sid);
      if (existing) {
        if (ok) existing.ok++;
        else existing.failed++;
        if (isPending) existing.pending = true;
      } else {
        scenarioGroups.set(sid, {
          name: a.args?.name || a.result?.message?.match(/: (.+)$/)?.[1] || sid.slice(0, 8),
          id: sid,
          created: tool === "create_scenario",
          ok: ok ? 1 : 0,
          failed: ok ? 0 : 1,
          pending: isPending,
        });
      }
      continue;
    }

    // Node mutations → compact summary
    if (
      ["update_node_formula", "convert_to_parameter", "delete_edge", "create_node",
       "update_node_fields", "delete_node"].includes(tool)
    ) {
      const slug = a.result?.node_slug || a.args?.node_slug || a.args?.label;
      const toolLabels: Record<string, string> = {
        create_node: "Créé",
        delete_node: "Supprimé",
        update_node_formula: "Formule modifiée",
        convert_to_parameter: "→ Paramètre",
        delete_edge: "Lien supprimé",
        update_node_fields: "Modifié",
      };
      otherActions.push({
        type: "node-mutation",
        label: `${toolLabels[tool] || "Modifié"}${slug ? ` · ${slug}` : ""}`,
        ok,
        isPending,
      });
      continue;
    }

    // Everything else (recompute, sensitivity, etc.)
    if (tool === "recompute_project") {
      otherActions.push({ type: "other", label: "Recalculé", ok, isPending });
    } else if (tool === "create_sensitivity_analysis") {
      otherActions.push({ type: "other", label: "Analyse de sensibilité créée", ok, isPending });
    }
    // Skip read-only tools (search_nodes, list_*, get_*)
  }

  const result: ActionSummary[] = [];

  // Emit one summary per scenario group
  for (const [, g] of scenarioGroups) {
    result.push({
      type: "scenario",
      label: g.created ? `Scénario "${g.name}"` : `Scénario ajusté`,
      ok: g.failed === 0,
      isPending: g.pending,
      scenarioId: g.id,
      scenarioName: g.name,
      overrideCount: Math.max(0, g.ok - (g.created ? 1 : 0)),
      failedCount: g.failed,
    });
  }

  result.push(...otherActions);
  return result;
}

// ── MessageBubble ────────────────────────────────────────────────

export function MessageBubble({
  message,
  nodes,
  isLightMode = true,
  isLastAssistant,
  isStreaming,
  suggestedActions,
  onSuggestedAction,
  onClosePanel,
}: {
  message: ChatMessage;
  nodes?: any[];
  isLightMode?: boolean;
  isLastAssistant?: boolean;
  isStreaming?: boolean;
  suggestedActions?: SuggestedAction[];
  onSuggestedAction?: (action: string) => void;
  onClosePanel?: () => void;
}) {
  const setSelectedNodeId = useUIStore((s) => s.selectNodeWithoutInspector);
  const requestNodeNavigation = useUIStore((s) => s.requestNodeNavigation);

  const focusContext = (context: AiContextInfo) => {
    if (!context.target) return;
    if (context.target.kind === "node" || context.target.kind === "node-field") {
      setSelectedNodeId(context.target.id);
      // Use the same scroll + flash as "dépend de" clicks
      requestNodeNavigation(context.target.id);
    }
    onClosePanel?.();
  };

  if (message.role === "user") {
    const citationMatch = message.content.match(/^"([^"]+)"\s*:\s*([\s\S]+)$/);
    const citedElement = citationMatch?.[1];
    const question = citationMatch?.[2] ?? message.content;
    const metadataContext = message.metadata?.context as AiContextInfo | undefined;
    let resolvedContext = metadataContext || null;

    if (!resolvedContext && citedElement) {
      const node = nodes?.find((n) => (n.label || n.slug) === citedElement);
      if (node) {
        resolvedContext = buildNodeContext(node);
      }
    }

    const userBubble = isLightMode
      ? "bg-zinc-900 text-white"
      : "bg-zinc-700 text-zinc-100";

    if (resolvedContext) {
      const canFocus = !!resolvedContext.target;
      return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
          <div className={cn("max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm", userBubble)}>
            <ContextTag
              context={resolvedContext}
              onClick={canFocus ? () => focusContext(resolvedContext) : undefined}
              className="mr-1.5 align-middle"
            />
            {question}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className={cn("max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap", userBubble)}>
          {message.content}
        </div>
      </motion.div>
    );
  }

  if (message.role === "assistant" && isStreaming && !message.content) {
    return null; // TypingDots gérés directement dans FloatingAiHub
  }

  const rawActions = (message.metadata?.actions as any[]) || [];
  const summaries = rawActions.length > 0 ? summarizeActions(rawActions) : [];
  const detectedNodes = detectNodes(message.content, nodes || []);
  const suggestions = isLastAssistant
    ? getSuggestions(message.content, detectedNodes, suggestedActions)
    : [];

  const assistantBubble = isLightMode
    ? "bg-zinc-100 text-zinc-900"
    : "bg-zinc-800 text-zinc-100";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5 items-start"
    >
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isLightMode ? "bg-violet-100" : "bg-violet-900/50"
      )}>
        <SmartGraphLogo size={13} />
      </div>
      <div className={cn("flex-1 min-w-0 space-y-2 rounded-2xl rounded-tl-sm px-3 py-2.5", assistantBubble)}>
        <div className="text-sm leading-relaxed markdown-prose">
          <RenderContent content={message.content} nodes={nodes || []} onClosePanel={onClosePanel} />
        </div>

        {summaries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {summaries.map((s, i) => (
              <SummaryTag key={i} summary={s} />
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {suggestions.map((s, i) => (
              <QuickAction key={i} label={s.label} onClick={() => onSuggestedAction?.(s.action)} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── SummaryTag (compact action summary) ──────────────────────────

function SummaryTag({ summary }: { summary: ActionSummary }) {
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);

  if (summary.type === "scenario" && summary.scenarioId) {
    const hasErrors = (summary.failedCount ?? 0) > 0;
    const overrides = summary.overrideCount ?? 0;

    // If all actions in this group failed, show as non-clickable error badge
    if (!summary.ok) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400">
          <AlertCircle className="w-3 h-3" />
          <span>{summary.label}</span>
          <span>· {summary.failedCount} err.</span>
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setActiveScenario(summary.scenarioId!)}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
      >
        {summary.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3" />
        )}
        <span>{summary.label}</span>
        {overrides > 0 && (
          <span className="text-zinc-500">· {overrides} param.</span>
        )}
        {hasErrors && (
          <span className="text-red-400">· {summary.failedCount} err.</span>
        )}
        <Play className="w-3 h-3 opacity-60" />
      </button>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
        summary.isPending
          ? "bg-zinc-800 text-zinc-400"
          : summary.ok
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-red-500/10 text-red-400",
      )}
    >
      {summary.isPending ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : summary.ok ? (
        <Check className="w-2.5 h-2.5" />
      ) : (
        <AlertCircle className="w-2.5 h-2.5" />
      )}
      <span>{summary.label}</span>
    </span>
  );
}

// ── ContextTag (user message citation) ───────────────────────────

function ContextTag({
  context,
  onClick,
  className,
}: {
  context: AiContextInfo;
  onClick?: () => void;
  className?: string;
}) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 transition-colors",
          className
        )}
      >
        {context.type === "parameter" && (
          <Circle className="h-2 w-2 fill-current text-blue-400" />
        )}
        {context.type === "calculation" && (
          <Triangle className="h-2 w-2 fill-current rotate-90 text-purple-400" />
        )}
        {context.type === "result" && (
          <Circle className="h-2 w-2 fill-current text-emerald-400" />
        )}
        <span className="text-sm">{context.label}</span>
        <ArrowRight className="w-2.5 h-2.5 opacity-60" />
      </button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-zinc-500", className)}>
      {context.type === "parameter" && (
        <Circle className="h-2 w-2 fill-current text-blue-400" />
      )}
      {context.type === "calculation" && (
        <Triangle className="h-2 w-2 fill-current rotate-90 text-purple-400" />
      )}
      {context.type === "result" && (
        <Circle className="h-2 w-2 fill-current text-emerald-400" />
      )}
      <span className="text-sm">{context.label}</span>
    </span>
  );
}
