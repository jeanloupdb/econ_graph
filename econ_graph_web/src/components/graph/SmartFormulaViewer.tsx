"use client";

import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import type { Node } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

interface SmartFormulaViewerProps {
  code: string;
  nodes: Node[];
  getNodeValue?: (nodeId: string) => number | null;
  onVariableClick?: (nodeId: string) => void;
  onVariableHover?: (nodeId: string | null) => void;
  getNodeType?: (nodeId: string) => 'parameter' | 'calculation' | 'result' | null;
}

  type Token = 
  | { type: 'variable'; value: string; node?: Node; depth: number }
  | { type: 'function'; value: string; depth: number }
  | { type: 'keyword'; value: string; depth: number }
  | { type: 'operator'; value: string; depth: number }
  | { type: 'number'; value: string; depth: number }
  | { type: 'punctuation'; value: string; depth: number }
  | { type: 'text'; value: string; depth: number }
  | { type: 'newline'; value: string; depth: number }
  | { type: 'whitespace'; value: string; depth: number };

const RAINBOW_COLORS = [
    ['text-amber-500', 'text-amber-600'],   // Level 0: Gold/Amber
    ['text-fuchsia-500', 'text-fuchsia-600'], // Level 1: Pink/Fuchsia
    ['text-cyan-500', 'text-cyan-600'],     // Level 2: Cyan/Blue
    ['text-lime-500', 'text-lime-600'],     // Level 3: Lime/Green
];

const PYTHON_KEYWORDS = ['if', 'else', 'elif', 'return', 'for', 'in', 'while', 'def', 'pass', 'None', 'True', 'False', 'and', 'or', 'not'];

