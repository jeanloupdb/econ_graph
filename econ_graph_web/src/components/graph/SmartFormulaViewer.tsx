"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

interface SmartFormulaViewerProps {
  code: string;
  nodes: Node[];
  displayMode?: "labels" | "values";
  allowExpand?: boolean;
  getNodeValue?: (nodeId: string) => number | null;
  onVariableClick?: (nodeId: string) => void;
  onVariableHover?: (nodeId: string | null) => void;
  getNodeType?: (nodeId: string) => 'parameter' | 'calculation' | 'result' | null;
  className?: string;
  controlledExpandedKeys?: Set<string>;
  onExpandedChange?: (keys: Set<string>) => void;
}

type Token =
  | { type: 'variable'; value: string; node?: Node; depth: number; id: string; matchId?: string }
  | { type: 'function'; value: string; depth: number; id: string; matchId?: string }
  | { type: 'keyword'; value: string; depth: number; id: string; matchId?: string }
  | { type: 'operator'; value: string; depth: number; id: string; matchId?: string }
  | { type: 'number'; value: string; depth: number; id: string; matchId?: string }
  | { type: 'punctuation'; value: string; depth: number; id: string; matchId?: string }
  | { type: 'text'; value: string; depth: number; id: string; matchId?: string }
  | { type: 'newline'; value: string; depth: number; id: string; matchId?: string }
  | { type: 'whitespace'; value: string; depth: number; id: string; matchId?: string };

const PUNCTUATION_COLORS_DARK = ['text-zinc-500', 'text-zinc-400', 'text-zinc-500', 'text-zinc-400'];
const PUNCTUATION_COLORS_LIGHT = ['text-zinc-600', 'text-zinc-500', 'text-zinc-600', 'text-zinc-500'];

const PYTHON_KEYWORDS = ['if', 'else', 'elif', 'return', 'for', 'in', 'while', 'def', 'pass', 'None', 'True', 'False', 'and', 'or', 'not'];

const KEYWORD_FR: Record<string, string> = {
  if: 'si', else: 'sinon', elif: 'sinon si',
  and: 'et', or: 'ou', not: 'non',
  True: 'Vrai', False: 'Faux', None: 'Vide',
};

const extractExpressionFromCode = (code: string) => {
  if (!code) return "";
  let expression = code;

  // 1. Strip def header
  const defIndex = code.indexOf("def compute");
  if (defIndex !== -1) {
    const colonIndex = code.indexOf(":", defIndex);
    if (colonIndex !== -1) {
      expression = code.substring(colonIndex + 1);
    }
  }

  expression = expression.trim();

  // 2. Strip return
  if (expression.startsWith("return")) {
    expression = expression.substring(6).trim();
  }

  // 3. Strip outer parentheses only if they enclose the ENTIRE expression
  if (expression.startsWith("(") && expression.endsWith(")")) {
    let depth = 0;
    let isWrapped = true;
    for (let i = 0; i < expression.length; i++) {
        if (expression[i] === '(') depth++;
        else if (expression[i] === ')') depth--;
        
        // If depth hits 0 before the end, it means the first ( is closed early
        // e.g. "(A) + (B)" -> fails here
        if (depth === 0 && i < expression.length - 1) {
            isWrapped = false;
            break;
        }
    }
    
    if (isWrapped && depth === 0) {
        expression = expression.substring(1, expression.length - 1);
    }
  }

  // 4. Dedent
  const lines = expression.split('\n');
  const nonBlankLines = lines.filter(l => l.trim().length > 0);
  if (nonBlankLines.length > 0) {
    const minIndent = Math.min(...nonBlankLines.map(line => {
      const m = line.match(/^([ \t]*)/);
      return m ? m[1].length : 0;
    }));

    if (minIndent > 0) {
      expression = lines.map(l => l.length >= minIndent ? l.substring(minIndent) : l).join('\n');
    }
  }

  return expression.trim();
};

