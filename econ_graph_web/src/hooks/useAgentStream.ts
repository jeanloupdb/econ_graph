/**
 * Hook pour se connecter au stream SSE du pipeline multi-agents
 */

import { API_BASE_URL, apiClient } from '@/lib/api/client';
import { useAgentStore, type AgentLog, type AgentStatus } from '@/store/agentState';
import { useEffect, useRef } from 'react';

interface UseAgentStreamOptions {
  onComplete?: (projectId?: string, error?: string) => void;
}

export function useAgentStream(taskId: string | null, options?: UseAgentStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change to avoid useEffect dependency
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!taskId) return;

    const url = `${API_BASE_URL}/ai/agent-status/${taskId}`;

    console.log('[Agent Stream] Connecting to:', url);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AgentLog;

        console.log('[Agent Stream] Received:', data);

        // Access store directly without hooks to avoid re-render issues
        const store = useAgentStore.getState();

        // Ajouter le log
        store.addLog(data);

        // Mettre à jour le statut selon le type de log
        if (data.type === 'start') {
          store.setStatus('initializing');
        }

        // Détection de l'étape actuelle
        if (data.step) {
          store.setCurrentStep(data.step);

          // Mapper les steps aux statuts
          const stepToStatus: Record<string, AgentStatus> = {
            'analyste': 'analyzing',
            'planificateur': 'planning',
            'executeur': 'executing',
            'validateur': 'validating',
            'correcteur': 'correcting',
          };

          const status = stepToStatus[data.step];
          if (status) {
            store.setStatus(status);
          }
        }

        // Gestion de la complétion
        if (data.type === 'complete') {
          const isSuccess = (data as any).status === 'success';
          const projectId = (data as any).project_id;
          const errorMessage = isSuccess ? undefined : data.message;

          store.completeTask(projectId, errorMessage);
          eventSource.close();

          if (optionsRef.current?.onComplete) {
            optionsRef.current.onComplete(projectId, errorMessage);
          }
        }

      } catch (error) {
        console.error('[Agent Stream] Error parsing message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[Agent Stream] Connection error:', error);
      eventSource.close();
    };

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        console.log('[Agent Stream] Closing connection');
        eventSourceRef.current.close();
      }
    };
  }, [taskId]);

  return {
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    },
  };
}

/**
 * Hook pour initier la création d'un projet via le pipeline multi-agents
 */
export async function startAgentProjectCreation(prompt: string, file?: File): Promise<string> {
  const formData = new FormData();
  const enhancedPrompt = `${prompt}\n\nIMPORTANT: Pour chaque nœud créé, tu DOIS inclure une description qui donne une définition claire et concise de la notion économique ou mathématique représentée par ce nœud.`;
  formData.append('prompt', enhancedPrompt);
  if (file) {
    formData.append('file', file);
  }

  const response = await apiClient.post<{ task_id: string; message: string }>(
    '/ai/agent-project-create',
    formData
  );

  return response.task_id;
}
