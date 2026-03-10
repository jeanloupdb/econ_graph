"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiState";
import type { AiContextInfo } from "@/types/ai-context";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { getNodeContextType, normalizeKey } from "./chat-utils";

// ── Helpers ────────────────────────────────────────────────────────

/** Recursively extract plain text from React children */
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

const typeColors: Record<AiContextInfo["type"], string> = {
  parameter: "text-blue-400",
  calculation: "text-purple-400",
  result: "text-emerald-400",
};

const typeHoverColors: Record<AiContextInfo["type"], string> = {
  parameter: "hover:text-blue-300",
  calculation: "hover:text-purple-300",
  result: "hover:text-emerald-300",
};

const typeBgColors: Record<AiContextInfo["type"], string> = {
  parameter: "bg-blue-500/10",
  calculation: "bg-purple-500/10",
  result: "bg-emerald-500/10",
};

function NodeTypeIcon({ type }: { type: AiContextInfo["type"] }) {
  if (type === "parameter") {
    return (
      <svg className="inline-block w-2 h-2 fill-current text-blue-400 mr-0.5 align-baseline" viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="5" />
      </svg>
    );
  }
  if (type === "calculation") {
    return (
      <svg className="inline-block w-2 h-2 fill-current text-purple-400 mr-0.5 align-baseline" viewBox="0 0 10 10">
        <polygon points="5,0 10,10 0,10" />
      </svg>
    );
  }
  return (
    <svg className="inline-block w-2 h-2 fill-current text-emerald-400 mr-0.5 align-baseline" viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="5" />
    </svg>
  );
}

function NodeTag({
  node,
  nodeType,
  onClick,
  children,
}: {
  node: any;
  nodeType: AiContextInfo["type"];
  onClick: (n: any) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(node)}
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[0.9em] font-medium transition-colors hover:underline",
        typeBgColors[nodeType],
        typeColors[nodeType],
        typeHoverColors[nodeType],
      )}
    >
      <NodeTypeIcon type={nodeType} />
      {children}
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────

export function RenderContent({
  content,
  nodes,
}: {
  content: string;
  nodes: any[];
  onClosePanel?: () => void;
}) {
  const setSelectedNodeId = useUIStore((s) => s.selectNodeWithoutInspector);
  const requestNodeNavigation = useUIStore((s) => s.requestNodeNavigation);

  const nodeMap = useMemo(() => {
    const map = new Map<string, any>();
    nodes.forEach((n) => {
      const name = n.label || n.slug;
      if (name) map.set(normalizeKey(name), n);
      if (n.slug) map.set(normalizeKey(n.slug), n);
    });
    return map;
  }, [nodes]);

  const handleNodeClick = useCallback(
    (node: any) => {
      setSelectedNodeId(node.id);
      // Use the same scroll + flash as "dépend de" clicks in calculation cards
      requestNodeNavigation(node.id);
    },
    [setSelectedNodeId, requestNodeNavigation],
  );

  /** Try to find a node by text — returns [node, key] or null */
  const resolveNode = useCallback(
    (text: string): [any, string] | null => {
      const key = normalizeKey(text);
      const node = nodeMap.get(key);
      return node ? [node, key] : null;
    },
    [nodeMap],
  );

  const processedContent = useMemo(() => {
    if (!nodeMap.size) return content;

    const resolveNodeKey = (value: string) => {
      const normalized = normalizeKey(value);
      if (nodeMap.has(normalized)) return normalized;
      return null;
    };

    let next = content;

    // Step 1: Handle ALL quote types — ASCII " ", smart "" "", guillemets «»
    next = next.replace(
      /(?:"|[\u201C\u201E\u00AB])\s*([^"\u201D\u00BB\u201C]+?)\s*(?:"|[\u201D\u00BB])/g,
      (match, p1) => {
        const trimmed = p1.trim();
        const key = resolveNodeKey(trimmed);
        if (key) return `[${trimmed}](node:${encodeURIComponent(key)})`;
        return match;
      },
    );

    // Step 2: Clean up existing [label](node:...) links
    next = next.replace(/\[([^\]]+)\]\(node:([^)]+)\)/g, (match, label, target) => {
      const decodedTarget = decodeURIComponent(target);
      const key = resolveNodeKey(decodedTarget) || resolveNodeKey(label);
      if (key) return `[${label}](node:${encodeURIComponent(key)})`;
      return match;
    });

    return next;
  }, [content, nodeMap]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // ── Links: node: protocol OR fallback text-match ──
        a: ({ href, children, ...props }) => {
          // 1. Explicit node: links
          if (href?.startsWith("node:")) {
            const raw = href.replace("node:", "");
            const decoded = decodeURIComponent(raw);
            const node = nodeMap.get(normalizeKey(decoded));
            if (node) {
              return (
                <NodeTag node={node} nodeType={getNodeContextType(node)} onClick={handleNodeClick}>
                  {children}
                </NodeTag>
              );
            }
            // Broken node: link → plain text (prevents navigation)
            return <span className="text-zinc-400">{children}</span>;
          }

          // 2. Any link whose text matches a node name → render as node tag
          const text = extractText(children).trim();
          if (text) {
            const result = resolveNode(text);
            if (result) {
              const [node] = result;
              return (
                <NodeTag node={node} nodeType={getNodeContextType(node)} onClick={handleNodeClick}>
                  {children}
                </NodeTag>
              );
            }
          }

          // 3. Regular external link
          return (
            <a
              href={href}
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          );
        },

        // ── Bold text that matches a node name → clickable tag ──
        strong: ({ children }) => {
          const text = extractText(children).trim();
          if (text) {
            const result = resolveNode(text);
            if (result) {
              const [node] = result;
              return (
                <NodeTag node={node} nodeType={getNodeContextType(node)} onClick={handleNodeClick}>
                  {children}
                </NodeTag>
              );
            }
          }
          return <strong>{children}</strong>;
        },

        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !String(children).includes("\n");
          return (
            <code
              className={cn(
                "font-mono text-sm",
                isInline
                  ? "bg-zinc-800 text-zinc-200 px-1 py-0.5 rounded-md"
                  : "block bg-zinc-900 border border-zinc-800 p-3 rounded-lg whitespace-pre-wrap break-words my-2",
                className,
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
