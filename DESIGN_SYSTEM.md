# 🎨 Smart Graph - DESIGN SYSTEM & IDENTITÉ VISUELLE

## 📐 PHILOSOPHIE DE DESIGN

### **Concept Central : "AI-Powered Clarity"**

**L'identité visuelle doit incarner 3 valeurs :**

1. **🤖 Intelligence** : L'IA est omniprésente mais jamais intrusive
2. **💎 Clarté** : Les données complexes deviennent lisibles instantanément
3. **⚡ Rapidité** : Interactions fluides, feedback immédiat

**NOT This :**
❌ Chatbot dans le coin avec bulle de texte  
❌ UI surchargée de boutons "AI Magic"  
❌ Neon cyberpunk excessif

**But This :**
✅ L'IA est intégrée dans chaque interaction  
✅ Signes visuels subtils mais reconnaissables  
✅ Élégance professionnelle + touche futuriste

---

## 🎨 PALETTE DE COULEURS

### **1. Couleurs Primaires (Identité de Marque)**

#### **A. Palette Neutre (Base)**

```css
/* Light Mode */
--zinc-50:   #fafafa   /* Backgrounds */
--zinc-100:  #f4f4f5   /* Hover states */
--zinc-200:  #e4e4e7   /* Borders */
--zinc-300:  #d4d4d8   /* Disabled */
--zinc-600:  #52525b   /* Secondary text */
--zinc-900:  #18181b   /* Primary text */

/* Dark Mode */
--zinc-950:  #09090b   /* Backgrounds */
--zinc-900:  #18181b   /* Cards */
--zinc-800:  #27272a   /* Hover states */
--zinc-700:  #3f3f46   /* Borders */
--zinc-400:  #a1a1aa   /* Secondary text */
--zinc-100:  #f4f4f5   /* Primary text */
```

**Usage :** Canvas background, text, borders, neutralité professionnelle

---

### **2. Couleurs Fonctionnelles (Sémantique)**

#### **A. Blue - Navigation & Data** ⭐ **COULEUR PRINCIPALE**

```css
--blue-50:   #eff6ff
--blue-100:  #dbeafe
--blue-500:  #3b82f6   /* Primary actions */
--blue-600:  #2563eb   /* Hover states */
--blue-900:  #1e3a8a   /* Dark accents */
```

**Usage :**

- Mode Scénarios (header toggle)
- Liens de navigation
- Nœuds calculés (computed nodes)
- Hover states sur canvas
- Primary buttons (CTA)

**Gradient Signature :**

```css
bg-gradient-to-br from-blue-500 to-blue-600
```

---

#### **B. Purple/Violet - AI Identity** 🤖 **COULEUR DISTINCTIVE**

```css
--purple-400: #c084fc
--purple-500: #a855f7   /* AI Primary */
--purple-600: #9333ea   /* AI Hover */
--purple-900: #581c87   /* AI Dark */
--violet-500: #8b5cf6
--violet-600: #7c3aed
```

**Usage :**

- GraphAiBar (barre AI en bas)
- Bouton "✨ Ask AI"
- SmartFix Dialog
- Sparkles icon
- AI-generated badges
- Loading states (AI processing)

**Gradient Signature :**

```css
/* Multi-color AI Gradient */
bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500

/* Animated Border (existant) */
linear-gradient(120deg, #60a5fa, #a855f7, #f472b6, #34d399, #60a5fa)
```

**Animation Distinctive :**

```css
@keyframes ai-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes ai-shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}
```

---

#### **C. Orange - Modes & Alerts** 🔶

```css
--orange-400: #fb923c
--orange-500: #f97316   /* Comparison mode */
--orange-600: #ea580c
--orange-900: #7c2d12

--amber-400:  #fbbf24   /* Composites (legacy) */
--amber-500:  #f59e0b
--amber-600:  #d97706
```

**Usage :**

- Mode Comparaison (header toggle)
- Nœuds paramètres (parameter nodes)
- Warnings / Alerts
- ~~Composites (à minimiser)~~

---

#### **D. Semantic Colors**

```css
/* Success */
--green-500:  #22c55e
--green-600:  #16a34a
--emerald-500: #10b981

/* Error */
--red-500:    #ef4444
--red-600:    #dc2626
--red-900:    #7f1d1d

/* Warning */
--yellow-500: #eab308
--yellow-600: #ca8a04
```

