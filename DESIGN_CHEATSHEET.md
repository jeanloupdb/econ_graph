# 🎨 Smart Graph - DESIGN CHEATSHEET

> **Référence Rapide** - À garder ouvert pendant le développement

---

## 🎨 COULEURS (Classes Tailwind)

### **Base Neutre**
```tsx
// Backgrounds
"bg-white dark:bg-zinc-950"              // Page
"bg-zinc-50 dark:bg-zinc-900"           // Cards
"bg-zinc-100 dark:bg-zinc-800"          // Hover

// Text
"text-zinc-900 dark:text-zinc-100"      // Primary
"text-zinc-600 dark:text-zinc-400"      // Secondary
"text-zinc-500 dark:text-zinc-500"      // Muted

// Borders
"border-zinc-200 dark:border-zinc-800"  // Default
"border-white/20 dark:border-white/10"  // Glass
```

### **AI Identity (Purple/Blue)**
```tsx
// Gradients
"bg-gradient-to-r from-purple-500 to-blue-500"        // Buttons
"bg-gradient-to-br from-purple-100 to-blue-100"      // Backgrounds (light)
"dark:from-purple-900/30 dark:to-blue-900/30"        // Backgrounds (dark)

// Solid
"bg-purple-500 text-white"                            // Primary AI
"text-purple-600 dark:text-purple-400"                // Text

// Borders
"border-purple-200/50 dark:border-purple-800/50"     // Subtle
"ring-2 ring-purple-400/50"                           // Focus
```

### **Modes**
```tsx
// Baseline (Zinc)
"bg-gradient-to-b from-zinc-100 to-zinc-200"
"dark:from-zinc-800 dark:to-zinc-900"

// Scénarios (Blue)
"bg-gradient-to-b from-blue-500 to-blue-600"
"shadow-lg shadow-blue-500/20"

// Comparaison (Orange)
"bg-gradient-to-b from-orange-500 to-orange-600"
"shadow-lg shadow-orange-500/20"
```

### **Nodes**
```tsx
// Parameter (Orange)
"bg-gradient-to-br from-orange-50 to-amber-50"
"dark:from-orange-950/30 dark:to-amber-950/30"
"border-orange-300 dark:border-orange-700"

// Computed (Blue)
"bg-gradient-to-br from-blue-50 to-indigo-50"
"dark:from-blue-950/30 dark:to-indigo-950/30"
"border-blue-300 dark:border-blue-700"
```

### **States**
```tsx
// Success
"bg-green-50 dark:bg-green-950/30"
"border-green-200 dark:border-green-800"
"text-green-700 dark:text-green-300"

// Error
"bg-red-50 dark:bg-red-950/30"
"border-red-200 dark:border-red-800"
"text-red-700 dark:text-red-300"

// Warning
"bg-yellow-50 dark:bg-yellow-950/30"
"border-yellow-200 dark:border-yellow-800"
"text-yellow-700 dark:text-yellow-300"
```

---

## 🎯 GLASSMORPHISM (Copy/Paste)

### **Standard Glass**
```tsx
className="
  bg-white/60 dark:bg-black/40 
  backdrop-blur-xl 
  border border-white/20 dark:border-white/10
"
```

### **Strong Glass (Modals)**
```tsx
className="
  bg-white/80 dark:bg-zinc-900/80 
  backdrop-blur-2xl 
  border border-white/30 dark:border-white/20
"
```

### **Subtle Glass (Overlays)**
```tsx
className="
  bg-black/20 dark:bg-white/10 
  backdrop-blur-md
"
```

---

## 📐 SPACING (Quick Reference)

```tsx
gap-1   // 4px
gap-2   // 8px
gap-3   // 12px
gap-4   // 16px  ← Most common
gap-6   // 24px

p-2     // 8px
p-3     // 12px
p-4     // 16px  ← Most common
p-6     // 24px

rounded-lg    // 8px
rounded-xl    // 10px  ← Default
rounded-2xl   // 16px  ← Large panels
```

---

## 🎨 SHADOWS (Copy/Paste)

