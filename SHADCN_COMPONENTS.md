# Composants shadcn/ui Disponibles

## Composants de Base

### Button
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default | destructive | outline | secondary | ghost | link">
  Click me
</Button>
```

### Input
```tsx
import { Input } from '@/components/ui/input';

<Input placeholder="..." />
```

### Label
```tsx
import { Label } from '@/components/ui/label';

<Label htmlFor="...">Label text</Label>
```

### Textarea
```tsx
import { Textarea } from '@/components/ui/textarea';

<Textarea placeholder="..." />
```

### Separator
```tsx
import { Separator } from '@/components/ui/separator';

<Separator orientation="horizontal | vertical" />
```

## Composants de Feedback

### Dialog
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      {/* Footer buttons */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Tooltip
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Popover
```tsx
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

<Popover>
  <PopoverTrigger>Click me</PopoverTrigger>
  <PopoverContent>Content here</PopoverContent>
</Popover>
```

### Badge
```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default | secondary | destructive | outline">
  Badge text
</Badge>
```

## Composants de Navigation

### Tabs
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Accordion
```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Title</AccordionTrigger>
    <AccordionContent>Content</AccordionContent>
  </AccordionItem>
</Accordion>
```

### Dropdown Menu
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Composants de Formulaire

### Checkbox
```tsx
import { Checkbox } from '@/components/ui/checkbox';

<Checkbox id="terms" />
```

### Switch
```tsx
import { Switch } from '@/components/ui/switch';

<Switch />
```

### Radio Group
```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

<RadioGroup defaultValue="option1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
</RadioGroup>
```

### Select
```tsx
import { Select } from '@/components/ui/select';

<Select>
  {/* Select items */}
</Select>
```

## Composants Personnalisés

### AiInput
```tsx
import { AiInput } from '@/components/ui/ai-input';

<AiInput
  value={value}
  onChange={setValue}
  onGenerate={handleGenerate}
  isGenerating={isGenerating}
  placeholder="Ask AI..."
  className="..."
/>
```

### CodeEditor
```tsx
import { CodeEditor } from '@/components/ui/code-editor';

<CodeEditor
  value={code}
  onChange={setCode}
  language="python"
  height="400px"
/>
```

### Avatar
```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

<Avatar>
  <AvatarImage src="..." />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>
```

## Composants de Notification

### Sonner (Toast)
```tsx
import { toast } from 'sonner';

// Dans votre code
toast.success('Success message');
toast.error('Error message');
toast.info('Info message');
```

## Bonnes Pratiques

1. **Toujours importer depuis `@/components/ui/`**
2. **Utiliser les variants prédéfinis** (default, outline, ghost, etc.)
3. **Composer les composants** au lieu de créer de nouveaux
4. **Respecter les patterns shadcn** pour la cohérence
5. **Utiliser Tailwind pour le styling** au lieu de CSS custom

## Blocks shadcn/ui à Utiliser

Pour des patterns plus complexes, référencez les blocks officiels :
- **Authentication** : Login/Register forms
- **Dashboard** : Sidebar + Content layouts
- **Forms** : Multi-step forms, settings forms
- **Cards** : Content cards, stat cards
- **Tables** : Data tables avec sorting/filtering