**Usage :**

- Success: Calculs réussis, validation
- Error: Erreurs de formule, SmartFix trigger
- Warning: Cycles détectés, valeurs manquantes

---

### **3. Modes Visuels (Triple State)**

#### **Baseline Mode** (Neutre/Zinc)

```css
/* Header */
bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900
text-zinc-900 dark:text-zinc-100
border-zinc-200 dark:border-zinc-700

/* Canvas */
/* Fond neutre, focus sur les données */
```

#### **Scénarios Mode** (Blue) ⭐

```css
/* Header */
bg-gradient-to-b from-blue-500 to-blue-600
text-white
border-blue-400/30

/* Canvas */
/* Highlight des nœuds overridés */
border-blue-400
ring-2 ring-blue-200 dark:ring-blue-900
```

#### **Comparaison Mode** (Orange)

```css
/* Header */
bg-gradient-to-b from-orange-500 to-orange-600
text-white
border-orange-400/30

/* Canvas */
/* Diff colors */
--diff-positive: #22c55e
--diff-negative: #ef4444
```

---

## 🎭 TYPOGRAPHIE

### **Fonts Stack**

```css
--font-sans: "Geist Sans", system-ui, -apple-system, sans-serif;
--font-mono: "Geist Mono", "Fira Code", "JetBrains Mono", monospace;
```

### **Type Scale**

```css
/* Headings */
--text-5xl: 3rem; /* Hero titles */
--text-4xl: 2.25rem; /* Page titles */
--text-3xl: 1.875rem; /* Section titles */
--text-2xl: 1.5rem; /* Card titles */
--text-xl: 1.25rem; /* Subtitles */
--text-lg: 1.125rem; /* Large body */

/* Body */
--text-base: 1rem; /* 16px - Default */
--text-sm: 0.875rem; /* 14px - Secondary */
--text-xs: 0.75rem; /* 12px - Labels */

/* Code */
--text-code: 0.875rem; /* Monaco Editor */
```

### **Font Weights**

```css
--font-normal: 400; /* Body text */
--font-medium: 500; /* Labels */
--font-semibold: 600; /* Headings */
--font-bold: 700; /* Emphasis */
```

### **Usage Examples**

```tsx
// Page Title
<h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
  Smart Graph
</h1>

// Section Title
<h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
  Scénarios
</h2>

// Body Text
<p className="text-sm text-zinc-600 dark:text-zinc-400">
  Description du projet
</p>

// Code
<code className="text-xs font-mono text-purple-600 bg-purple-50 px-1 py-0.5 rounded">
  def compute():
</code>
```

---

## 🎯 SPACING & SIZING

### **Spacing Scale (Tailwind)**

```css
0:    0px
0.5:  2px
1:    4px
1.5:  6px
2:    8px
3:    12px
4:    16px
5:    20px
6:    24px
8:    32px
10:   40px
12:   48px
16:   64px
20:   80px
24:   96px
```

### **Component Sizes**

```css
/* Buttons */
--btn-sm:      h-8 px-3 text-xs     /* 32px height */
--btn-default: h-10 px-4 text-sm    /* 40px height */
--btn-lg:      h-12 px-6 text-base  /* 48px height */

/* Inputs */
--input-default: h-10 px-3          /* 40px height */
--input-sm:      h-8 px-2           /* 32px height */

/* Icons */
--icon-xs:  12px (h-3 w-3)
--icon-sm:  16px (h-4 w-4)
--icon-md:  20px (h-5 w-5)
--icon-lg:  24px (h-6 w-6)
--icon-xl:  32px (h-8 w-8)
```

### **Layout Grid**

```css
/* Canvas Node Spacing */
--node-gap-x: 300px   /* Horizontal spacing between nodes */
--node-gap-y: 250px   /* Vertical spacing (rows) */

/* Sidebar Width */
--sidebar-default: 400px
--sidebar-min:     320px
--sidebar-max:     560px

/* Inspector Width */
--inspector-default: 448px  /* ~28rem */
```

---

## 🔲 BORDER RADIUS

### **Scale**