```tsx
// Default
"shadow-md"                             // Cards
"shadow-lg"                             // Panels
"shadow-xl"                             // Modals

// Colored (AI)
"shadow-lg shadow-purple-500/20"       // AI elements
"shadow-lg shadow-blue-500/20"         // Scénarios
"shadow-lg shadow-orange-500/20"       // Comparaison
```

---

## ✨ ANIMATIONS (Classes)

### **Tailwind Built-in**
```tsx
"transition-all duration-200"          // Fast (hover)
"transition-all duration-300"          // Medium (default)
"transition-all duration-500"          // Slow (smooth)

"hover:scale-105 active:scale-95"     // Button scale
"hover:-translate-y-1"                 // Lift effect

"animate-spin"                         // Loader
"animate-pulse"                        // Loading state
```

### **Custom (globals.css)**
```tsx
"animate-shimmer"                      // Loading bar
"animate-pulse-glow"                   // AI active
"animate-float"                        // Subtle movement
"animate-gradient-x"                   // Gradient flow
```

### **Framer Motion Presets**
```tsx
// Fade In Up
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}

// Scale
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}

// Slide In
initial={{ x: -300, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
```

---

## 🎯 BUTTONS (Quick Templates)

### **Primary (Default)**
```tsx
<Button className="
  bg-zinc-900 dark:bg-zinc-50 
  text-white dark:text-zinc-900
  hover:bg-zinc-800 dark:hover:bg-zinc-200
">
  Action
</Button>
```

### **Primary AI (Gradient)**
```tsx
<Button className="
  bg-gradient-to-r from-purple-500 to-blue-500 
  hover:from-purple-600 hover:to-blue-600
  text-white
  shadow-lg shadow-purple-500/30
">
  <Sparkles className="h-4 w-4 mr-2" />
  AI Action
</Button>
```

### **Secondary**
```tsx
<Button variant="outline" className="
  border-zinc-300 dark:border-zinc-700
  hover:bg-zinc-100 dark:hover:bg-zinc-800
">
  Cancel
</Button>
```

### **Ghost**
```tsx
<Button variant="ghost" className="
  hover:bg-zinc-100 dark:hover:bg-zinc-800
">
  Action
</Button>
```

### **Icon Only**
```tsx
<Button variant="ghost" size="icon" className="h-10 w-10">
  <Settings className="h-5 w-5" />
</Button>
```

---

## 🏷️ BADGES (Quick Templates)

### **Default**
```tsx
<Badge variant="secondary">Label</Badge>
```

### **Success**
```tsx
<Badge className="bg-green-500 text-white">
  <CheckCircle className="h-3 w-3 mr-1" />
  Success
</Badge>
```

### **Error**
```tsx
<Badge className="bg-red-500 text-white">
  <XCircle className="h-3 w-3 mr-1" />
  Error
</Badge>
```

### **AI Generated**
```tsx
<Badge className="
  bg-gradient-to-r from-purple-500 to-blue-500 
  text-white
  shadow-lg shadow-purple-500/50
">
  <Sparkles className="h-3 w-3 mr-1" />
  AI
</Badge>
```

---

## 📝 INPUTS (Quick Templates)

### **Standard**
```tsx
<Input 
  className="
    h-10 px-3 
    bg-white dark:bg-zinc-900
    border-zinc-200 dark:border-zinc-800
    focus:ring-2 focus:ring-blue-500
  "
  placeholder="Enter value..."
/>
```

### **With Icon**
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
  <Input className="pl-9" placeholder="Search..." />
</div>
```

### **AI Input (Styled)**
```tsx
<div className="
  flex items-center gap-3 
  px-4 py-3 rounded-xl
  bg-white/80 dark:bg-zinc-900/80 
  backdrop-blur-xl
  border border-purple-200/50 dark:border-purple-800/50
">
  <Sparkles className="h-5 w-5 text-purple-500" />
  <input
    className="flex-1 bg-transparent outline-none"
    placeholder="Ask AI..."
  />
