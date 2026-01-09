# 🎨 Smart Graph - SHADCN LAYOUTS SYSTEM

## 🎯 PHILOSOPHIE

**"Shadcn-First, Composition Over Configuration"**

- ✅ Utiliser les composants Shadcn au maximum
- ✅ Composer des layouts complexes avec des primitives simples
- ✅ Exploiter Radix UI (base de Shadcn) pour l'accessibilité
- ✅ Patterns réutilisables et cohérents

---

## 📦 COMPOSANTS SHADCN DISPONIBLES

### **✅ Déjà installés**

```bash
accordion         # Collapsible sections
avatar            # User profile images
badge             # Labels, tags, status indicators
button            # Primary actions
card              # Content containers
checkbox          # Multi-select
collapsible       # Expandable sections
dialog            # Modals, confirmations
drawer            # Side panels (mobile-friendly)
dropdown-menu     # Contextual actions
input             # Text input
label             # Form labels
popover           # Floating contextual content
radio-group       # Single choice
scroll-area       # Custom scrollbars
select            # Dropdowns
separator         # Visual dividers
switch            # Toggle on/off
tabs              # Content switcher
textarea          # Multi-line input
tooltip           # Hover hints
```

### **🔧 À ajouter (Recommandés)**

```bash
# Layouts avancés
npx shadcn@latest add resizable

# Navigation
npx shadcn@latest add command
npx shadcn@latest add breadcrumb

# Forms
npx shadcn@latest add slider
npx shadcn@latest add form

# Data Display
npx shadcn@latest add table
npx shadcn@latest add skeleton

# Feedback
npx shadcn@latest add progress
npx shadcn@latest add alert
```

---

## 🏗️ ARCHITECTURE DE LAYOUTS

### **Pattern 1 : ResizablePanels (Recommandé) ⭐⭐⭐**

**Usage :** Graph Editor, Dashboard avec sidebars

```tsx
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export function GraphEditorLayout() {
  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Topbar */}
      <Topbar />

      {/* Resizable Main Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar (Collapsible) */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          collapsible
          collapsedSize={4}
        >
          <MenuSidebar />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Canvas */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <GraphCanvas />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel (Inspector/Scenario) */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={35}
          collapsible
        >
          <Inspector />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

**Avantages :**
- ✅ User-controlled sizing
- ✅ Persistent state (localStorage)
- ✅ Collapsible panels
- ✅ Touch-friendly
- ✅ Keyboard navigation

---

### **Pattern 2 : Tabs pour Multi-Vues**

**Usage :** Différentes vues d'une même page

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ScenarioPanel() {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="parameters" className="flex-1 flex flex-col">
        {/* Tab Headers */}
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
          <TabsTrigger
            value="parameters"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
          >
            Parameters
          </TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <ScrollArea className="flex-1 p-4">
          <TabsContent value="parameters">
            <ParametersList />
          </TabsContent>
          <TabsContent value="overrides">
            <OverridesList />
          </TabsContent>
          <TabsContent value="results">
            <ResultsGrid />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
```

---

### **Pattern 3 : Command Palette (Navigation Rapide) ⭐⭐⭐**

**Usage :** Navigation globale Cmd+K

```tsx
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="AI Actions">
          <CommandItem>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Ask AI</span>
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Wand2 className="mr-2 h-4 w-4" />
            <span>Smart Fix All</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => router.push("/dashboard")}>
            <Network className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => router.push("/graph")}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>Graph Editor</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Nodes">
          {nodes.map((node) => (
            <CommandItem
              key={node.id}
              onSelect={() => selectNode(node.id)}
            >
              <Box className="mr-2 h-4 w-4" />
              <span>{node.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

const CommandShortcut = ({
  children,
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className="ml-auto text-xs tracking-widest text-muted-foreground">
      {children}
    </span>
  );
};
```

---

### **Pattern 4 : Drawer pour Mobile ⭐**

**Usage :** Sidebars sur mobile