```css
--radius-xs:  4px   /* rounded */
--radius-sm:  6px   /* rounded-md (--radius - 4px) */
--radius-md:  8px   /* rounded-lg (--radius - 2px) */
--radius-lg:  10px  /* rounded-xl (--radius) ⭐ DEFAULT */
--radius-xl:  14px  /* rounded-2xl (--radius + 4px) */
--radius-2xl: 16px  /* rounded-2xl */
--radius-full: 9999px /* rounded-full */
```

### **Usage**

```tsx
/* Cards, Panels */
className = "rounded-xl"; /* 10px - Standard */

/* Buttons, Inputs */
className = "rounded-lg"; /* 8px */

/* Badges, Pills */
className = "rounded-full";

/* Topbar, Panels (Large) */
className = "rounded-2xl"; /* 16px */
```

---

## 🎨 GLASSMORPHISM & EFFECTS

### **Glass Style (Signature)**

```css
/* Topbar, Sidebars, Panels */
.glass-panel {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

/* Dark Mode */
.dark .glass-panel {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* Tailwind Classes */
className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/20"
```

### **Shadows**

```css
/* Elevation Scale */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1); /* Cards */
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1); /* Modals */
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25); /* Overlays */

/* AI Glow */
--shadow-ai: 0 0 20px rgba(168, 85, 247, 0.3), 0 0 40px rgba(59, 130, 246, 0.2);
```

### **Backdrop Blur**

```css
/* Standard Glass */
backdrop-blur-xl    /* 24px */

/* Strong Glass (Modals) */
backdrop-blur-2xl   /* 40px */

/* Light Glass */
backdrop-blur-lg    /* 16px */
```

---

## ✨ ANIMATIONS & TRANSITIONS

### **1. Standard Transitions**

```css
/* Default (Fast) */
transition: all 150ms ease;
transition-colors duration-150

/* Medium (Interactive) */
transition: all 300ms ease;
transition-all duration-300

/* Slow (Smooth) */
transition: all 500ms ease-out;
transition-all duration-500
```

### **2. AI-Specific Animations**

#### **Shimmer Effect (Loading)**

```css
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
```

#### **Pulse Glow (Active AI)**

```css
@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(168, 85, 247, 0.6);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 3s ease-in-out infinite;
}
```

#### **Gradient Flow (AI Border)**

```css
@keyframes ai-border-flow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}

.ai-border {
  background: linear-gradient(
    120deg,
    #60a5fa,
    #a855f7,
    #f472b6,
    #34d399,
    #60a5fa
  );
  background-size: 200% 200%;
  animation: ai-border-flow 2s linear forwards;
}
```

#### **Float (Subtle Movement)**

```css
@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
```

### **3. Framer Motion Variants**

#### **Fade In Up (Cards)**

```tsx
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};
```

#### **Scale (Buttons)**

```tsx
const scaleHover = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};
```

#### **Slide In (Sidebars)**

```tsx
const slideIn = {
  hidden: { x: -300, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
};
```

---

## 🎯 COMPOSANTS SIGNATURES

### **1. AI Input Bar (GraphAiBar)**

#### **Visual Identity**

```tsx
<div
  className="
  fixed bottom-4 left-1/2 -translate-x-1/2 w-[600px] z-50
  bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl
  border border-purple-200/50 dark:border-purple-800/50
  rounded-2xl shadow-2xl shadow-purple-500/20
  ring-1 ring-purple-100 dark:ring-purple-900
  transition-all duration-300 hover:shadow-purple-500/40
"
>
  <div className="flex items-center gap-2 p-2">
    <Sparkles className="h-5 w-5 text-purple-500 animate-pulse-glow" />
    <input
      className="flex-1 bg-transparent text-sm placeholder:text-zinc-400"
      placeholder="Ask AI anything..."
    />
    <Button className="bg-gradient-to-r from-purple-500 to-blue-500">
      Generate
    </Button>
  </div>
</div>
```

#### **États Visuels**

- **Idle** : Border subtile, ombre légère
- **Focused** : Border purple glow, ring animé
- **Processing** : Shimmer animation, spinner
- **Success** : Green flash, fade out

---

### **2. Topbar (Modes Switcher)**

#### **Structure**

