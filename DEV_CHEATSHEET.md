# ⚡ Smart Graph - DEV CHEATSHEET

Guide ultra-rapide pour développer le redesign au quotidien.

---

## 🎨 SHADCN - COMMANDES ESSENTIELLES

### **Installation MCP (Déjà fait ✅)**
```bash
npx shadcn@latest mcp init --client cursor
```

### **Ajouter des composants**

```bash
cd econ_graph_web

# Layouts & Navigation
npx shadcn@latest add resizable       # ResizablePanels (MUST-HAVE)
npx shadcn@latest add command         # Command Palette Cmd+K
npx shadcn@latest add breadcrumb      # Breadcrumbs navigation

# Forms & Controls
npx shadcn@latest add slider          # Range slider (pour overrides)
npx shadcn@latest add form            # Form avec validation
npx shadcn@latest add radio-group     # Radio buttons (déjà installé)
npx shadcn@latest add checkbox        # Checkboxes (déjà installé)

# Data Display
npx shadcn@latest add table           # Tables
npx shadcn@latest add skeleton        # Loading states
npx shadcn@latest add avatar          # User avatars (déjà installé)
npx shadcn@latest add badge           # Labels, tags (déjà installé)

# Feedback
npx shadcn@latest add progress        # Progress bars
npx shadcn@latest add alert           # Alerts, warnings
npx shadcn@latest add toast           # Notifications (sonner déjà installé)

# Tout installer d'un coup
npx shadcn@latest add resizable command slider form table skeleton progress alert
```

### **Voir tous les composants disponibles**
```bash
npx shadcn@latest add --help
```

---

## 🎨 CLASSES TAILWIND FRÉQUENTES

### **Glassmorphism (Signature)**
```tsx
className="
  bg-white/60 dark:bg-black/40
  backdrop-blur-xl
  border border-white/20
  shadow-lg
"
```

### **AI Identity (Purple/Blue)**
```tsx
// Border AI avec gradient
className="
  border-2 border-purple-200 dark:border-purple-800
  bg-gradient-to-br from-purple-50 to-blue-50
  dark:from-purple-950/30 dark:to-blue-950/30
  shadow-purple-500/20
"

// Button AI
className="
  bg-gradient-to-r from-purple-500 to-blue-500
  hover:from-purple-600 hover:to-blue-600
  text-white
  shadow-lg shadow-purple-500/30
"
```

### **Mode Colors**
```tsx
// Baseline (Neutre)
className="bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900"

// Scénarios (Blue)
className="bg-gradient-to-b from-blue-500 to-blue-600 text-white"

// Comparaison (Orange)
className="bg-gradient-to-b from-orange-500 to-orange-600 text-white"
```

### **Node Styles**
```tsx
// Parameter (Orange)
className="
  bg-gradient-to-br from-orange-50 to-amber-50
  dark:from-orange-950/30 dark:to-amber-950/30
  border-2 border-orange-300 dark:border-orange-700
"

// Computed (Blue)
className="
  bg-gradient-to-br from-blue-50 to-indigo-50
  dark:from-blue-950/30 dark:to-indigo-950/30
  border-2 border-blue-300 dark:border-blue-700
"
```

### **Hover & Focus**
```tsx
// Hover standard
className="
  transition-all duration-200
  hover:scale-105 hover:shadow-lg
"

// Focus ring
className="
  focus:ring-2 focus:ring-purple-400/50
  focus:outline-none
"
```

### **Animations**
```tsx
// Pulse (AI)
className="animate-pulse-glow"

// Shimmer (Loading)
className="animate-shimmer"

// Float (Subtle)
className="animate-float"
```

---

## 🧩 PATTERNS SHADCN

### **ResizablePanels (3-column layout)**
```tsx
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={20} minSize={15} collapsible>
    <Sidebar />
  </ResizablePanel>
  
  <ResizableHandle withHandle />
  
  <ResizablePanel defaultSize={60} minSize={30}>
    <MainContent />
  </ResizablePanel>
  
  <ResizableHandle withHandle />
  
  <ResizablePanel defaultSize={20} minSize={15} collapsible>
    <RightPanel />
  </ResizablePanel>
</ResizablePanelGroup>
```

