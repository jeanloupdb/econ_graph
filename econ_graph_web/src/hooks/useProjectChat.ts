/**
 * Hook pour gérer le chat IA d'un projet.
 * Chaque projet a sa propre conversation persistée côté serveur.
 */

import { useCallback, useState } from 'react';
import {
  getProjectConversation,
  sendChatMessage,
  clearConversation,
} from '@/lib/api/project-chat';
import { Conversation, ChatMessage, ProjectChatState } from '@/types/project-chat';

const INITIAL_STATE: ProjectChatState = {
  conversation: null,
  isLoading: false,
  isSending: false,
  error: null,
};

export function useProjectChat(projectId: string | null) {
  const [state, setState] = useState<ProjectChatState>(INITIAL_STATE);

  /**
   * Charge la conversation du projet depuis le serveur.
   */
  const loadConversation = useCallback(async () => {
    if (!projectId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const conversation = await getProjectConversation(projectId);
      setState({
        conversation,
        isLoading: false,
        isSending: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load conversation',
        isLoading: false,
      }));
    }
  }, [projectId]);

  /**
   * Envoie un message au chat et reçoit la réponse de l'IA.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!projectId || !content.trim()) return;

      // Ajouter le message utilisateur de manière optimiste
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        conversation: prev.conversation
          ? {
              ...prev.conversation,
              messages: [...prev.conversation.messages, userMessage],
            }
          : null,
        isSending: true,
        error: null,
      }));

      try {
        const response = await sendChatMessage(projectId, content.trim());

        // Remplacer le message temporaire et ajouter la réponse de l'IA
        setState((prev) => {
          if (!prev.conversation) return prev;

          // Retirer le message temporaire et ajouter le vrai message user + réponse IA
          const messagesWithoutTemp = prev.conversation.messages.filter(
            (m) => !m.id.startsWith('temp-')
          );

          // Le message user est déjà persisté côté serveur, on le recrée avec un vrai ID
          const realUserMessage: ChatMessage = {
            ...userMessage,
            id: `user-${Date.now()}`,
          };

          return {
            ...prev,
            conversation: {
              ...prev.conversation,
              messages: [...messagesWithoutTemp, realUserMessage, response.message],
            },
            isSending: false,
          };
        });

        return response;
      } catch (error) {
        // Retirer le message temporaire en cas d'erreur
        setState((prev) => ({
          ...prev,
          conversation: prev.conversation
            ? {
                ...prev.conversation,
                messages: prev.conversation.messages.filter(
                  (m) => !m.id.startsWith('temp-')
                ),
              }
            : null,
          error: error instanceof Error ? error.message : 'Failed to send message',
          isSending: false,
        }));
        throw error;
      }
    },
    [projectId]
  );

  /**
   * Efface l'historique de conversation.
   */
  const clearHistory = useCallback(async () => {
    if (!projectId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await clearConversation(projectId);
      setState((prev) => ({
        ...prev,
        conversation: prev.conversation
          ? { ...prev.conversation, messages: [] }
          : null,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear conversation',
        isLoading: false,
      }));
    }
  }, [projectId]);

  /**
   * Réinitialise l'état local (sans appel serveur).
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    loadConversation,
    sendMessage,
    clearHistory,
    reset,
  };
}
