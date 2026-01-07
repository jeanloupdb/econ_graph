# 🎨 Smart Graph - GUIDE VISUEL D'IMPLÉMENTATION

## 🎯 OBJECTIF

Ce document fournit des **exemples de code prêts à l'emploi** pour implémenter l'identité visuelle "AI-First" d'Smart Graph.

---

## 🎨 1. TOPBAR REDESIGN

### **Avant (Actuel)**

```tsx
// Problème : Border simple, pas assez de glassmorphism
<div className="fixed top-2 left-2 right-2 h-14 flex items-center justify-between rounded-2xl border px-4 z-50">
```

### **Après (Nouveau)**

```tsx
<div
  className="
  fixed top-2 left-2 right-2 h-14 z-50
  flex items-center justify-between
  px-4 rounded-2xl
  
  /* Glassmorphism signature */
  bg-white/60 dark:bg-black/40 
  backdrop-blur-xl 
  border border-white/20 dark:border-white/10
  
  /* Subtle shadow */
  shadow-lg shadow-zinc-900/5 dark:shadow-zinc-900/20
  
  /* Smooth transitions */
  transition-all duration-500
"
>
  {/* Left Section */}
  <div className="flex items-center gap-3">
    {/* Back Button */}
    <button
      className="
      group flex items-center justify-center 
      w-10 h-10 rounded-xl 
      transition-all duration-300 
      hover:scale-105 active:scale-95
      
      border border-white/10 
      bg-black/20 hover:bg-black/40 
      backdrop-blur-md shadow-sm
      
      text-zinc-500 dark:text-zinc-400
    "
    >
      <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
    </button>

    {/* Mode Switcher */}
    <div
      className="
      flex items-center h-10 gap-1 p-1 
      rounded-xl border border-white/10 
      bg-black/20 backdrop-blur-md shadow-inner
    "
    >
      {/* Baseline */}
      <button
        className={cn(
          "h-full px-4 text-xs font-bold rounded-lg transition-all duration-300",
          mode === "baseline"
            ? "bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
            : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
        )}
      >
        Baseline
      </button>

      {/* Scénarios */}
      <button
        className={cn(
          "h-full px-4 text-xs font-bold rounded-lg transition-all duration-300",
          mode === "scenario"
            ? "bg-gradient-to-b from-blue-500 to-blue-600 text-white border border-blue-400/30 shadow-lg shadow-blue-500/20"
            : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
        )}
      >
        Scénarios
      </button>

      {/* Comparaison */}
      <button
        className={cn(
          "h-full px-4 text-xs font-bold rounded-lg transition-all duration-300",
          mode === "comparison"
            ? "bg-gradient-to-b from-orange-500 to-orange-600 text-white border border-orange-400/30 shadow-lg shadow-orange-500/20"
            : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
        )}
      >
        Comparaison
      </button>
    </div>

    {/* Project Title */}
    <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
      {currentProject?.name || "Smart Graph"}
    </h1>
  </div>

  {/* Right Section */}
  <div className="flex items-center gap-2">
    {/* View/Edit Toggle */}
    <div
      className="
      flex items-center h-10 gap-1 p-1 
      rounded-xl border border-white/10 
      bg-black/20 backdrop-blur-md shadow-inner
    "
    >
      <button
        className={cn(
          "h-full flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg transition-all duration-300",
          !developerMode
            ? "bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
            : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
        )}
      >
        <Eye className="h-3.5 w-3.5" />
        <span>View</span>
      </button>

      <button
        className={cn(
          "h-full flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg transition-all duration-300",
          developerMode
            ? "bg-gradient-to-b from-violet-500 to-violet-600 text-white border border-violet-400/30 shadow-lg shadow-violet-500/20"
            : "text-zinc-500 hover:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/5"
        )}
      >
        <Code2 className="h-3.5 w-3.5" />
        <span>Edit</span>
      </button>
    </div>

    <UserMenu />
  </div>
</div>
```

### **Résultat Visuel**

```
┌─────────────────────────────────────────────────────────────┐
│ [←] [Baseline][Scénarios][Comparaison]  Project   [View][Edit][👤] │
│      ↑ Glassmorphism + Border glow              ↑ Purple when active
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 2. GRAPHAIBAR REDESIGN

### **Avant (Actuel)**

```tsx
// Trop discret, pas assez "AI Identity"
<div className="fixed bottom-4 left-1/2 -translate-x-1/2">
  <input placeholder="Ask AI..." />