---

### **Command Palette (Cmd+K)**
```tsx
import { Command, CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";

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

<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandGroup heading="Actions">
      <CommandItem onSelect={() => console.log("action")}>
        <Icon className="mr-2 h-4 w-4" />
        <span>Action Name</span>
      </CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

---

### **Dialog avec Form**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Node</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Node name" />
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSubmit}>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### **Accordion (Collapsible sections)**
```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

<Accordion type="multiple" defaultValue={["value"]}>
  <AccordionItem value="value">
    <AccordionTrigger>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>Section Title</span>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      {/* Content here */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### **Tabs**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

### **Slider (pour overrides)**
```tsx
import { Slider } from "@/components/ui/slider";

<Slider
  value={[value]}
  onValueChange={(v) => setValue(v[0])}
  min={0}
  max={100}
  step={1}
  className="[&_[role=slider]]:bg-blue-500"
/>
```

---

### **Skeleton Loading**
```tsx
import { Skeleton } from "@/components/ui/skeleton";

<div className="space-y-2">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

---

### **Alert**
```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong
  </AlertDescription>
</Alert>
```

---

## 🎯 COMPOSANTS CUSTOM RÉUTILISABLES

### **AI Badge**
```tsx
export function AiBadge() {
  return (
    <div className="
      px-2 py-0.5 rounded-full
      bg-gradient-to-r from-purple-500 to-blue-500
      text-white text-xs font-medium
      shadow-lg shadow-purple-500/50
      flex items-center gap-1
      animate-pulse-glow
    ">
      <Sparkles className="h-3 w-3" />
      <span>AI</span>
    </div>
  );
}
```

---

### **Glass Card**
```tsx
export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden",
      "bg-white/60 dark:bg-black/40",
      "backdrop-blur-xl",
      "border border-white/20",
      "shadow-lg",
      className
    )}>
      {children}
    </div>
  );
}
```

---

### **Mode Badge**
```tsx
export function ModeBadge({ mode }: { mode: "baseline" | "scenario" | "comparison" }) {
  const styles = {
    baseline: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
    scenario: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
    comparison: "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
  };

  return (
    <Badge className={cn("text-xs font-bold", styles[mode])}>
      {mode}
    </Badge>
  );
}
```

---

## 🔧 COMMANDES GIT

### **Workflow standard**
```bash
# 1. Créer une branche
git checkout -b redesign/component-name

# 2. Commit atomiques
git add src/components/graph/GraphAiBar.tsx
git commit -m "feat(ui): redesign GraphAiBar with AI-first identity

- Add glassmorphism with backdrop-blur-2xl
- Add purple gradient border on focus
- Add AI icon with pulse animation
- Add suggestions chips
"

# 3. Push
git push origin redesign/component-name

# 4. Pull Request
gh pr create --title "Redesign GraphAiBar" --body "See VISUAL_IDENTITY_GUIDE.md"
```

### **Convention de commit**
```bash
feat(ui):     # Nouveau composant UI
fix(ui):      # Bug fix UI
refactor(ui): # Refactoring (pas de bug fix, pas de feature)
style(ui):    # Formatting, whitespace
perf(ui):     # Performance optimization
```

---

## 🧪 TESTS RAPIDES

### **Visual QA Checklist**
```bash
# Light mode
1. Ouvrir l'app en light mode
2. Vérifier tous les composants
3. Hover states OK
4. Focus states OK

# Dark mode
1. Toggle dark mode (System Preferences)
2. Vérifier tous les composants
3. Hover states OK
4. Focus states OK