const tokenizeExpression = (expression: string, nodesBySlug: Map<string, Node>) => {
  if (!expression) return [];
  const regex = /([a-zA-Z_][a-zA-Z0-9_.]*)|(\d+(\.\d+)?)|(\*\*|[+\-*/%=<>!]+)|([(){}:,\[\]])|(\n)|([ \t]+)/g;

  const result: Token[] = [];
  const stack: { index: number; char: string }[] = [];
  let match;
  let depth = 0;
  const mathFunctions = ['min', 'max', 'sum', 'pow', 'sqrt', 'abs', 'round', 'floor', 'ceil', 'math'];

  while ((match = regex.exec(expression)) !== null) {
    const [full, identifier, number, _dec, operator, punctuation, newline, whitespace] = match;
    const id = Math.random().toString(36).substr(2, 9); // Simple unique ID
    let currentToken: Token | null = null;
    
    let tokenDepth = depth;
    if (punctuation) {
      if (['(', '{', '['].includes(punctuation)) {
        tokenDepth = depth;
        depth++;
      } else if ([')', '}', ']'].includes(punctuation)) {
        depth--;
        tokenDepth = depth;
        if (depth < 0) depth = 0;
      }
    }

    if (identifier) {
      if (PYTHON_KEYWORDS.includes(identifier)) {
        if (identifier !== "return") {
            currentToken = { type: 'keyword', value: identifier, depth: tokenDepth, id };
        }
      } else {
        const isFunction = mathFunctions.some((k) => identifier === k || identifier.startsWith(k + '.'));
        const node = nodesBySlug.get(identifier);

        if (node) {
            currentToken = { type: 'variable', value: identifier, node, depth: tokenDepth, id };
        } else if (isFunction) {
            currentToken = { type: 'function', value: identifier, depth: tokenDepth, id };
        } else {
            currentToken = { type: 'text', value: identifier, depth: tokenDepth, id };
        }
      }
    } else if (number) {
        currentToken = { type: 'number', value: number, depth: tokenDepth, id };
    } else if (operator) {
        currentToken = { type: 'operator', value: operator, depth: tokenDepth, id };
    } else if (punctuation) {
        currentToken = { type: 'punctuation', value: punctuation, depth: tokenDepth, id };
        // Pairing logic
        if (['(', '{', '['].includes(punctuation)) {
            stack.push({ index: result.length, char: punctuation });
        } else if ([')', '}', ']'].includes(punctuation)) {
             if (stack.length > 0) {
                 const last = stack.pop();
                 if (last) {
                    // Link matching pair
                    result[last.index].matchId = id;
                    if (currentToken) currentToken.matchId = result[last.index].id;
                 }
             }
        }
    } else if (newline) {
        currentToken = { type: 'newline', value: '\n', depth: tokenDepth, id };
    } else if (whitespace) {
        currentToken = { type: 'whitespace', value: whitespace, depth: tokenDepth, id };
    }

    if (currentToken) {
        result.push(currentToken);
    }
  }

  return result;
};

const renderOperator = (op: string) => {
  switch(op) {
    case '*': return '×';
    case '/': return '÷';
    case '**': return '^';
    case 'math.sqrt': return '√';
    case '==': return '=';
    case '!=': return '≠';
    case '>=': return '≥';
    case '<=': return '≤';
    default: return op;
  }
};

// Extracted VariableChip component with stable identity
interface VariableChipProps {
  token: Token & { type: 'variable' };
  visited: Set<string>;
  nesting: number;
  instanceKey: string;
  parentKey?: string;
  isLightMode: boolean;
  allowExpand: boolean;
  displayMode: "labels" | "values";
  expandedKeys: Set<string>;
  hoveredExpandedKey: string | null;
  getNodeType?: (nodeId: string) => 'parameter' | 'calculation' | 'result' | null;
  getNodeValue?: (nodeId: string) => number | null;
  onVariableClick?: (nodeId: string) => void;
  onVariableHover?: (nodeId: string | null) => void;
  expandVariable: (key: string) => void;
  setHoveredExpandedKey: (key: string | null) => void;
  tokensBySlug: Map<string, Token[]>;
  renderTokens: (
    tokenList: Token[],
    nesting: number,
    visited: Set<string>,
    parentKey?: string,
    pathPrefix?: string
  ) => React.ReactNode[];
}

