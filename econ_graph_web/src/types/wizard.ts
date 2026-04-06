/**
 * Types pour le système de wizard conversationnel.
 *
 * Le wizard guide l'utilisateur étape par étape pour construire son modèle
 * en posant des questions adaptatives générées par l'IA.
 */

export interface WizardOption {
  label: string;
  value: string;
  description?: string;
  icon?: string;
}

// Les 8 sections canoniques du brief (refonte.md)
export type SectionId = 
  | 'domain'      // Domaine général
  | 'target'      // Cible précise
  | 'scope'       // Périmètre & horizon
  | 'approach'    // Approche de calcul
  | 'variables'   // Variables minimales
  | 'assumptions' // Hypothèses
  | 'detail'      // Niveau de détail
  | 'ready';      // Prêt à générer

export interface WizardQuestion {
  step: number;
  section_id: SectionId;
  question: string;
  options: WizardOption[];
  allow_freeform: boolean;
  freeform_placeholder?: string;
  is_final_step: boolean;
  draft_prompt?: string;  // Prompt en cours de construction
  closing_remark?: string; // Phrase de conclusion personnalisée
  is_model_ready?: boolean;  // True quand le modèle est prêt à générer
}

export interface ConversationTurn {
  step: number;
  section_id: SectionId;
  question: string;
  userChoice?: string;
  userFreeform?: string;
  userChoiceValue?: string;
  userChoiceDescription?: string;
  choiceType?: 'option' | 'freeform' | 'mixed';
  optionsSnapshot?: WizardOption[];
  draftPrompt?: string;
  displayText?: string;
  timestamp: string;
}

export interface WizardAttachment {
  id: string;
  file_name: string;
  file_kind: string;
  mime_type?: string | null;
  size_bytes: number;
  summary: string;
  excerpt?: string | null;
  prompt_hints: string[];
  warnings: string[];
  created_at: string;
}

export interface GraphPreview {
  description: string;
  structure: string;
  nodes_count: number;
  example_nodes?: string[];
  parameters_count?: number;
  computed_count?: number;
  results_count?: number;
}

export interface WizardSummary {
  user_intent: string;
  graph_preview: GraphPreview;
  suggested_scenarios: string[];
  final_prompt: string;
}

export type WizardStep = 'question' | 'summary' | 'creating';

export interface SystemMessage {
  type: 'error' | 'info';
  content: string;
  timestamp: string;
}

export interface WizardState {
  currentStep: WizardStep;
  stepNumber: number;
  conversationHistory: ConversationTurn[];
  attachments: WizardAttachment[];
  currentQuestion: WizardQuestion | null;
  summary: WizardSummary | null;
  isLoading: boolean;
  error: string | null;
  systemMessage?: SystemMessage;
}