# Responsive
1. DevTools > Device Toolbar
2. Tester : iPhone SE, iPad, Desktop
3. Tous les breakpoints OK
```

### **Keyboard Navigation**
```bash
Tab       → Focus suivant
Shift+Tab → Focus précédent
Enter     → Activer
Escape    → Fermer (Dialog, Command Palette)
Cmd+K     → Ouvrir Command Palette
```

### **Performance Check**
```bash
# DevTools > Lighthouse
1. Run Lighthouse
2. Performance > 90 ✅
3. Accessibility = 100 ✅
4. Best Practices > 90 ✅
```

---

## 🎨 COLORS (Copy/Paste)

### **Zinc (Neutral)**
```css
zinc-50:  #fafafa
zinc-100: #f4f4f5
zinc-200: #e4e4e7
zinc-300: #d4d4d8
zinc-400: #a1a1aa
zinc-500: #71717a
zinc-600: #52525b
zinc-700: #3f3f46
zinc-800: #27272a
zinc-900: #18181b
zinc-950: #09090b
```

### **Blue (Data)**
```css
blue-400: #60a5fa
blue-500: #3b82f6
blue-600: #2563eb
```

### **Purple (AI)**
```css
purple-400: #c084fc
purple-500: #a855f7
purple-600: #9333ea
```

### **Orange (Parameters)**
```css
orange-400: #fb923c
orange-500: #f97316
orange-600: #ea580c
```

---

## 🔥 SNIPPETS VS CODE

Créer `.vscode/econ.code-snippets` :

```json
{
  "Glass Card": {
    "prefix": "glass",
    "body": [
      "className=\"",
      "  bg-white/60 dark:bg-black/40",
      "  backdrop-blur-xl",
      "  border border-white/20",
      "  shadow-lg",
      "  rounded-2xl",
      "\""
    ]
  },
  "AI Button": {
    "prefix": "aibutton",
    "body": [
      "<Button",
      "  className=\"",
      "    bg-gradient-to-r from-purple-500 to-blue-500",
      "    hover:from-purple-600 hover:to-blue-600",
      "    text-white shadow-lg shadow-purple-500/30",
      "  \"",
      ">",
      "  <Sparkles className=\"h-4 w-4 mr-2\" />",
      "  ${1:Generate}",
      "</Button>"
    ]
  },
  "AI Badge": {
    "prefix": "aibadge",
    "body": [
      "<div className=\"",
      "  px-2 py-0.5 rounded-full",
      "  bg-gradient-to-r from-purple-500 to-blue-500",
      "  text-white text-xs font-medium",
      "  shadow-lg shadow-purple-500/50",
      "  flex items-center gap-1",
      "\">",
      "  <Sparkles className=\"h-3 w-3\" />",
      "  <span>AI</span>",
      "</div>"
    ]
  }
}
```

---

## 📚 LIENS RAPIDES

### **Documentation**
- [Shadcn UI](https://ui.shadcn.com/)
- [Radix UI (base de Shadcn)](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)

### **Design Inspiration**
- [Vercel Design](https://vercel.com/design)
- [Linear](https://linear.app/)
- [Raycast](https://www.raycast.com/)

### **Outils**
- [Oklch Color Picker](https://oklch.com/)
- [Gradient Generator](https://cssgradient.io/)
- [Easing Functions](https://easings.net/)

---

## 🚀 RACCOURCIS CURSOR

```bash
Cmd+K       → AI Chat
Cmd+Shift+L → Select all occurrences
Cmd+D       → Select next occurrence
Cmd+P       → Quick file open
Cmd+Shift+P → Command palette
Cmd+B       → Toggle sidebar
Cmd+J       → Toggle terminal
```

---

## 🎯 CHECKLIST AVANT COMMIT

```bash
- [ ] Light mode OK ✅
- [ ] Dark mode OK ✅
- [ ] Hover states visibles ✅
- [ ] Focus states visibles ✅
- [ ] Responsive (mobile/tablet/desktop) ✅
- [ ] No console errors ✅
- [ ] TypeScript errors fixed ✅
- [ ] Prettier formatted ✅
```

---

## 💡 TIPS

### **Dark Mode Toggle Quick Test**
```tsx
// Ajouter temporairement pour toggle rapidement
<button onClick={() => document.documentElement.classList.toggle('dark')}>
  Toggle Dark
</button>
```

### **Voir toutes les couleurs Tailwind**
```bash
# Dans DevTools Console
document.querySelectorAll('[class*="bg-"]').forEach(el => {
  console.log(el.className)
})
```

### **Performance Profiling**
```tsx
// React DevTools > Profiler
// Enregistrer une interaction
// Vérifier que les renders sont < 16ms (60 FPS)
```

---

**🎯 Last updated:** 2025-01-06  
**✅ Status:** Ready to use  

**HAPPY CODING! 🚀**