function VariableChip({
  token,
  visited,
  nesting,
  instanceKey,
  parentKey,
  isLightMode,
  allowExpand,
  displayMode,
  expandedKeys,
  hoveredExpandedKey,
  getNodeType,
  getNodeValue,
  onVariableClick,
  onVariableHover,
  expandVariable,
  setHoveredExpandedKey,
  tokensBySlug,
  renderTokens,
}: VariableChipProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const node = token.node!;
  const nodeType = getNodeType ? getNodeType(node.id) : null;
  const isExpanded = allowExpand && expandedKeys.has(instanceKey);
  const isExpandable =
    allowExpand &&
    nodeType !== 'parameter' &&
    !!node.computation_definition &&
    !visited.has(token.value);
  const isInteractive = nodeType !== 'parameter' && (isExpandable || !!onVariableClick);
  const value = getNodeValue ? getNodeValue(node.id) : null;
  const showValue = displayMode === "values" && value !== null && value !== undefined;
  const displayText = showValue ? formatNumber(value) : (node.label || token.value);
  const hasInlineFormula = isExpandable;

  let textClasses = isLightMode ? "text-zinc-700" : "text-zinc-300";
  let hoverTextClasses = isLightMode ? "hover:text-zinc-900" : "hover:text-zinc-100";

  if (nodeType === 'parameter') {
    textClasses = isLightMode ? "text-sky-700" : "text-sky-300";
    hoverTextClasses = "";
  } else if (nodeType === 'calculation') {
    textClasses = isLightMode ? "text-emerald-700" : "text-violet-300";
    hoverTextClasses = isLightMode ? "hover:text-emerald-900" : "hover:text-violet-200";
  }

  const decorationClasses = isLightMode
    ? "decoration-zinc-400/40 hover:decoration-zinc-600/60"
    : "decoration-zinc-500/40 hover:decoration-zinc-300/60";

  const handleClick = (e: React.MouseEvent) => {
    if (!isInteractive) return;
    e.stopPropagation();
    if (isExpandable) {
      if (!isExpanded) {
        expandVariable(instanceKey);
      }
      return;
    }
    if (onVariableClick) {
      onVariableClick(node.id);
    }
  };

  // When not expandable or not interactive, render simple span
  if (!isInteractive) {
    const content = (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-0.5 py-0.5 rounded-sm",
          showValue && "font-mono tabular-nums",
          "cursor-default",
          textClasses
        )}
      >
        {displayText}
      </span>
    );

    if (displayMode === 'values') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
              <p>{node.label || token.value}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  }

  return (
    <span
      className={cn(
        "relative align-baseline",
        isExpanded && hasInlineFormula ? "block my-2" : "inline"
      )}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
        onMouseEnter={() => {
          onVariableHover?.(node.id);
          if (isExpanded && hasInlineFormula) {
            setHoveredExpandedKey(instanceKey);
          }
        }}
        onMouseLeave={() => {
          onVariableHover?.(null);
          if (isExpanded && hasInlineFormula) {
            setHoveredExpandedKey(parentKey ?? null);
          }
        }}
        className={cn(
          "relative inline-block align-top transition-all duration-300",
           // Offset only when expanded
           isExpanded && hasInlineFormula && "ml-3"
        )}
      >
        {/* Floating label - Now outside overflow-hidden */}
        <AnimatePresence>
          {hoveredExpandedKey === instanceKey && isExpanded && hasInlineFormula && (
            <motion.span
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: -4, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "pointer-events-none absolute -top-5 right-0 z-20 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide whitespace-nowrap shadow-sm border",
                isLightMode
                  ? "bg-white text-zinc-600 border-zinc-200"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
              )}
            >
              {node.label || token.value}
            </motion.span>
          )}
        </AnimatePresence>

        <motion.span
          layout
          className={cn(
            "relative rounded-md overflow-hidden inline-block align-middle text-left align-sub",
            showValue && "font-mono tabular-nums",
            // Styling
            !isExpanded && "cursor-pointer underline decoration-dotted underline-offset-4",
            !isExpanded && decorationClasses,
            !isExpanded && textClasses,
            // Disable hover effects during animation
            !isExpanded && !isAnimating && hoverTextClasses,
            !isExpanded && isExpandable && !isAnimating && (isLightMode ? "hover:bg-zinc-200/40" : "hover:bg-white/10"),
            isExpanded && hasInlineFormula && (isLightMode ? "bg-zinc-100/70" : "bg-white/5"),
            isExpanded && (isLightMode ? "text-zinc-700" : "text-zinc-300"),
            isExpanded && hoveredExpandedKey === instanceKey && (isLightMode ? "bg-zinc-200/50" : "bg-white/10"),
            isAnimating && "pointer-events-none"
          )}
          onLayoutAnimationStart={() => setIsAnimating(true)}
          onLayoutAnimationComplete={() => setIsAnimating(false)}
          style={{
            padding: isExpanded && hasInlineFormula ? "8px 12px" : "2px 2px",
          }}
          transition={{
            layout: { duration: 0.3, ease: "easeInOut" }, // Smooth resize
            padding: { duration: 0.3, ease: "easeInOut" } // Match layout
          }}
          data-expanded-block={isExpanded ? instanceKey : undefined}
          title={node.label || token.value}
        >
          {isExpanded && hasInlineFormula ? (
            <motion.span
                layout="position" // Keep position stable during resize
                className="block min-w-[50px]"
            >
              {renderTokens(
                tokensBySlug.get(token.value) || [],
                nesting + 1,
                new Set([...visited, token.value]),
                instanceKey,
                instanceKey
              )}
            </motion.span>
          ) : (
             displayMode === 'values' ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block whitespace-nowrap">{displayText}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>{node.label || token.value}</p>
                  </TooltipContent>
                </Tooltip>
             ) : (
                <span className="block whitespace-nowrap">{displayText}</span>
             )
          )}
        </motion.span>
      </span>
    </span>
  );
}