</div>
```

### **Après (Nouveau)**

```tsx
<motion.div
  initial={{ y: 100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="
    fixed bottom-6 left-1/2 -translate-x-1/2 
    w-full max-w-[700px] z-50
    px-4
  "
>
  <div
    className={cn(
      /* Container */
      "relative rounded-2xl overflow-hidden",
      "transition-all duration-300",

      /* Glassmorphism */
      "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl",
      "border border-purple-200/50 dark:border-purple-800/50",

      /* Shadows */
      "shadow-2xl shadow-purple-500/10",

      /* AI Glow (when focused) */
      isFocused && "ring-2 ring-purple-400/50 shadow-purple-500/30",

      /* Processing state */
      isProcessing && "animate-pulse-glow"
    )}
  >
    {/* Animated Border (AI Identity) */}
    {isFocused && (
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div
          className="
          absolute inset-0 
          bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
          opacity-20
          animate-gradient-x
        "
        />
      </div>
    )}

    {/* Content */}
    <div className="relative flex items-center gap-3 p-3">
      {/* AI Icon */}
      <div
        className={cn(
          "flex-shrink-0 p-2 rounded-lg",
          "bg-gradient-to-br from-purple-100 to-blue-100",
          "dark:from-purple-900/50 dark:to-blue-900/50",
          isProcessing && "animate-pulse"
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-spin" />
        ) : (
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        )}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Ask AI anything... (Cmd+K)"
        className="
          flex-1 bg-transparent 
          text-sm text-zinc-900 dark:text-zinc-100
          placeholder:text-zinc-400 dark:placeholder:text-zinc-500
          outline-none
        "
        onKeyDown={(e) => {
          if (e.key === "Enter" && prompt.trim()) {
            handleGenerate();
          }
        }}
      />

      {/* File Upload (optional) */}
      {allowFileUpload && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="
            p-2 rounded-lg 
            hover:bg-zinc-100 dark:hover:bg-zinc-800
            transition-colors
          "
        >
          <Paperclip className="h-4 w-4 text-zinc-500" />
        </button>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isProcessing}
        className={cn(
          "px-4 py-2 rounded-lg font-medium text-sm",
          "transition-all duration-200",

          /* Gradient AI Button */
          "bg-gradient-to-r from-purple-500 to-blue-500",
          "hover:from-purple-600 hover:to-blue-600",
          "text-white",
          "shadow-lg shadow-purple-500/30",

          /* States */
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "hover:scale-105 active:scale-95",

          /* Icon */
          "flex items-center gap-2"
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate
          </>
        )}
      </button>
    </div>

    {/* Suggestions (when empty) */}
    {!prompt && !isProcessing && (
      <div className="px-3 pb-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => setPrompt(suggestion)}
            className="
              px-3 py-1 rounded-full text-xs
              bg-zinc-100 dark:bg-zinc-800
              hover:bg-zinc-200 dark:hover:bg-zinc-700
              text-zinc-600 dark:text-zinc-400
              transition-colors
            "
          >
            {suggestion}
          </button>
        ))}
      </div>
    )}
  </div>
</motion.div>
```

### **Suggestions Examples**

```tsx
const suggestions = [
  "Ajoute une TVA à 20%",
  "Crée un scénario pessimiste",
  "Explique ce calcul",
  "Optimise les formules",
];
```

### **Résultat Visuel**

```
┌────────────────────────────────────────────────────────┐
│ [✨] Ask AI anything... (Cmd+K)            [Generate]  │
│      ↑ Purple glow                        ↑ Gradient btn
│ [Ajoute TVA][Crée scénario][Explique]                 │
│  ↑ Quick suggestions                                    │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 3. SMARTFIX DIALOG REDESIGN

### **Avant**

```tsx
<Dialog>
  <DialogContent>
    <DialogTitle>Smart Fix</DialogTitle>
    {/* Simple layout */}
  </DialogContent>
</Dialog>
```

