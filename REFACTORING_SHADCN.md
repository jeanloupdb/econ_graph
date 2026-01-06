# Refactoring vers shadcn/ui - NodeEditor

## Objectif
Utiliser EXCLUSIVEMENT les composants shadcn/ui dans le NodeEditor au lieu de composants custom ou HTML natifs.

## Changements effectués

### 1. Remplacement des imports

**Avant:**
```tsx
import { CollapsibleSection } from './SidebarSection';
```

**Après:**
```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
```

### 2. Structure des sections déroulables

**Avant (Custom CollapsibleSection):**
```tsx
<CollapsibleSection title="Informations générales" defaultOpen={true}>
  <div className="space-y-3 pr-4">
    {/* contenu */}
  </div>
</CollapsibleSection>
```

**Après (shadcn Accordion):**
```tsx
<Accordion type="multiple" defaultValue={["info", "code"]} className="w-full">
  <AccordionItem value="info" className="border-b border-white/10 dark:border-white/5">
    <AccordionTrigger className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:no-underline hover:bg-white/5">
      Informations générales
    </AccordionTrigger>
    <AccordionContent className="px-4 pb-4">
      {/* contenu */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### 3. Inputs texte

**Avant (HTML natif):**
```tsx
<input
  type="text"
  value={label}
  onChange={(e) => setLabel(e.target.value)}
  placeholder="Ex: Chiffre d'affaires"
  className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
/>
```

**Après (shadcn Input avec Label):**
```tsx
<div className="space-y-1.5">
  <Label htmlFor="node-label" className="text-xs text-zinc-500 dark:text-zinc-400">
    Nom
  </Label>
  <Input
    id="node-label"
    type="text"
    value={label}
    onChange={(e) => setLabel(e.target.value)}
    placeholder="Ex: Chiffre d'affaires"
    className="h-8 text-xs"
  />
</div>
```

### 4. Textarea

**Avant (HTML natif):**
```tsx
<textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="Ajoutez des notes ou une description..."
  rows={4}
  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
/>
```

**Après (shadcn Textarea):**
```tsx
<Textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="Ajoutez des notes ou une description..."
  rows={4}
  className="text-xs resize-none"
/>
```

### 5. Boutons

**Avant (HTML natif):**
```tsx
<button
  onClick={() => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié');
  }}
  className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
>
  Copier
</button>
```

**Après (shadcn Button):**
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié');
  }}
  className="h-auto py-0 px-2 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-transparent"
>
  Copier
</Button>
```

## Avantages de la refactorisation

### 1. **Cohérence du design**
- Tous les composants utilisent le même système de design
- Variantes prédéfinies (ghost, outline, default, etc.)
- Styles uniformes pour dark/light mode

### 2. **Accessibilité**
- Composants shadcn/ui basés sur Radix UI (accessible par défaut)
- Labels associés aux inputs via `htmlFor`
- Focus management automatique dans Accordion
- Support complet du clavier

### 3. **Maintenabilité**
- Moins de code CSS custom à maintenir
- Comportements standardisés (hover, focus, disabled)
- Facile à mettre à jour (modification centralisée dans `/components/ui`)

### 4. **Type safety**
- Props TypeScript complètes et documentées
- Erreurs de compilation si mauvaise utilisation
- Autocomplete dans l'IDE

### 5. **Accordion vs CollapsibleSection**
- `type="multiple"` permet d'ouvrir plusieurs sections simultanément
- `defaultValue` accepte un array de valeurs pour pré-ouvrir certaines sections
- Animation fluide intégrée
- État géré automatiquement par Radix UI

## Structure finale du NodeEditor

```
NodeEditor
├── Header (avec icône + titre)
├── Body
│   ├── Chat History (si applicable)
│   ├── Error Section (si erreur)
│   └── Accordion (type="multiple")
│       ├── AccordionItem "info" (Informations générales)
│       │   ├── Input (Nom)
│       │   ├── Code (auto-généré)
│       │   └── Input (Unité)
│       ├── AccordionItem "notes" (Notes)
│       │   └── Textarea
│       ├── AccordionItem "code" (Code Python)
│       │   └── Textarea (editable)
│       └── AccordionItem "dependencies" (Dépendances)
│           └── Liste des variables utilisées
└── Footer
    ├── AiInput (Assistant IA)
    └── Action Buttons (Annuler/Créer-Enregistrer)
```

## Composants shadcn/ui utilisés

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `Accordion` | `@/components/ui/accordion` | Sections déroulables multiples |
| `AccordionItem` | `@/components/ui/accordion` | Item individuel dans l'accordéon |
| `AccordionTrigger` | `@/components/ui/accordion` | Bouton pour ouvrir/fermer une section |
| `AccordionContent` | `@/components/ui/accordion` | Contenu de la section |
| `Input` | `@/components/ui/input` | Champs texte (Nom, Unité) |
| `Label` | `@/components/ui/label` | Labels accessibles pour les inputs |
| `Textarea` | `@/components/ui/textarea` | Zone de texte multi-lignes (Notes, Code) |
| `Button` | `@/components/ui/button` | Tous les boutons (Copier, Annuler, Créer) |
| `AiInput` | `@/components/ui/ai-input` | Input IA custom (déjà shadcn-compliant) |

## Prochaines étapes

Pour continuer la migration vers shadcn/ui sur d'autres composants:

1. **ApiNodeEditor** - Remplacer CollapsibleSection par Accordion
2. **Inspector** - Vérifier l'utilisation de composants shadcn
3. **ScenarioPanel** - Unifier avec Accordion si nécessaire
4. **LibraryPanel** - Vérifier cohérence avec le reste

## Bonnes pratiques shadcn/ui

1. **Toujours utiliser les variants** au lieu de styles custom
2. **Composer les composants** plutôt que créer des custom
3. **Utiliser className** pour les ajustements mineurs (tailles, espacements)
4. **Préférer les composants shadcn** même pour des cas simples
5. **Consulter la doc** avant de créer un nouveau composant
