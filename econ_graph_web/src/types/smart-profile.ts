/**
 * Types pour le Smart Profile utilisateur.
 * Le profil permet de personnaliser les suggestions IA.
 *
 * Structure en 5 étapes :
 * 1. Contexte (profession)
 * 2. Domaines d'intérêt
 * 3. Objectif principal
 * 4. Niveau d'aisance
 * 5. Outils actuels
 */

export interface SmartProfile {
  profession: string[];  // Multi-select (ex: salarié + investisseur)
  interests: string[];
  level: string | null;
  tools: string[];
  completed: boolean;
  created_at: string | null;
}

export interface SmartProfileUpdate {
  profession: string[];  // Multi-select
  interests: string[];
  level: string | null;
  tools: string[];
}

// =============================================================================
// ÉTAPE 1 : CONTEXTE / PROFESSION
// Couleur : Violet/Indigo
// =============================================================================
export const PROFESSION_OPTIONS = [
  { value: 'salarie', label: 'Salarié', icon: 'Building', description: 'Employé dans une entreprise' },
  { value: 'cadre', label: 'Cadre / Manager', icon: 'Users', description: 'Responsable d\'équipe ou département' },
  { value: 'freelance', label: 'Freelance', icon: 'Briefcase', description: 'Indépendant, consultant' },
  { value: 'entrepreneur', label: 'Entrepreneur', icon: 'Rocket', description: 'Fondateur, chef d\'entreprise' },
  { value: 'liberal', label: 'Profession libérale', icon: 'Award', description: 'Médecin, avocat, architecte...' },
  { value: 'investisseur', label: 'Investisseur', icon: 'TrendingUp', description: 'Bourse, immobilier, crypto' },
  { value: 'retraite', label: 'Retraité', icon: 'Sunset', description: 'Gestion de patrimoine, transmission' },
  { value: 'etudiant', label: 'Étudiant', icon: 'GraduationCap', description: 'En formation initiale' },
  { value: 'reconversion', label: 'En reconversion', icon: 'RefreshCw', description: 'Changement de carrière' },
] as const;

// =============================================================================
// ÉTAPE 2 : DOMAINES D'INTÉRÊT
// Couleur : Bleu/Cyan
// =============================================================================
export const INTEREST_OPTIONS = [
  { value: 'finance_perso', label: 'Finance perso', icon: 'Wallet', description: 'Budget, épargne, dépenses' },
  { value: 'business', label: 'Business', icon: 'DollarSign', description: 'Rentabilité, pricing, ventes' },
  { value: 'investissement', label: 'Investissement', icon: 'TrendingUp', description: 'Actions, crypto, placements' },
  { value: 'immobilier', label: 'Immobilier', icon: 'Home', description: 'Achat, location, rendement' },
  { value: 'productivite', label: 'Productivité', icon: 'Clock', description: 'Temps, efficacité, organisation' },
  { value: 'sante', label: 'Santé', icon: 'Heart', description: 'Sport, nutrition, bien-être' },
  { value: 'ecologie', label: 'Écologie', icon: 'Leaf', description: 'Impact carbone, durabilité' },
  { value: 'side_project', label: 'Side-project', icon: 'Sparkles', description: 'Passion, projet personnel' },
] as const;

// =============================================================================
// ÉTAPE 3 : NIVEAU D'AISANCE
// Couleur : Amber/Orange
// =============================================================================
export const LEVEL_OPTIONS = [
  { value: 'debutant', label: 'Débutant', icon: 'Sprout', description: 'Je veux du simple et visuel' },
  { value: 'intermediaire', label: 'Intermédiaire', icon: 'Flower', description: 'Les formules ne me font pas peur' },
  { value: 'avance', label: 'Avancé', icon: 'TreeDeciduous', description: 'J\'aime les modèles complexes' },
] as const;

// =============================================================================
// ÉTAPE 5 : OUTILS ACTUELS
// Couleur : Rose/Pink
// =============================================================================
export const TOOLS_OPTIONS = [
  { value: 'excel', label: 'Excel / Sheets', icon: 'Table', description: 'Tableurs classiques' },
  { value: 'notion', label: 'Notion', icon: 'FileText', description: 'Bases de données Notion' },
  { value: 'apps', label: 'Apps métier', icon: 'Smartphone', description: 'Applications spécialisées' },
  { value: 'mental', label: 'Calcul mental', icon: 'Brain', description: 'De tête ou sur papier' },
  { value: 'aucun', label: 'Aucun', icon: 'Circle', description: 'Je pars de zéro' },
] as const;

// Types dérivés
export type ProfessionValue = typeof PROFESSION_OPTIONS[number]['value'];
export type InterestValue = typeof INTEREST_OPTIONS[number]['value'];
export type LevelValue = typeof LEVEL_OPTIONS[number]['value'];
export type ToolsValue = typeof TOOLS_OPTIONS[number]['value'];

// Configuration des couleurs par étape (4 étapes)
export const STEP_COLORS = {
  profession: {
    primary: 'violet',
    bg: 'bg-violet-500/20',
    border: 'border-violet-500/50',
    ring: 'ring-violet-500/30',
    text: 'text-violet-400',
    iconBg: 'bg-violet-500/30',
    iconText: 'text-violet-300',
    dot: 'bg-violet-500',
    gradient: 'from-violet-600 to-violet-500',
  },
  interests: {
    primary: 'cyan',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/50',
    ring: 'ring-cyan-500/30',
    text: 'text-cyan-400',
    iconBg: 'bg-cyan-500/30',
    iconText: 'text-cyan-300',
    dot: 'bg-cyan-500',
    gradient: 'from-cyan-600 to-cyan-500',
  },
  level: {
    primary: 'emerald',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/50',
    ring: 'ring-emerald-500/30',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/30',
    iconText: 'text-emerald-300',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-600 to-emerald-500',
  },
  tools: {
    primary: 'amber',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    ring: 'ring-amber-500/30',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/30',
    iconText: 'text-amber-300',
    dot: 'bg-amber-500',
    gradient: 'from-amber-600 to-amber-500',
  },
} as const;

export type StepKey = keyof typeof STEP_COLORS;