export function SmartFormulaViewer({
  code,
  nodes,
  displayMode = "labels",
  allowExpand = true,
  getNodeValue,
  onVariableClick,
  onVariableHover,
  getNodeType,
  className,
  controlledExpandedKeys,
  onExpandedChange
}: SmartFormulaViewerProps) {
  const { isLightMode } = useGraphTheme();
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<string>>(new Set());
  const expandedKeys = controlledExpandedKeys ?? internalExpandedKeys;
  
  const [hoveredExpandedKey, setHoveredExpandedKey] = useState<string | null>(null);
  const [activePunctuationId, setActivePunctuationId] = useState<string | null>(null);

  // Reset hover states when collapsed
  useMemo(() => {
     if (expandedKeys.size === 0) {
        setHoveredExpandedKey(null);
        setActivePunctuationId(null);
     }
  }, [expandedKeys]);

  // Map slugs to nodes for quick lookup
  const nodesBySlug = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach(n => {
      if (n.slug) map.set(n.slug, n);
    });
    return map;
  }, [nodes]);

  const expression = useMemo(() => extractExpressionFromCode(code), [code]);
  const tokens = useMemo(() => tokenizeExpression(expression, nodesBySlug), [expression, nodesBySlug]);
  const tokensBySlug = useMemo(() => {
    const map = new Map<string, Token[]>();
    nodes.forEach((node) => {
      if (!node.slug || !node.computation_definition) return;
      const expr = extractExpressionFromCode(node.computation_definition);
      map.set(node.slug, tokenizeExpression(expr, nodesBySlug));
    });
    return map;
  }, [nodes, nodesBySlug]);

  // Detect top-level ternary: x if condition else y
  const ternaryPattern = useMemo(() => {
    const ifIdx = tokens.findIndex(t => t.type === 'keyword' && t.value === 'if' && t.depth === 0);
    if (ifIdx === -1) return null;
    const elseIdx = tokens.findIndex((t, i) => i > ifIdx && t.type === 'keyword' && t.value === 'else' && t.depth === 0);
    if (elseIdx === -1) return null;

    const trim = (tks: Token[]) => {
      let s = 0, e = tks.length - 1;
      while (s <= e && tks[s].type === 'whitespace') s++;
      while (e >= s && tks[e].type === 'whitespace') e--;
      return tks.slice(s, e + 1);
    };

    return {
      trueTokens: trim(tokens.slice(0, ifIdx)),
      conditionTokens: trim(tokens.slice(ifIdx + 1, elseIdx)),
      falseTokens: trim(tokens.slice(elseIdx + 1)),
    };
  }, [tokens]);

  const expandVariable = (key: string) => {
     const next = new Set(expandedKeys);
     next.add(key);
     
     if (onExpandedChange) {
        onExpandedChange(next);
     } else {
        setInternalExpandedKeys(next);
     }
     setHoveredExpandedKey((prev) => prev === key ? null : prev);
  };

  const collapseAll = () => {
     if (onExpandedChange) {
        onExpandedChange(new Set());
     } else {
        setInternalExpandedKeys(new Set());
     }
    setHoveredExpandedKey(null);
    setActivePunctuationId(null);
  };

  const getPunctuationColor = (depth: number) => {
    const colors = isLightMode ? PUNCTUATION_COLORS_LIGHT : PUNCTUATION_COLORS_DARK;
    return colors[depth % colors.length];
  };

  const renderTokens = (
    tokenList: Token[],
    nesting: number,
    visited: Set<string>,
    parentKey?: string,
    pathPrefix = "root"
  ): React.ReactNode[] => {
    return tokenList.map((token, index) => {
      const tokenKey = `${pathPrefix}-${index}`;
      if (token.type === 'variable') {
        return (
          <VariableChip
            key={tokenKey}
            token={token as Token & { type: 'variable' }}
            visited={visited}
            nesting={nesting}
            instanceKey={tokenKey}
            parentKey={parentKey}
            isLightMode={isLightMode}
            allowExpand={allowExpand}
            displayMode={displayMode}
            expandedKeys={expandedKeys}
            hoveredExpandedKey={hoveredExpandedKey}
            getNodeType={getNodeType}
            getNodeValue={getNodeValue}
            onVariableClick={onVariableClick}
            onVariableHover={onVariableHover}
            expandVariable={expandVariable}
            setHoveredExpandedKey={setHoveredExpandedKey}
            tokensBySlug={tokensBySlug}
            renderTokens={renderTokens}
          />
        );
      }

      if (token.type === 'function') {
        const functionName = token.value.startsWith("math.") ? token.value.replace("math.", "") : token.value;
        const displayValue = functionName === "sqrt" ? "√" : functionName;
        return (
          <span key={`${nesting}-${index}`} className={cn(
            "italic",
            isLightMode ? "text-teal-600" : "text-teal-400"
          )}>
            {displayValue}
          </span>
        );
      }

      if (token.type === 'keyword') {
        const display = KEYWORD_FR[token.value] ?? token.value;
        const isStructural = ['if', 'else', 'elif'].includes(token.value);
        const isLogical = ['and', 'or', 'not'].includes(token.value);
        return (
          <span key={`${nesting}-${index}`} className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide mx-0.5",
            isStructural && (isLightMode ? "bg-violet-100 text-violet-700" : "bg-orange-500/10 text-orange-400"),
            isLogical && (isLightMode ? "bg-sky-100 text-sky-600" : "bg-sky-500/10 text-sky-400"),
            !isStructural && !isLogical && (isLightMode ? "text-zinc-500" : "text-zinc-400"),
          )}>
            {display}
          </span>
        );
      }

      if (token.type === 'operator') {
        return (
          <span key={`${nesting}-${index}`} className={cn(
            "mx-1",
            isLightMode ? "text-zinc-500" : "text-zinc-500"
          )}>
            {renderOperator(token.value)}
          </span>
        );
      }

      if (token.type === 'punctuation') {
        const isMatched = activePunctuationId && (token.id === activePunctuationId || token.matchId === activePunctuationId);
        return (
          <span 
            key={`${nesting}-${index}`}
            onMouseEnter={() => token.matchId && setActivePunctuationId(token.id)}
            onMouseLeave={() => token.matchId && setActivePunctuationId(null)} 
            className={cn(
            "font-semibold transition-all duration-200 rounded-sm px-0.5",
            getPunctuationColor(token.depth),
            isMatched && (isLightMode ? "bg-zinc-200 text-zinc-900 scale-110" : "bg-zinc-700 text-zinc-100 scale-110") 
          )}>
            {token.value}
          </span>
        );
      }

      if (token.type === 'number') {
        return (
          <span key={`${nesting}-${index}`} className={cn(
            "mx-0.5 font-semibold tabular-nums",
            isLightMode ? "text-blue-700" : "text-amber-400"
          )}>
            {token.value}
          </span>
        );
      }

      if (token.type === 'newline') {
        return <span key={`${nesting}-${index}`}>{'\n'}</span>;
      }

      if (token.type === 'whitespace') {
        return <span key={`${nesting}-${index}`}>{token.value}</span>;
      }

      return <span key={`${nesting}-${index}`}>{token.value}</span>;
    });
  };

  const baseClass = cn(
    "text-[15px] leading-relaxed font-sans select-text w-full cursor-text",
    isLightMode ? "text-zinc-700" : "text-zinc-300",
    className
  );

  return (
    <TooltipProvider>
      <div onClick={collapseAll} className={baseClass}>
        {ternaryPattern ? (
          <div className="space-y-2.5">
            {/* Condition row */}
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-wider shrink-0 w-10",
                isLightMode ? "text-violet-700" : "text-orange-400"
              )}>si</span>
              <span className="flex-1 flex flex-wrap items-baseline gap-x-0.5">
                {renderTokens(ternaryPattern.conditionTokens, 0, new Set())}
              </span>
            </div>
            {/* True branch */}
            <div className="flex items-baseline gap-2 pl-3 border-l-2 border-emerald-500/30">
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-wider shrink-0 w-10",
                isLightMode ? "text-emerald-600" : "text-emerald-400"
              )}>alors</span>
              <span className="flex-1 flex flex-wrap items-baseline gap-x-0.5">
                {renderTokens(ternaryPattern.trueTokens, 0, new Set())}
              </span>
            </div>
            {/* False branch */}
            <div className="flex items-baseline gap-2 pl-3 border-l-2 border-zinc-700/40">
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-wider shrink-0 w-10",
                isLightMode ? "text-zinc-500" : "text-zinc-500"
              )}>sinon</span>
              <span className="flex-1 flex flex-wrap items-baseline gap-x-0.5">
                {renderTokens(ternaryPattern.falseTokens, 0, new Set())}
              </span>
            </div>
          </div>
        ) : (
          <span className="whitespace-pre-wrap min-h-full block">
            {renderTokens(tokens, 0, new Set())}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