```tsx
<div
  className="
  fixed top-2 left-2 right-2 h-14 z-50
  flex items-center justify-between
  px-4 rounded-2xl
  bg-white/60 dark:bg-black/40 backdrop-blur-xl
  border border-white/20 shadow-lg
"
>
  {/* Left: Back + Mode Switcher */}
  <div className="flex items-center gap-3">
    <Button variant="ghost" size="icon">
      <ChevronLeft />
    </Button>

    {/* Mode Toggle */}
    <div className="flex gap-1 p-1 bg-black/20 rounded-xl">
      <button className={mode === "baseline" ? activeClass : inactiveClass}>
        Baseline
      </button>
      <button className={mode === "scenario" ? activeClass : inactiveClass}>
        Scénarios
      </button>
      <button className={mode === "comparison" ? activeClass : inactiveClass}>
        Comparaison
      </button>
    </div>

    <h1 className="text-lg font-semibold">Project Name</h1>
  </div>

  {/* Right: View/Edit Toggle + User Menu */}
  <div className="flex items-center gap-2">
    {/* Developer Toggle */}
    <UserMenu />
  </div>
</div>
```

#### **Mode Visual States**

```css
/* Baseline (Neutre) */
.mode-baseline {
  background: linear-gradient(to bottom, #f4f4f5, #e4e4e7);
  color: #18181b;
}

/* Scénarios (Blue) */
.mode-scenario {
  background: linear-gradient(to bottom, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}

/* Comparaison (Orange) */
.mode-comparison {
  background: linear-gradient(to bottom, #f97316, #ea580c);
  color: white;
  box-shadow: 0 0 20px rgba(249, 115, 22, 0.3);
}
```

---

### **3. Node Styles (Canvas)**

#### **Parameter Node (Orange)**

```tsx
<div
  className="
  min-w-[180px] rounded-xl border-2
  bg-gradient-to-br from-orange-50 to-amber-50
  dark:from-orange-950/30 dark:to-amber-950/30
  border-orange-300 dark:border-orange-700
  shadow-md hover:shadow-lg
  transition-all duration-200
"
>
  <div className="p-3">
    <div className="flex items-center gap-2 mb-1">
      <Settings className="h-4 w-4 text-orange-600" />
      <h3 className="font-medium text-sm">Revenue</h3>
    </div>
    <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
      10,000 €
    </div>
  </div>
</div>
```

#### **Computed Node (Blue)**

```tsx
<div
  className="
  min-w-[180px] rounded-xl border-2
  bg-gradient-to-br from-blue-50 to-indigo-50
  dark:from-blue-950/30 dark:to-indigo-950/30
  border-blue-300 dark:border-blue-700
  shadow-md hover:shadow-lg
  transition-all duration-200
"
>
  <div className="p-3">
    <div className="flex items-center gap-2 mb-1">
      <Zap className="h-4 w-4 text-blue-600" />
      <h3 className="font-medium text-sm">Profit</h3>
    </div>
    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
      2,500 €
    </div>

    {/* Formula Preview */}
    <code className="text-xs text-blue-600 dark:text-blue-400 mt-1 block truncate">
      revenue - cost
    </code>
  </div>
</div>
```

#### **AI-Generated Badge**

```tsx
{
  isAiGenerated && (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="absolute -top-2 -right-2 px-2 py-0.5 
      bg-gradient-to-r from-purple-500 to-blue-500
      text-white text-xs font-medium rounded-full
      shadow-lg shadow-purple-500/50
      flex items-center gap-1"
    >
      <Sparkles className="h-3 w-3" />
      AI
    </motion.div>
  );
}
```

#### **Error State**

```tsx
<div
  className="
  border-red-300 dark:border-red-700
  bg-red-50 dark:bg-red-950/30
  shadow-red-500/20
"
>
  <Badge variant="destructive" className="absolute -top-2 -left-2">
    Error
  </Badge>
</div>
```

---

### **4. SmartFix Dialog**