export function SmartFormulaViewer({ code, nodes, getNodeValue, onVariableClick, onVariableHover, getNodeType }: SmartFormulaViewerProps) {
  const { isLightMode } = useGraphTheme();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  // Map slugs to nodes for quick lookup
  const nodesBySlug = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach(n => {
      if (n.slug) map.set(n.slug, n);
    });
    return map;
  }, [nodes]);

  // Parse code into tokens
  const tokens = useMemo(() => {
    if (!code) return [];

    let expression = code;
    // Only strip function signature if it's a simple one-liner or standard block
    // We want to keep the body
    const defIndex = code.indexOf("def compute");
    if (defIndex !== -1) {
        const colonIndex = code.indexOf(":", defIndex);
        if (colonIndex !== -1) {
            expression = code.substring(colonIndex + 1);
        }
    }
    
    // Check if it's a simple return statement (one line or simple expression)
    const isMultiLine = expression.trim().includes('\n');
    const hasControlFlow = PYTHON_KEYWORDS.some(k => expression.includes(k + ' '));

    if (!isMultiLine && !hasControlFlow) {
         const returnIndex = expression.indexOf("return ");
         if (returnIndex !== -1) {
            expression = expression.substring(returnIndex + 7);
         }
    }

    // Preserve leading whitespace for the first line if it wasn't stripped
    // But usually we want to trim the very start to avoid massive indentation
    // Let's just trimEmptyLines from start
    expression = expression.replace(/^\s*\n/g, ''); 

    // Regex matches: 
    // 1. Identifiers (var names, func names)
    // 2. Numbers
    // 3. Operators
    // 4. Punctuation
    // 5. Newlines
    // 6. Whitespace (sequence of spaces)
    const regex = /([a-zA-Z_][a-zA-Z0-9_.]*)|(\d+(\.\d+)?)|(\*\*|[+\-*/%=<>!]+)|([(){}:,\[\]])|(\n)|([ \t]+)/g;
    
    const result: Token[] = [];
    let match;
    let depth = 0;
    
    const mathFunctions = ['min', 'max', 'sum', 'pow', 'sqrt', 'abs', 'round', 'floor', 'ceil', 'math'];

    while ((match = regex.exec(expression)) !== null) {
      const [full, identifier, number, _dec, operator, punctuation, newline, whitespace] = match;
      
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
             result.push({ type: 'keyword', value: identifier, depth: tokenDepth });
        } else {
            // Check for math.xyz or just xyz
            const isFunction = mathFunctions.some(k => identifier === k || identifier.startsWith(k + '.'));
            const node = nodesBySlug.get(identifier);
            
            if (node) {
            result.push({ type: 'variable', value: identifier, node, depth: tokenDepth });
            } else if (isFunction) {
            result.push({ type: 'function', value: identifier, depth: tokenDepth });
            } else {
            result.push({ type: 'text', value: identifier, depth: tokenDepth });
            }
        }
      } else if (number) {
        result.push({ type: 'number', value: number, depth: tokenDepth });
      } else if (operator) {
        result.push({ type: 'operator', value: operator, depth: tokenDepth });
      } else if (punctuation) {
        result.push({ type: 'punctuation', value: punctuation, depth: tokenDepth });
      } else if (newline) {
        result.push({ type: 'newline', value: '\n', depth: tokenDepth });
      } else if (whitespace) {
        result.push({ type: 'whitespace', value: whitespace, depth: tokenDepth });
      }
    }
    
    return result;
  }, [code, nodesBySlug]);

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
  
  const getPunctuationColor = (depth: number) => {
      const colors = RAINBOW_COLORS[depth % RAINBOW_COLORS.length];
      return isLightMode ? colors[1] : colors[0];
  };

  const VariableChip = ({ token }: { token: Token & { type: 'variable' } }) => {
    const node = token.node!;
    const isHovered = hoveredSlug === token.value;
    const nodeType = getNodeType ? getNodeType(node.id) : null;

    let colorClasses = isLightMode 
        ? "text-zinc-600 border-zinc-300 hover:border-zinc-600" 
        : "text-zinc-300 border-zinc-700 hover:border-zinc-400";
        
    if (nodeType === 'parameter') {
        colorClasses = isLightMode 
            ? "text-blue-600 border-blue-200 hover:border-blue-600 bg-blue-50/50" 
            : "text-blue-300 border-blue-800 hover:border-blue-400 bg-blue-500/10";
    } else if (nodeType === 'calculation') {
        colorClasses = isLightMode 
            ? "text-purple-600 border-purple-200 hover:border-purple-600 bg-purple-50/50" 
            : "text-purple-300 border-purple-800 hover:border-purple-400 bg-purple-500/10";
    }

    return (
      <div className="relative inline-block group mx-0.5 align-baseline">
        <button
          onClick={(e) => {
             e.stopPropagation();
             if (onVariableClick) {
                 onVariableClick(node.id);
             }
          }}
          onMouseEnter={() => { setHoveredSlug(token.value); onVariableHover?.(node.id); }}
          onMouseLeave={() => { setHoveredSlug(null); onVariableHover?.(null); }}
          className={cn(
            "inline-flex items-center px-1 rounded transition-all cursor-pointer border-b border-dotted hover:border-solid",
            colorClasses
          )}
        >
          {node.label || token.value}
        </button>
      </div>
    );
  };

  return (
    <div className={cn(
      "font-medium text-sm leading-relaxed font-mono select-text whitespace-pre-wrap",
      isLightMode ? "text-zinc-600" : "text-zinc-400"
    )}>
      {tokens.map((token, index) => {
        if (token.type === 'variable') {
          return <VariableChip key={index} token={token as any} />;
        }
        
        if (token.type === 'function') {
           return (
            <span key={index} className={cn(
                "italic",
                isLightMode ? "text-teal-600" : "text-teal-400"
            )}>
              {token.value}
            </span>
          );
        }

        if (token.type === 'keyword') {
            return (
                <span key={index} className={cn(
                    "font-bold",
                    isLightMode ? "text-pink-600" : "text-pink-500"
                )}>
                {token.value}
                </span>
            );
        }
        
        if (token.type === 'operator') {
          return (
            <span key={index} className={cn(
                "mx-1",
                isLightMode ? "text-zinc-500" : "text-zinc-500"
            )}>
              {renderOperator(token.value)}
            </span>
          );
        }

        if (token.type === 'punctuation') {
            return (
              <span key={index} className={cn(
                  "font-bold transition-colors",
                   getPunctuationColor(token.depth)
              )}>
                {token.value}
              </span>
            );
        }

        if (token.type === 'number') {
          return (
            <span key={index} className={cn(
                "mx-0.5 font-semibold",
                isLightMode ? "text-amber-600" : "text-amber-400"
            )}>
              {token.value}
            </span>
          );
        }

        if (token.type === 'newline') {
            return <span key={index}>{'\n'}</span>;
        }

        if (token.type === 'whitespace') {
            return <span key={index}>{token.value}</span>;
        }

        return <span key={index}>{token.value}</span>;
      })}
    </div>
  );
}
