/**
 * Hook pour gérer le chat IA d'un projet.
 * Chaque projet a sa propre conversation persistée côté serveur.
 */

import {
  clearConversation,
  getProjectConversation,
  streamChatMessage
} from '@/lib/api/project-chat';
import type { AiContextInfo } from '@/types/ai-context';
import { ChatMessage, ProjectChatState } from '@/types/project-chat';
import { useCallback, useState } from 'react';

const INITIAL_STATE: ProjectChatState = {
  conversation: null,
  isLoading: false,
  isSending: false,
  error: null,
  suggestedActions: [],
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
        suggestedActions: [],
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
    async (content: string, context?: AiContextInfo | null) => {
      if (!projectId || !content.trim()) return;

      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        metadata: context ? { context } : undefined,
        created_at: new Date().toISOString(),
      };

      const assistantMessageId = `ai-temp-${Date.now()}`;
      const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          metadata: { actions: [] },
          created_at: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        conversation: prev.conversation
          ? {
              ...prev.conversation,
              messages: [...prev.conversation.messages, userMessage, assistantMessage],
            }
          : {
              id: `local-${projectId}`,
              project_id: projectId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              messages: [userMessage, assistantMessage],
            },
        isSending: true,
        error: null,
      }));

      const updateAssistantMessage = (updater: (msg: ChatMessage) => ChatMessage) => {
          setState((prev) => {
              if (!prev.conversation) return prev;
              const messages = prev.conversation.messages.map(m => 
                  m.id === assistantMessageId ? updater(m) : m
              );
              return {
                  ...prev,
                  conversation: { ...prev.conversation, messages }
              };
          });
      };

      await streamChatMessage(
        projectId, 
        content.trim(), 
        context || undefined,
        (event: any) => {
            if (event.type === 'content') {
                updateAssistantMessage(m => ({ ...m, content: m.content + event.content }));
            } else if (event.type === 'action_start') {
                 updateAssistantMessage(m => {
                     const currentActions = Array.isArray(m.metadata?.actions) ? m.metadata!.actions : [];
                     return { 
                         ...m, 
                         metadata: { 
                             ...m.metadata, 
                             actions: [...currentActions, {
                                 tool: event.tool,
                                 args: event.args,
                                 status: 'pending'
                             }] 
                         } 
                     };
                 });
            } else if (event.type === 'action_result') {
                 updateAssistantMessage(m => {
                     const currentActions = Array.isArray(m.metadata?.actions) ? m.metadata!.actions : [];
                     const newActions = [...currentActions];
                     // Find matching pending action (same tool, pending status)
                     const pendingIndex = newActions.findIndex(a => a.tool === event.tool && a.status === 'pending');
                     
                     if (pendingIndex >= 0) {
                         newActions[pendingIndex] = {
                             ...newActions[pendingIndex],
                             result: event.result,
                             status: 'complete'
                         };
                     } else {
                         newActions.push({
                             tool: event.tool,
                             result: event.result
                         });
                     }

                     return { 
                         ...m, 
                         metadata: { 
                             ...m.metadata, 
                             actions: newActions
                         } 
                     };
                 });
            } else if (event.type === 'done') {
                 updateAssistantMessage(m => ({ ...m, id: event.message_id }));
                 setState(prev => ({ ...prev, isSending: false }));
            } else if (event.type === 'error') {
                setState(prev => ({ ...prev, error: event.error, isSending: false }));
            }
        },
        (err: Error) => {
            setState(prev => ({ 
                ...prev, 
                error: err.message, 
                isSending: false
            }));
        }
      );
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
