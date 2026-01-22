/**
 * API client pour le wizard conversationnel.
 */

import { ConversationTurn, WizardQuestion, WizardState, WizardSummary } from '@/types/wizard';
import { API_BASE_URL } from './client';

/**
 * Récupère le token d'authentification depuis localStorage.
 */
function getAuthHeader(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Récupère la question initiale du wizard.
 */
export async function getInitialQuestion(): Promise<WizardQuestion> {
  const response = await fetch(`${API_BASE_URL}/ai/wizard-initial-question`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch initial question');
  }

  return response.json();
}

/**
 * Génère la prochaine question du wizard basée sur l'historique conversationnel.
 */
export async function getNextQuestion(
  conversationHistory: ConversationTurn[]
): Promise<WizardQuestion> {
  const response = await fetch(`${API_BASE_URL}/ai/conversational-wizard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate next question');
  }

  return response.json();
}

/**
 * Finalise le wizard et génère le résumé + prompt optimisé.
 */
export async function finalizeWizard(
  conversationHistory: ConversationTurn[]
): Promise<WizardSummary> {
  const response = await fetch(`${API_BASE_URL}/ai/wizard-finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to finalize wizard');
  }

  return response.json();
}

/**
 * Crée le projet avec le prompt final du wizard.
 */
export async function createProjectFromWizard(finalPrompt: string): Promise<{
  task_id: string;
  message: string;
}> {
  const formData = new FormData();
  formData.append('prompt', finalPrompt);

  const response = await fetch(`${API_BASE_URL}/ai/agent-project-create`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to create project');
  }

  return response.json();
}

/**
 * Sauvegarde l'état du wizard sur le profil utilisateur.
 */
export async function saveUserWizardState(wizardState: WizardState | null): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/me/wizard_state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ wizard_state: wizardState }),
  });

  if (!response.ok) {
    throw new Error('Failed to save wizard state');
  }
}

/**
 * Charge l'état du wizard depuis le profil utilisateur.
 */
export async function loadUserWizardState(): Promise<WizardState | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load user profile');
  }

  const user = await response.json();
  return user.wizard_state || null;
}