```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ResponsiveSidebar() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <MenuContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return <MenuSidebar />;
}
```

---

### **Pattern 5 : Collapsible Sections (Accordion) ⭐**

**Usage :** Inspector, Settings

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function Inspector() {
  return (
    <ScrollArea className="h-full">
      <Accordion type="multiple" defaultValue={["value", "algorithm"]}>
        {/* Value Section */}
        <AccordionItem value="value">
          <AccordionTrigger className="px-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span>Value</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ValueCard />
          </AccordionContent>
        </AccordionItem>

        {/* Algorithm Section */}
        <AccordionItem value="algorithm">
          <AccordionTrigger className="px-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              <span>Algorithm</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <AlgorithmBlock />
          </AccordionContent>
        </AccordionItem>

        {/* Dependencies */}
        <AccordionItem value="dependencies">
          <AccordionTrigger className="px-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span>Dependencies</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <DependenciesList />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ScrollArea>
  );
}
```

---

## 🎯 TEMPLATES PRÊTS À L'EMPLOI

### **Template 1 : Graph Editor (3 Panels)**

```tsx
// /app/(protected)/graph/layout.tsx
export default function GraphLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Topbar Glass */}
      <div className="fixed top-2 left-2 right-2 z-50">
        <Topbar />
      </div>

      {/* Main Content with padding for topbar */}
      <div className="flex-1 pt-[4.5rem]">
        <ResizablePanelGroup direction="horizontal">
          {/* Left: Menu Sidebar */}
          <ResizablePanel
            defaultSize={18}
            minSize={12}
            maxSize={25}
            collapsible
            collapsedSize={4}
            className="min-w-[50px]"
          >
            <div className="h-full p-2 pl-4">
              <div className="h-full rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 overflow-hidden">
                <MenuSidebar />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="w-1 bg-transparent" />

          {/* Center: Canvas */}
          <ResizablePanel defaultSize={62} minSize={30}>
            <div className="h-full p-2">
              {children}
              <GraphAiBar />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="w-1 bg-transparent" />

          {/* Right: Inspector/Scenario */}
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={35}
            collapsible
          >
            <div className="h-full p-2 pr-4">
              <div className="h-full rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 overflow-hidden">
                <Inspector />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
```

---

### **Template 2 : Dashboard (Grid + Sidebar)**

```tsx
export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <SubtleBackground variant="blue" />

      <div className="relative z-10">
        {/* Topbar */}
        <ProtectedTopbar />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Header Card */}
          <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Network className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Projects</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage your economic models
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* AI Magic Bar */}
          <AiMagicBar />

          {/* Tabs: Grid vs List */}
          <Tabs defaultValue="grid">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="grid">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="list">
                  <LayoutList className="h-4 w-4 mr-2" />
                  List
                </TabsTrigger>
              </TabsList>

              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>

            <TabsContent value="grid">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list">
              <Card>
                <Table>
                  {/* Table content */}
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
```

---

### **Template 3 : Modal/Dialog Patterns**

#### **A. Confirmation Dialog**

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Delete Node?</DialogTitle>
      <DialogDescription>
        This action cannot be undone. This will permanently delete the node
        and all its connections.
      </DialogDescription>
    </DialogHeader>

    <DialogFooter className="gap-2">
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### **B. Form Dialog**

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-xl">
    <DialogHeader>
      <DialogTitle>Create Node</DialogTitle>
      <DialogDescription>
        Add a new node to your graph
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input id="label" placeholder="Revenue" />
      </div>

      {/* Unit */}
      <div className="space-y-2">
        <Label htmlFor="unit">Unit</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eur">€</SelectItem>
            <SelectItem value="usd">$</SelectItem>
            <SelectItem value="percent">%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Value */}
      <div className="space-y-2">
        <Label htmlFor="value">Initial Value</Label>
        <Input id="value" type="number" placeholder="10000" />
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleCreate}>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### **C. Large Content Dialog (with ScrollArea)**

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
    <DialogHeader>
      <DialogTitle>Smart Fix</DialogTitle>
      <DialogDescription>
        AI-powered error correction
      </DialogDescription>
    </DialogHeader>

    <ScrollArea className="flex-1 pr-4">
      {/* Long content here */}
      <div className="space-y-4 py-4">
        {/* Error Display */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>

        {/* AI Fix */}
        {fixData && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Recommended Fix</AlertTitle>
            <AlertDescription>{fixData.explanation}</AlertDescription>
          </Alert>
        )}

        {/* Code Display */}
        <CodeEditor value={fixData?.corrected_code} readOnly />
      </div>
    </ScrollArea>

    <DialogFooter className="border-t pt-4">
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleApply}>Apply Fix</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎨 COMPOSANTS COMPOSÉS

### **Sidebar Pattern (Shadcn-style)**

```tsx
// components/ui/sidebar.tsx
export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-2">
      <ScrollArea className="flex-1 px-4">
        {children}
      </ScrollArea>
    </div>
  );
}