</div>
```

---

## 🎴 CARDS (Quick Templates)

### **Standard**
```tsx
<div className="
  rounded-xl 
  bg-white dark:bg-zinc-900 
  border border-zinc-200 dark:border-zinc-800
  shadow-md
  p-6
">
  <h3 className="font-semibold text-lg mb-2">Title</h3>
  <p className="text-sm text-zinc-600 dark:text-zinc-400">Content</p>
</div>
```

### **Hover Effect**
```tsx
<div className="
  rounded-xl border p-6
  bg-white dark:bg-zinc-900
  border-zinc-200 dark:border-zinc-800
  
  transition-all duration-200
  hover:shadow-lg hover:-translate-y-1
  
  cursor-pointer
">
```

### **Glass Card**
```tsx
<div className="
  rounded-2xl p-6
  bg-white/60 dark:bg-black/40 
  backdrop-blur-xl
  border border-white/20 dark:border-white/10
  shadow-xl
">
```

---

## 🎯 DIALOGS/MODALS (Template)

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="
    max-w-2xl 
    bg-white dark:bg-zinc-900
    border-zinc-200 dark:border-zinc-800
  ">
    <DialogHeader className="border-b pb-4">
      <DialogTitle className="text-xl font-semibold">
        Title
      </DialogTitle>
      <p className="text-sm text-zinc-500 mt-1">
        Description
      </p>
    </DialogHeader>
    
    <div className="py-4">
      {/* Content */}
    </div>
    
    <DialogFooter className="border-t pt-4">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onConfirm}>
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎨 AI ELEMENTS (Signatures)

### **AI Icon Container**
```tsx
<div className="
  p-2 rounded-lg 
  bg-gradient-to-br from-purple-100 to-blue-100
  dark:from-purple-900/30 dark:to-blue-900/30
  ring-1 ring-purple-200 dark:ring-purple-800
">
  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
</div>
```

### **AI Badge**
```tsx
<div className="
  px-2 py-0.5 rounded-full
  bg-gradient-to-r from-purple-500 to-blue-500
  text-white text-xs font-medium
  shadow-lg shadow-purple-500/50
  flex items-center gap-1
">
  <Sparkles className="h-3 w-3" />
  AI
</div>
```

### **AI Button**
```tsx
<button className="
  px-4 py-2 rounded-lg
  bg-gradient-to-r from-purple-500 to-blue-500 
  hover:from-purple-600 hover:to-blue-600
  text-white font-medium
  shadow-lg shadow-purple-500/30
  transition-all duration-200
  hover:scale-105
  
  flex items-center gap-2
">
  <Sparkles className="h-4 w-4" />
  Generate
</button>
```

---

## 🎯 STATUS INDICATORS

### **Success**
```tsx
<div className="flex items-center gap-2">
  <CheckCircle className="h-5 w-5 text-green-500" />
  <span className="text-sm text-green-700 dark:text-green-300">
    Success
  </span>
</div>
```

### **Error**
```tsx
<div className="flex items-center gap-2">
  <AlertCircle className="h-5 w-5 text-red-500" />
  <span className="text-sm text-red-700 dark:text-red-300">
    Error occurred
  </span>
</div>
```

### **Loading**
```tsx
<div className="flex items-center gap-2">
  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
  <span className="text-sm text-zinc-600 dark:text-zinc-400">
    Processing...
  </span>
</div>
```

### **Warning**
```tsx
<div className="flex items-center gap-2">
  <AlertCircle className="h-5 w-5 text-yellow-500" />
  <span className="text-sm text-yellow-700 dark:text-yellow-300">
    Warning
  </span>
