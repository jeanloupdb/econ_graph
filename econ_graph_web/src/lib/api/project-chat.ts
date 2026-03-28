/**
 * API client pour le chat IA par projet.
 */

import type { AiContextInfo } from '@/types/ai-context';
import { ChatResponse, Conversation } from '@/types/project-chat';
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
  content: string,
  context?: AiContextInfo
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/project-chat/${projectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ content, context }),
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

/**
 * Envoie un message au chat du projet et consomme le flux SSE.
 */
export async function streamChatMessage(
  projectId: string,
  content: string,
  context: AiContextInfo | undefined,
  onEvent: (event: any) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/project-chat/${projectId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ content, context }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to send message');
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data);
          } catch (e) {
            console.warn('Failed to parse SSE event', line);
          }
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Stream failed'));
  }
}