### **Après (Nouveau)**

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
    {/* Header avec AI Branding */}
    <DialogHeader className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
      <div className="flex items-start gap-3">
        {/* AI Badge */}
        <div
          className="
          p-3 rounded-xl 
          bg-gradient-to-br from-purple-100 to-blue-100
          dark:from-purple-900/30 dark:to-blue-900/30
          ring-1 ring-purple-200 dark:ring-purple-800
          shadow-lg shadow-purple-500/20
        "
        >
          <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>

        <div className="flex-1">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            AI Smart Fix
            <Badge variant="secondary" className="text-xs">
              Powered by Gemini
            </Badge>
          </DialogTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Automatic error detection and intelligent correction
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="
            p-2 rounded-lg 
            hover:bg-zinc-100 dark:hover:bg-zinc-800
            transition-colors
          "
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </DialogHeader>

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto space-y-4 py-4">
      {/* Current Error Display */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          Current Error
        </h3>

        <div
          className="
          relative rounded-lg overflow-hidden
          bg-red-50 dark:bg-red-950/30 
          border border-red-200 dark:border-red-800
        "
        >
          {/* Error Banner */}
          <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
            <p className="text-xs font-medium text-red-700 dark:text-red-300">
              ZeroDivisionError
            </p>
          </div>

          {/* Error Code */}
          <div className="p-4">
            <pre className="text-xs text-red-600 dark:text-red-400 font-mono overflow-x-auto">
              {errorTrace}
            </pre>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
            <p className="text-sm text-zinc-500">
              AI is analyzing your code...
            </p>
          </div>
        </div>
      )}

      {/* AI Fix Display */}
      {fixData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Explanation Card */}
          <div
            className="
            rounded-lg p-4
            bg-green-50 dark:bg-green-950/30 
            border border-green-200 dark:border-green-800
          "
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h4 className="font-medium text-sm text-green-900 dark:text-green-100">
                  AI Recommendation
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                  {fixData.explanation}
                </p>

                {/* Confidence Score */}
                {fixData.confidence_score && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Confidence:
                    </span>
                    <div className="flex-1 h-2 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 dark:bg-green-400 transition-all duration-500"
                        style={{ width: `${fixData.confidence_score * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      {Math.round(fixData.confidence_score * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Corrected Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-green-500" />
                Corrected Code
              </h3>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(fixData.corrected_code);
                  toast.success("Code copied to clipboard");
                }}
                className="
                  px-2 py-1 rounded text-xs
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  text-zinc-500 hover:text-zinc-700
                  dark:text-zinc-400 dark:hover:text-zinc-200
                  transition-colors
                  flex items-center gap-1
                "
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>

            <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <CodeEditor
                value={fixData.corrected_code}
                readOnly
                height="200px"
                language="python"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Upstream Errors Warning */}
      {hasUpstreamErrors && (
        <div
          className="
          rounded-lg p-4
          bg-yellow-50 dark:bg-yellow-950/30 
          border border-yellow-200 dark:border-yellow-800
        "
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-sm text-yellow-900 dark:text-yellow-100 mb-2">
                Upstream Errors Detected
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                This node depends on {errorInputNodes.length} node(s) with
                errors. Fix them first for best results.
              </p>

              <div className="space-y-1">
                {errorInputNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => onNavigate?.(node.id)}
                    className="
                      w-full flex items-center justify-between
                      px-3 py-2 rounded-lg
                      bg-yellow-100 dark:bg-yellow-900/30
                      hover:bg-yellow-200 dark:hover:bg-yellow-900/50
                      transition-colors
                      text-left
                    "
                  >
                    <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      {node.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Footer Actions */}
    <DialogFooter className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
      <Button variant="outline" onClick={onClose} disabled={loading}>
        Cancel
      </Button>

      {!fixData && !loading && (
        <Button
          onClick={handleGenerateFix}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Fix
        </Button>
      )}

      {fixData && (
        <Button
          onClick={handleApply}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Apply Fix
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎯 4. NODE STYLES (CANVAS)

### **Parameter Node (Orange)**

```tsx
<motion.div
  layoutId={`node-${id}`}
  className={cn(
    /* Base */
    "relative min-w-[180px] rounded-xl border-2",
    "transition-all duration-200",

    /* Gradient Background */
    "bg-gradient-to-br from-orange-50 to-amber-50",
    "dark:from-orange-950/30 dark:to-amber-950/30",

    /* Border */
    "border-orange-300 dark:border-orange-700",

    /* Shadow */
    "shadow-md hover:shadow-lg",

    /* States */
    isSelected && "ring-2 ring-orange-400 shadow-orange-500/20",
    hasError &&
      "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30",

    /* Hover */
    "hover:scale-105 hover:-translate-y-1"
  )}
>
  {/* AI Generated Badge */}
  <AnimatePresence>
    {isAiGenerated && (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        className="
          absolute -top-2 -right-2 
          px-2 py-0.5 rounded-full
          bg-gradient-to-r from-purple-500 to-blue-500
          text-white text-xs font-medium
          shadow-lg shadow-purple-500/50
          flex items-center gap-1
          z-10
        "
      >
        <Sparkles className="h-3 w-3" />
        AI
      </motion.div>
    )}
  </AnimatePresence>

  {/* Content */}
  <div className="p-3 space-y-2">
    {/* Header */}
    <div className="flex items-center gap-2">
      <Settings className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <h3 className="font-medium text-sm text-orange-900 dark:text-orange-100 truncate">
        {label}
      </h3>

      {/* Unit Badge */}
      {unit && (
        <Badge variant="secondary" className="text-xs ml-auto">
          {unit}
        </Badge>
      )}
    </div>

    {/* Value Display */}
    <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
      {formatValue(value)}
    </div>

    {/* Description */}
    {description && (
      <p className="text-xs text-orange-700 dark:text-orange-300 line-clamp-2">
        {description}
      </p>
    )}
  </div>

  {/* Handles (React Flow) */}
  <Handle type="source" position="bottom" className="!bg-orange-500" />
</motion.div>
```

### **Computed Node (Blue)**

```tsx
<motion.div
  layoutId={`node-${id}`}
  className={cn(
    "relative min-w-[180px] rounded-xl border-2",
    "transition-all duration-200",

    /* Blue Gradient */
    "bg-gradient-to-br from-blue-50 to-indigo-50",
    "dark:from-blue-950/30 dark:to-indigo-950/30",
    "border-blue-300 dark:border-blue-700",

    "shadow-md hover:shadow-lg",
    isSelected && "ring-2 ring-blue-400 shadow-blue-500/20",
    hasError && "border-red-400 bg-red-50 dark:bg-red-950/30",
    "hover:scale-105 hover:-translate-y-1"
  )}
>
  {/* Content */}
  <div className="p-3 space-y-2">
    {/* Header */}
    <div className="flex items-center gap-2">
      <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <h3 className="font-medium text-sm text-blue-900 dark:text-blue-100 truncate">
        {label}
      </h3>

      {/* Computing Indicator */}
      {isComputing && (
        <Loader2 className="h-4 w-4 text-blue-500 animate-spin ml-auto" />
      )}

      {/* Unit Badge */}
      {!isComputing && unit && (
        <Badge variant="secondary" className="text-xs ml-auto">
          {unit}
        </Badge>
      )}
    </div>

    {/* Value Display */}
    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
      {isComputing ? "..." : formatValue(value)}
    </div>

    {/* Formula Preview */}
    {computation_definition && !hasError && (
      <div
        className="
        px-2 py-1 rounded 
        bg-blue-100 dark:bg-blue-900/30
        border border-blue-200 dark:border-blue-800
      "
      >
        <code className="text-xs text-blue-700 dark:text-blue-300 font-mono truncate block">
          {extractFormula(computation_definition)}
        </code>
      </div>
    )}

    {/* Error Display */}
    {hasError && (
      <div
        className="
        px-2 py-1 rounded 
        bg-red-100 dark:bg-red-900/30
        border border-red-200 dark:border-red-800
        flex items-center gap-2
      "
      >
        <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
        <span className="text-xs text-red-700 dark:text-red-300 truncate">
          {computation_error}
        </span>
      </div>
    )}
  </div>

  {/* Handles */}
  <Handle type="target" position="top" className="!bg-blue-500" />
  <Handle type="source" position="bottom" className="!bg-blue-500" />
</motion.div>
```

---

## 🎯 5. COMMAND PALETTE (Cmd+K)

### **Implementation avec cmdk**

```tsx
import { Command } from "cmdk";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl">
        <Command className="rounded-lg border-0">
          {/* Input */}
          <div className="flex items-center border-b px-4 py-3">
            <Search className="h-5 w-5 text-zinc-400 mr-3" />
            <Command.Input
              placeholder="Type a command or search..."
              className="
                flex-1 bg-transparent text-sm 
                placeholder:text-zinc-400
                outline-none
              "
            />
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              No results found.
            </Command.Empty>

            {/* AI Actions */}
            <Command.Group
              heading="AI Actions"
              className="text-xs text-zinc-500 px-2 py-1"
            >
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  // Open AI Bar
                }}
                className="
                  flex items-center gap-3 px-3 py-2 rounded-lg
                  cursor-pointer
                  data-[selected]:bg-purple-100 dark:data-[selected]:bg-purple-900/30
                  transition-colors
                "
              >
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Ask AI</p>
                  <p className="text-xs text-zinc-500">
                    Generate or modify nodes
                  </p>
                </div>
                <kbd className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded">
                  Cmd+K
                </kbd>
              </Command.Item>

              <Command.Item className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected]:bg-purple-100 dark:data-[selected]:bg-purple-900/30">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Wand2 className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Smart Fix All</p>
                  <p className="text-xs text-zinc-500">
                    Fix all errors with AI
                  </p>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation">
              <Command.Item className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected]:bg-zinc-100 dark:data-[selected]:bg-zinc-800">
                <Network className="h-4 w-4 text-zinc-500" />
                <span className="text-sm">Dashboard</span>
              </Command.Item>
              {/* ... more items */}
            </Command.Group>

            {/* Nodes (Search results) */}
            <Command.Group heading="Nodes">
              {/* Dynamic node list */}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🎨 6. SCENARIO PANEL PARAMETER CARD