</div>
```

---

## 🎨 MODE-SPECIFIC STYLES

### **Baseline Mode**
```tsx
// Header button
className={cn(
  "px-4 py-2 rounded-lg font-bold",
  mode === "baseline" && [
    "bg-gradient-to-b from-zinc-100 to-zinc-200",
    "dark:from-zinc-800 dark:to-zinc-900",
    "text-zinc-900 dark:text-zinc-100",
    "border border-zinc-200 dark:border-zinc-700"
  ]
)}
```

### **Scénarios Mode**
```tsx
className={cn(
  "px-4 py-2 rounded-lg font-bold",
  mode === "scenario" && [
    "bg-gradient-to-b from-blue-500 to-blue-600",
    "text-white",
    "border border-blue-400/30",
    "shadow-lg shadow-blue-500/20"
  ]
)}
```

### **Comparaison Mode**
```tsx
className={cn(
  "px-4 py-2 rounded-lg font-bold",
  mode === "comparison" && [
    "bg-gradient-to-b from-orange-500 to-orange-600",
    "text-white",
    "border border-orange-400/30",
    "shadow-lg shadow-orange-500/20"
  ]
)}
```

---

## 🎯 RESPONSIVE PATTERNS

```tsx
// Hide on mobile, show on desktop
"hidden lg:block"

// Stack on mobile, grid on desktop
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Full width on mobile, fixed on desktop
"w-full lg:w-[600px]"

// Padding adjustments
"px-4 sm:px-6 lg:px-8"

// Text size adjustments
"text-sm md:text-base lg:text-lg"
```

---

## 🎨 ICON SIZING

```tsx
// Extra Small (inline with text)
<Icon className="h-3 w-3" />        // 12px

// Small (buttons, badges)
<Icon className="h-4 w-4" />        // 16px - Most common

// Medium (headers)
<Icon className="h-5 w-5" />        // 20px

// Large (emphasis)
<Icon className="h-6 w-6" />        // 24px

// Extra Large (hero)
<Icon className="h-8 w-8" />        // 32px
```

---

## ✅ ACCESSIBILITY CHECKLIST

```tsx
// Focus visible
"focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"

// Focus within (for containers)
"focus-within:ring-2 focus-within:ring-blue-500"

// Disabled state
"disabled:opacity-50 disabled:cursor-not-allowed"

// ARIA labels
aria-label="Close dialog"
aria-describedby="dialog-description"

// Role (for custom elements)
role="button"
role="dialog"
role="alert"
```

---

## 🎯 COMMON cn() PATTERNS

```tsx
import { cn } from "@/lib/utils";

// Base + conditional
cn(
  "base classes here",
  condition && "conditional classes",
  condition ? "true classes" : "false classes"
)

// Example: Button states
cn(
  "px-4 py-2 rounded-lg transition-colors",
  isActive && "bg-blue-500 text-white",
  isDisabled && "opacity-50 cursor-not-allowed",
  !isActive && !isDisabled && "bg-zinc-100 hover:bg-zinc-200"
)
```

---

## 🎨 GRADIENT PRESETS

```tsx
// AI Gradient (Purple → Blue)
"bg-gradient-to-r from-purple-500 to-blue-500"
"bg-gradient-to-br from-purple-100 to-blue-100"  // Subtle

// Success Gradient
"bg-gradient-to-r from-green-500 to-emerald-500"

// Warning Gradient
"bg-gradient-to-r from-yellow-500 to-orange-500"

// Error Gradient
"bg-gradient-to-r from-red-500 to-pink-500"

// Neutral Gradient
"bg-gradient-to-b from-zinc-100 to-zinc-200"
"dark:from-zinc-800 dark:to-zinc-900"
```

---

## 🎯 QUICK COPY/PASTE SNIPPETS

### **Loading Spinner**
```tsx
<Loader2 className="h-5 w-5 animate-spin text-blue-500" />
```

### **Success Message**
```tsx
<div className="flex items-center gap-2 text-green-600">
  <CheckCircle className="h-4 w-4" />
  <span className="text-sm">Operation successful</span>
</div>
```

### **Error Message**
```tsx
<div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
  <div className="flex items-start gap-2">
    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
    <div>
      <h4 className="text-sm font-medium text-red-900 dark:text-red-100">Error</h4>
      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
    </div>
  </div>
</div>
```

### **Skeleton Loader**
```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
</div>
```

---

**💡 TIP :** Gardez ce fichier ouvert en split-screen pendant que vous codez !

**📅 Dernière mise à jour :** 2025-01-06  
**✅ Statut :** Prêt pour production


