/**
 * Types pour le Smart Profile utilisateur.
 * Le profil permet de personnaliser les suggestions IA.
 */

export interface SmartProfile {
  profession: string | null;
  interests: string[];
  concrete_example: string | null;
  completed: boolean;
  created_at: string | null;
}

export interface SmartProfileUpdate {
  profession: string | null;
  interests: string[];
  concrete_example: string | null;
}

// Options disponibles pour le questionnaire de profil
export const PROFESSION_OPTIONS = [
  { value: 'freelance', label: 'Freelance / Indépendant', icon: 'Briefcase', description: 'Consultant, prestataire, auto-entrepreneur' },
  { value: 'salarie', label: 'Salarié', icon: 'Building', description: 'Employé dans une entreprise' },
  { value: 'entrepreneur', label: 'Entrepreneur', icon: 'Rocket', description: "Chef d'entreprise, fondateur" },
  { value: 'investisseur', label: 'Investisseur', icon: 'TrendingUp', description: 'Immobilier, bourse, crypto...' },
  { value: 'etudiant', label: 'Étudiant', icon: 'GraduationCap', description: 'En formation ou reconversion' },
  { value: 'autre', label: 'Autre', icon: 'User', description: 'Curieux, passionné...' },
] as const;

export const INTEREST_OPTIONS = [
  { value: 'finance_perso', label: 'Finances personnelles', icon: 'Wallet', description: 'Budget, épargne, dépenses' },
  { value: 'business', label: 'Business', icon: 'DollarSign', description: 'Rentabilité, pricing, ventes' },
  { value: 'productivite', label: 'Productivité', icon: 'Clock', description: 'Temps, efficacité, organisation' },
  { value: 'investissement', label: 'Investissement', icon: 'TrendingUp', description: 'Actions, crypto, placements' },
  { value: 'immobilier', label: 'Immobilier', icon: 'Home', description: 'Achat, location, rendement' },
  { value: 'sante', label: 'Santé & Bien-être', icon: 'Heart', description: 'Sport, nutrition, sommeil' },
] as const;

export type ProfessionValue = typeof PROFESSION_OPTIONS[number]['value'];
export type InterestValue = typeof INTEREST_OPTIONS[number]['value'];