```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className={cn(
    "relative rounded-lg border p-4 space-y-3",
    "transition-all duration-200",

    /* Default State */
    "bg-white dark:bg-zinc-900",
    "border-zinc-200 dark:border-zinc-800",

    /* Overridden State */
    isOverridden && [
      "bg-blue-50 dark:bg-blue-950/30",
      "border-blue-300 dark:border-blue-700",
      "ring-1 ring-blue-200 dark:ring-blue-800",
    ],

    /* Hover */
    "hover:shadow-md"
  )}
  onMouseEnter={() => highlightNode(nodeId)}
  onMouseLeave={() => unhighlightNode()}
>
  {/* Header */}
  <div className="flex items-start justify-between gap-2">
    <div className="flex-1">
      <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
        {node.label}
      </h4>
      {node.description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {node.description}
        </p>
      )}
    </div>

    {/* Override Toggle */}
    <Switch
      checked={isOverridden}
      onCheckedChange={handleToggle}
      className="data-[state=checked]:bg-blue-500"
    />
  </div>

  {/* Value Controls */}
  {isOverridden && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      className="space-y-3"
    >
      {/* Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Value</span>
          <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
            {formatValue(overrideValue)} {node.unit}
          </span>
        </div>

        <Slider
          value={[overrideValue]}
          onValueChange={([v]) => setOverrideValue(v)}
          min={minValue}
          max={maxValue}
          step={step}
          className="[&_[role=slider]]:bg-blue-500"
        />

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{formatValue(minValue)}</span>
          <span>{formatValue(maxValue)}</span>
        </div>
      </div>

      {/* Direct Input */}
      <Input
        type="number"
        value={overrideValue}
        onChange={(e) => setOverrideValue(Number(e.target.value))}
        className="text-sm"
      />

      {/* Diff Display */}
      {baselineValue !== overrideValue && (
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">Change:</span>
          <Badge
            variant={overrideValue > baselineValue ? "success" : "destructive"}
            className="text-xs"
          >
            {overrideValue > baselineValue ? "+" : ""}
            {formatValue(overrideValue - baselineValue)}({(
              (overrideValue / baselineValue - 1) *
              100
            ).toFixed(1)}%)
          </Badge>
        </div>
      )}
    </motion.div>
  )}
</motion.div>
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

Pour chaque composant redesigné :

- [ ] **Glassmorphism** : `backdrop-blur-xl` ajouté
- [ ] **Gradients AI** : Purple→Blue sur actions IA
- [ ] **Animations** : Framer Motion ou Tailwind animate
- [ ] **Icons** : Lucide React, sizing cohérent
- [ ] **Dark Mode** : Toutes les classes `dark:` ajoutées
- [ ] **Hover States** : Transitions fluides (200-300ms)
- [ ] **Focus States** : Ring visible pour accessibilité
- [ ] **Loading States** : Spinner ou Skeleton
- [ ] **Error States** : Rouge + AlertCircle
- [ ] **Success States** : Vert + CheckCircle
- [ ] **AI Identity** : Sparkles + Purple quand applicable

---

**Date de création :** 2025-01-06  
**Version :** 1.0  
**Prêt à copier/coller** ✅