export function SidebarSection({
  title,
  children,
  icon,
  action,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen className="group py-2">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-0 hover:bg-transparent"
          >
            {icon}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {title}
            </span>
          </Button>
        </CollapsibleTrigger>
        {action}
      </div>
      <CollapsibleContent className="mt-2 space-y-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SidebarItem({
  label,
  value,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  value?: string | number;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {value !== undefined && (
        <span className="text-xs text-muted-foreground shrink-0">
          {value}
        </span>
      )}
    </button>
  );
}
```

**Usage:**

```tsx
<Sidebar>
  <SidebarSection title="Parameters" icon={<Settings className="h-4 w-4" />}>
    <SidebarItem label="Revenue" value="10k €" icon={<DollarSign className="h-3 w-3" />} />
    <SidebarItem label="Cost" value="8k €" />
  </SidebarSection>

  <SidebarSection
    title="Results"
    icon={<TrendingUp className="h-4 w-4" />}
    action={
      <Button size="icon" variant="ghost" className="h-6 w-6">
        <Plus className="h-3 w-3" />
      </Button>
    }
  >
    <SidebarItem label="Profit" value="2k €" isActive />
  </SidebarSection>
</Sidebar>
```

---

## 🎯 FORMS AVEC SHADCN

### **Pattern : Form avec Validation**

```bash
# Installer react-hook-form + zod
pnpm add react-hook-form @hookform/resolvers zod

# Ajouter le composant form
npx shadcn@latest add form
```

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  label: z.string().min(2, "Label must be at least 2 characters"),
  unit: z.string().optional(),
  value: z.number().min(0, "Value must be positive"),
});

export function NodeCreationForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      unit: "",
      value: 0,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input placeholder="Revenue" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this node
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="eur">€</SelectItem>
                  <SelectItem value="usd">$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Value</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Create Node
        </Button>
      </form>
    </Form>
  );
}
```

---

## 🎯 DATA DISPLAY PATTERNS

### **Pattern : Slider pour Overrides**

```bash
npx shadcn@latest add slider
```

```tsx
import { Slider } from "@/components/ui/slider";

export function ParameterOverrideCard({ node }) {
  const [value, setValue] = useState([node.value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{node.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Value Display */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Value</span>
          <span className="text-lg font-bold">
            {value[0]} {node.unit}
          </span>
        </div>

        {/* Slider */}
        <Slider
          value={value}
          onValueChange={setValue}
          min={node.min}
          max={node.max}
          step={node.step}
          className="[&_[role=slider]]:bg-blue-500"
        />

        {/* Min/Max Labels */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{node.min}</span>
          <span>{node.max}</span>
        </div>

        {/* Diff Display */}
        {value[0] !== node.baselineValue && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Change:</span>
            <Badge variant={value[0] > node.baselineValue ? "success" : "destructive"}>
              {value[0] > node.baselineValue ? "+" : ""}
              {value[0] - node.baselineValue}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 🎨 LOADING & SKELETON STATES

```bash
npx shadcn@latest add skeleton
```

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-8 w-full" />
      </CardFooter>
    </Card>
  );
}

// Usage with loading state
{isLoading ? (
  <div className="grid grid-cols-3 gap-4">
    {Array(6).fill(0).map((_, i) => (
      <ProjectCardSkeleton key={i} />
    ))}
  </div>
) : (
  <div className="grid grid-cols-3 gap-4">
    {projects.map((project) => (
      <ProjectCard key={project.id} project={project} />
    ))}
  </div>
)}
```