```tsx
<Dialog>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <DialogTitle>AI Smart Fix</DialogTitle>
          <p className="text-sm text-zinc-500">
            Automatic error detection and correction
          </p>
        </div>
      </div>
    </DialogHeader>

    {/* Error Display */}
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <code className="text-xs text-red-600 dark:text-red-400">
        {errorTrace}
      </code>
    </div>

    {/* AI Fix Display */}
    {fixData && (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-2 mb-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-sm text-green-900 dark:text-green-100">
              AI Recommendation
            </h4>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              {fixData.explanation}
            </p>
          </div>
        </div>

        <CodeEditor value={fixData.corrected_code} readOnly height="200px" />
      </div>
    )}

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button
        onClick={applyFix}
        className="bg-gradient-to-r from-purple-500 to-blue-500"
      >
        <Sparkles className="h-4 w-4 mr-1" />
        Apply Fix
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎨 SUBTLE BACKGROUNDS

### **SubtleBackground Component**

```tsx
{
  /* Dashboard - Blue */
}
<SubtleBackground variant="blue" />;

{
  /* Graph Editor - Default (Zinc) */
}
<SubtleBackground variant="default" />;

{
  /* ~~Composites - Amber (à minimiser)~~ */
}
```

### **Grid Pattern**

```css
/* Canvas Grid */
.canvas-grid {
  background-image: linear-gradient(
      to right,
      rgba(0, 0, 0, 0.05) 1px,
      transparent 1px
    ), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}

.dark .canvas-grid {
  background-image: linear-gradient(
      to right,
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px
    ), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
}
```

---

## 🎯 ICONOGRAPHIE

### **Icon Library : Lucide React**

#### **Catégories d'Icons**

**AI & Smart Actions**

```tsx
<Sparkles />      /* AI primary icon */
<Zap />           /* Quick action */
<Wand2 />         /* Magic/Generate */
<Bot />           /* Agent/Assistant */
<BrainCircuit />  /* Intelligence */
```

**Navigation**

```tsx
<ChevronLeft />   /* Back */
<ChevronRight />  /* Forward */
<ChevronDown />   /* Expand */
<Menu />          /* Hamburger */
<X />             /* Close */
```

**Actions**

```tsx
<Plus />          /* Add */
<Edit3 />         /* Edit */
<Trash2 />        /* Delete */
<Copy />          /* Duplicate */
<Share2 />        /* Share */
<Download />      /* Export */
<Upload />        /* Import */
<RefreshCw />     /* Refresh */
```

**Modes & Views**

```tsx
<Eye />           /* View mode */
<Code2 />         /* Edit/Developer mode */
<Layers />        /* Composites */
<Network />       /* Graph/Projects */
<GitBranch />     /* Connections */
<LayoutGrid />    /* Grid view */
<LayoutList />    /* List view */
```

**Status & Feedback**

```tsx
<CheckCircle />   /* Success */
<AlertCircle />   /* Warning */
<XCircle />       /* Error */
<Info />          /* Information */
<Loader2 />       /* Loading (spinning) */
```

**Data & Nodes**

```tsx
<Box />           /* Node count */
<Settings />      /* Parameter node */
<Calculator />    /* Computed node */
<Database />      /* API node */
```

### **Icon Sizing Standards**

```tsx
/* Extra Small - Inline with text */
<Icon className="h-3 w-3" />  /* 12px */

/* Small - Buttons, badges */
<Icon className="h-4 w-4" />  /* 16px */

/* Medium - Default */
<Icon className="h-5 w-5" />  /* 20px */

/* Large - Headers, emphasis */
<Icon className="h-6 w-6" />  /* 24px */

/* Extra Large - Hero sections */
<Icon className="h-8 w-8" />  /* 32px */
```

---

## 🎨 BRAND ASSETS

### **Logo Concept (à créer)**

```
┌─────────────────────┐
│  ✨ Smart Graph      │
│  ──────────────     │  ← Ligne de flux stylisée
│  AI-Powered Models  │
└─────────────────────┘

