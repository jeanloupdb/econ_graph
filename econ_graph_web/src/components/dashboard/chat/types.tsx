/**
 * Types et constantes partagés pour les composants du chat
 */

import { WizardOption, WizardState } from "@/types/wizard";
import {
    BarChart3,
    Brain,
    Briefcase,
    Calculator,
    Check,
    DollarSign,
    Edit,
    GitCompare,
    Home,
    Layers,
    LucideIcon,
    Pencil,
    Sparkles,
    Target,
    TrendingUp,
    Zap
} from "lucide-react";

// Map des icônes Lucide
export const ICON_MAP: Record<string, LucideIcon> = {
  Target, Calculator, Brain, Zap, GitCompare, 
  Briefcase, DollarSign, TrendingUp, BarChart3, Home, Layers,
  Sparkles, Edit, Check, Pencil,
};

// Type pour un message dans le chat
export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: WizardOption[];
  isCurrentQuestion?: boolean;
  isError?: boolean;
  closingRemark?: string;
  modelReady?: boolean;
  draftPrompt?: string;
}

/**
 * Construit les messages depuis l'état du wizard
 */
export function buildMessages(state: WizardState, excludeCurrentIfLoading: boolean): Message[] {
  const msgs: Message[] = [];
  let id = 0;

  // Pour chaque entrée dans l'historique
  for (const entry of state.conversationHistory) {
    // Message assistant (question)
    msgs.push({
      id: `q-${id}`,
      role: "assistant",
      content: entry.question,
    });

    // Message utilisateur (réponse)
    if (entry.userChoice || entry.userFreeform) {
      msgs.push({
        id: `a-${id}`,
        role: "user",
        content: entry.displayText || entry.userFreeform || entry.userChoice || "",
      });
    }
    id++;
  }

  // Ajouter la question courante (sauf si loading et demandé)
  if (state.currentQuestion && !(excludeCurrentIfLoading && state.isLoading)) {
    msgs.push({
      id: `current`,
      role: "assistant",
      content: state.currentQuestion.question,
      options: state.currentQuestion.options,
      isCurrentQuestion: true,
      closingRemark: state.currentQuestion.closing_remark,
      modelReady: state.currentQuestion.is_model_ready,
      draftPrompt: state.currentQuestion.draft_prompt,
    });
  }

  // Si erreur
  if (state.error) {
    msgs.push({
      id: `error-${Date.now()}`,
      role: "assistant",
      content: state.error,
      isError: true,
    });
  }

  return msgs;
}

/**
 * Parse le markdown inline (gras, italique)
 */
export function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
