/**
 * API client pour le chat IA par projet.
 */

import { Conversation, ChatResponse } from '@/types/project-chat';
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
 * Récupère la conversation d'un projet (ou la crée si elle n'existe pas).
 */
export async function getProjectConversation(projectId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/ai/project-chat/${projectId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch conversation');
  }

  return response.json();
}

/**
 * Envoie un message au chat du projet et reçoit la réponse de l'IA.
 */
export async function sendChatMessage(
  projectId: string,
  content: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/project-chat/${projectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to send message');
  }

  return response.json();
}

/**
 * Efface l'historique de conversation d'un projet.
 */
export async function clearConversation(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ai/project-chat/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to clear conversation');
  }
}