Variantes :
- Full logo (texte + tagline)
- Icon only (✨ + graphe stylisé)
- Wordmark (Smart Graph)
```

### **Favicon**

```
Un nœud stylisé avec effet sparkle
Couleurs : Blue + Purple gradient
```

---

## 📐 LAYOUT PATTERNS

### **1. Dashboard Layout**

```
┌────────────────────────────────────────┐
│  Topbar (Protected)                    │
├────────────────────────────────────────┤
│  Hero Section (Gradient Background)    │
│  ┌──────────────────────────────────┐  │
│  │  AiMagicBar (Centered)           │  │
│  └──────────────────────────────────┘  │
├────────────────────────────────────────┤
│  Projects Grid/List                    │
│  ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ Card │ │ Card │ │ Card │          │
│  └──────┘ └──────┘ └──────┘          │
└────────────────────────────────────────┘
```

### **2. Graph Editor Layout**

```
┌────────────────────────────────────────┐
│  Topbar (Mode Switcher)                │
├──┬─────────────────────────────────┬───┤
│  │                                 │   │
│S │  Canvas (Infinite)              │ I │
│i │  ┌──────┐     ┌──────┐         │ n │
│d │  │ Node │ --> │ Node │         │ s │
│e │  └──────┘     └──────┘         │ p │
│b │                                 │ e │
│a │  GraphAiBar (Bottom, Centered) │ c │
│r │  ┌──────────────────────────┐  │ t │
│  │  │ Ask AI...          [Gen] │  │ o │
│  │  └──────────────────────────┘  │ r │
└──┴─────────────────────────────────┴───┘
```

### **3. Modal/Dialog Layout**

```
┌────────────────────────────────────┐
│  ┌────────────────────────────┐   │  ← Backdrop blur
│  │  Dialog Header             │   │
│  ├────────────────────────────┤   │
│  │  Content Area              │   │
│  │  (Scrollable if needed)    │   │
│  ├────────────────────────────┤   │
│  │  Footer (Actions)          │   │
│  │  [Cancel]  [Confirm]       │   │
│  └────────────────────────────┘   │
└────────────────────────────────────┘
```

---

## 🎯 RESPONSIVE BREAKPOINTS

```css
/* Tailwind Defaults */
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Laptop */
xl:  1280px  /* Desktop */
2xl: 1536px  /* Large desktop */

/* Custom Breakpoints (si nécessaire) */
@media (min-width: 1920px) {
  /* 4K displays */
}
```

### **Responsive Patterns**

```tsx
/* Stack on mobile, grid on desktop */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

/* Hide sidebar on mobile */
<div className="hidden lg:block">
  <Sidebar />
</div>

/* Full width on mobile */
<div className="w-full lg:w-[600px]">
```

---

## 🎨 DARK MODE

### **Philosophy**

- **NOT True Black** : Utiliser zinc-950 (#09090b) plutôt que #000000
- **Contrast ratios** : Respecter WCAG AA minimum (4.5:1)
- **Subtle borders** : rgba(255,255,255,0.1) pour la profondeur

### **Color Adjustments**

```css
/* Light Mode */
--background: #ffffff
--text: #18181b
--border: #e4e4e7

/* Dark Mode */
--background: #09090b  /* zinc-950 */
--text: #f4f4f5        /* zinc-100 */
--border: rgba(255,255,255,0.1)
```

### **Implementation**

```tsx
<div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
  {/* Content */}
</div>
```

---

## ✅ CHECKLIST DE COHÉRENCE

Avant de coder un composant, vérifier :

- [ ] **Couleurs** : Respecte la palette (Blue/Purple/Orange)
- [ ] **Typography** : Geist Sans, sizes cohérentes
- [ ] **Spacing** : Multiples de 4px (Tailwind scale)
- [ ] **Border Radius** : Utilise rounded-xl (10px) par défaut
- [ ] **Glassmorphism** : backdrop-blur-xl si applicable
- [ ] **Animations** : Transitions fluides (300ms)
- [ ] **Icons** : Lucide, sizing correct (h-4 w-4, h-5 w-5)
- [ ] **Dark Mode** : Classes dark: ajoutées
- [ ] **AI Identity** : Purple/Sparkles si action IA
- [ ] **Accessibility** : Focus states, ARIA labels

---

## 🚀 PROCHAINES ÉTAPES

1. **Créer le composant de base** : CommandPalette (Cmd+K)
2. **Refactoriser GraphAiBar** : Appliquer nouveau style
3. **Redesigner Topbar** : Mode switcher amélioré
4. **Optimiser Node Styles** : Uniformiser les states

---

**Date de création :** 2025-01-06  
**Version :** 1.0  
**Statut :** 🟢 Prêt pour implémentation