---

## 🎯 FEEDBACK PATTERNS

### **Toast Notifications (Sonner)**

```tsx
import { toast } from "sonner";

// Success
toast.success("Node created", {
  description: "Your node has been added to the graph",
});

// Error
toast.error("Failed to save", {
  description: "Please try again later",
});

// Loading
const toastId = toast.loading("Generating with AI...");

// Update toast
setTimeout(() => {
  toast.success("Generated!", { id: toastId });
}, 2000);

// Custom toast with action
toast("Node deleted", {
  action: {
    label: "Undo",
    onClick: () => console.log("Undo"),
  },
});
```

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### **Phase 1 : Installer les composants manquants**

```bash
cd econ_graph_web

# Layouts
npx shadcn@latest add resizable

# Navigation
npx shadcn@latest add command
npx shadcn@latest add breadcrumb

# Forms
npx shadcn@latest add slider
npx shadcn@latest add form

# Data Display
npx shadcn@latest add table
npx shadcn@latest add skeleton

# Feedback
npx shadcn@latest add progress
npx shadcn@latest add alert
```

### **Phase 2 : Refactoriser les layouts existants**

- [ ] `GraphLayout` → Utiliser `ResizablePanels`
- [ ] `DashboardLayout` → Utiliser `Tabs` pour Grid/List
- [ ] `MenuSidebar` → Utiliser `Collapsible` sections
- [ ] `Inspector` → Utiliser `Accordion`
- [ ] Créer `CommandPalette` (Cmd+K)

### **Phase 3 : Unifier les patterns**

- [ ] Tous les Dialogs utilisent le même footer pattern
- [ ] Tous les Forms utilisent react-hook-form + zod
- [ ] Tous les loading states utilisent Skeleton
- [ ] Tous les feedbacks utilisent toast

---

## 🚀 EXEMPLE COMPLET : Refactoriser Graph Editor

**Avant (Custom):**
```tsx
// Trop de custom CSS, difficile à maintenir
<div className="fixed top-0 left-0 right-0 h-screen flex">
  <div className="w-[300px] bg-white dark:bg-zinc-900 border-r">
    <MenuSidebar />
  </div>
  <div className="flex-1">
    <GraphCanvas />
  </div>
  <div className="w-[400px] bg-white dark:bg-zinc-900 border-l">
    <Inspector />
  </div>
</div>
```

**Après (Shadcn):**
```tsx
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

<div className="h-screen flex flex-col">
  <Topbar />
  
  <ResizablePanelGroup direction="horizontal" className="flex-1">
    <ResizablePanel defaultSize={20} minSize={15} collapsible>
      <ScrollArea className="h-full">
        <MenuSidebar />
      </ScrollArea>
    </ResizablePanel>

    <ResizableHandle withHandle />

    <ResizablePanel defaultSize={60} minSize={30}>
      <GraphCanvas />
    </ResizablePanel>

    <ResizableHandle withHandle />

    <ResizablePanel defaultSize={20} minSize={15} collapsible>
      <ScrollArea className="h-full">
        <Inspector />
      </ScrollArea>
    </ResizablePanel>
  </ResizablePanelGroup>
</div>
```

**Bénéfices :**
- ✅ User-controlled resize
- ✅ Persistence automatique
- ✅ Collapsible panels
- ✅ Moins de CSS custom
- ✅ Mieux accessible (keyboard nav)

---

**📅 Date de création :** 2025-01-06  
**✅ Statut :** Ready for Implementation  
**🎯 Next :** Installer les composants & refactoriser





