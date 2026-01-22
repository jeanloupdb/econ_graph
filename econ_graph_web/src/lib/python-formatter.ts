export function formatPythonCode(code: string): string {
  if (!code) return "";

  const lines = code.split('\n');
  
  const formattedLines = lines.map(line => {
    // Only target return statements
    const trimmed = line.trim();
    if (!trimmed.startsWith('return ')) return line;

    // Check if it's a long line that looks like a sum/expression
    if (trimmed.length < 60) return line;

    // Preserve indentation
    const indentMatch = line.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : "";
    
    // Extract expression after return
    const returnKeyword = "return ";
    const returnIndex = line.indexOf(returnKeyword);
    const expression = line.substring(returnIndex + returnKeyword.length);
    
    // If already multiline (ends with \ or open paren), skip
    if (expression.trim().endsWith('\\') || expression.trim().endsWith('(')) return line;

    // Simple parser to find top-level split points (+, -)
    // We counts parens to avoid splitting inside them
    let parts: string[] = [];
    let currentPart = "";
    let depth = 0;
    
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        
        if (char === '(' || char === '[' || char === '{') depth++;
        else if (char === ')' || char === ']' || char === '}') depth--;
        
        // Split on + or - if at top level
        // We look ahead to ensure we don't split scientific notation like 1e-10 or unary operators if possible
        // But for simplicity, we split on " + " or " - " (with spaces) usually found in this generated code
        // Or just +/ -
        
        // The user example had spaces: return ... + ...
        
        if (depth === 0 && (char === '+' || (char === '-' && expression[i-1] === ' '))) {
            // Push current part
            parts.push(currentPart);
            // Start new part with the operator
            currentPart = char;
        } else {
            currentPart += char;
        }
    }
    parts.push(currentPart);
    
    // If we didn't find multiple parts, return original
    if (parts.length <= 1) return line;
    
    // Construct multiline return
    // We wrap in parens to ensure valid python syntax across lines
    const subIndent = indent + "    ";
    
    const formattedParts = parts.map(p => p.trim()).join(`\n${subIndent}`);
    
    return `${indent}return (\n${subIndent}${formattedParts}\n${indent})`;
  });

  return formattedLines.join('\n');
}
