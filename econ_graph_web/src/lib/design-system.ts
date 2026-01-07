/**
 * DESIGN SYSTEM - Constantes partagées pour une cohérence visuelle
 * Basé sur DESIGN_SYSTEM.md
 */

// ============================================================================
// GLASSMORPHISM - Effets vitrés
// ============================================================================

export const glass = {
  // Surfaces principales
  surface: "bg-white/70 dark:bg-black/50 backdrop-blur-2xl border border-white/20 dark:border-white/10",
  // Surfaces secondaires (moins opaques)
  surfaceLight: "bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/15 dark:border-white/5",
  // Surfaces interactives
  interactive: "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/30 dark:border-white/15",
} as const;

// ============================================================================
// SHADOWS - Ombres
// ============================================================================

export const shadows = {
  // Ombres par défaut
  default: "shadow-lg",
  // Ombres élevées
  elevated: "shadow-2xl shadow-purple-500/5 dark:shadow-purple-500/10",
  // Ombres pour éléments interactifs
  interactive: "shadow-lg hover:shadow-xl transition-shadow duration-300",
  // Ombres colorées pour modes
  blue: "shadow-lg shadow-blue-500/20",
  purple: "shadow-lg shadow-purple-500/20",
  orange: "shadow-lg shadow-orange-500/20",
} as const;

// ============================================================================
// COLORS - Couleurs sémantiques
// ============================================================================

export const colors = {
  text: {
    primary: "text-zinc-900 dark:text-zinc-100",
    secondary: "text-zinc-600 dark:text-zinc-400",
    tertiary: "text-zinc-500 dark:text-zinc-500",
    muted: "text-zinc-400 dark:text-zinc-600",
  },
  ai: {
    gradient: "bg-gradient-to-r from-purple-500 to-blue-500",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200/50 dark:border-purple-800/50",
    hover: "hover:border-purple-300/70 dark:hover:border-purple-700/70",
  },
  modes: {
    baseline: {
      bg: "bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900",
      text: "text-zinc-900 dark:text-zinc-100",
      border: "border-zinc-200 dark:border-zinc-700",
    },
    scenario: {
      bg: "bg-gradient-to-b from-blue-500 to-blue-600",
      text: "text-white",
      border: "border-blue-400/30",
      shadow: "shadow-lg shadow-blue-500/30",
    },
    comparison: {
      bg: "bg-gradient-to-b from-orange-500 to-orange-600",
      text: "text-white",
      border: "border-orange-400/30",
      shadow: "shadow-lg shadow-orange-500/30",
    },
  },
} as const;

// ============================================================================
// ROUNDED - Border radius
// ============================================================================

export const rounded = {
  sm: "rounded-lg",
  default: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
} as const;

// ============================================================================
// TRANSITIONS - Animations
// ============================================================================

export const transitions = {
  default: "transition-all duration-300",
  fast: "transition-all duration-150",
  slow: "transition-all duration-500",
  colors: "transition-colors duration-200",
} as const;

// ============================================================================
// SPACING - Espacements cohérents
// ============================================================================

export const spacing = {
  containerPadding: "px-4 py-3",
  panelGap: "gap-4",
  elementGap: "gap-2",
} as const;

// ============================================================================
// COMPONENTS - Classes composées pour composants spécifiques
// ============================================================================

export const components = {
  // Container principal de la topbar
  topbar: `${glass.surface} ${shadows.elevated} ${transitions.default}`,
  
  // Container de la barre IA
  aiBar: `${glass.interactive} ${colors.ai.border} ${rounded.lg} ${shadows.default} ${transitions.default}`,
  
  // Container de la sidebar
  sidebar: `${glass.surfaceLight} ${transitions.default}`,
  
  // Boutons primaires
  buttonPrimary: `${glass.interactive} ${rounded.default} ${transitions.default} hover:scale-105 active:scale-95`,
  
  // Boutons secondaires
  buttonSecondary: `${glass.surfaceLight} ${rounded.sm} ${transitions.colors} hover:bg-white/20 dark:hover:bg-white/10`,
  
  // Inputs
  input: `${glass.interactive} ${rounded.full} ${transitions.colors} focus-within:ring-2 focus-within:ring-purple-500/50`,
} as const;




