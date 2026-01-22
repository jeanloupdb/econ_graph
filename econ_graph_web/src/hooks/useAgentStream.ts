/**
 * Hook pour se connecter au stream SSE du pipeline multi-agents
 */

import { API_BASE_URL, apiClient } from "@/lib/api/client";
import {
    useAgentStore,
    type AgentLog,
    type AgentStatus,
} from "@/store/agentState";
import { useEffect, useRef } from "react";

interface UseAgentStreamOptions {
  onComplete?: (projectId?: string, error?: string) => void;
}

export function useAgentStream(
  taskId: string | null,
  options?: UseAgentStreamOptions
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change to avoid useEffect dependency
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!taskId) return;

    const url = `${API_BASE_URL}/ai/agent-status/${taskId}`;

    console.log("[Agent Stream] Connecting to:", url);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    
    // Batching system
    let logBuffer: AgentLog[] = [];
    let flushTimeout: NodeJS.Timeout | null = null;

    const flushLogs = () => {
      if (logBuffer.length > 0) {
        const store = useAgentStore.getState();
        store.addLogs([...logBuffer]);
        logBuffer = [];
      }
      flushTimeout = null;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AgentLog;

        // Ajouter au buffer
        logBuffer.push(data);

        // Planifier le flush si pas déjà fait
        if (!flushTimeout) {
          flushTimeout = setTimeout(flushLogs, 100);
        }

        // Pour les événements critiques, flush immédiat pour garantir la réactivité
        if (data.type === 'start' || data.type === 'complete' || data.step) {
          if (flushTimeout) clearTimeout(flushTimeout);
          flushLogs();

          // Traitement des changements d'état (après le flush des logs)
          const store = useAgentStore.getState();

          // Mettre à jour le statut selon le type de log
          if (data.type === "start") {
            store.setStatus("initializing");
          }
  
          // Détection de l'étape actuelle
          if (data.step) {
            store.setCurrentStep(data.step);
  
            // Mapper les steps aux statuts (pipeline optimisé - plus de planificateur)
            const stepToStatus: Record<string, AgentStatus> = {
              analyste: "analyzing",
              executeur: "executing",
              validateur: "validating",
              correcteur: "correcting",
            };
  
            const status = stepToStatus[data.step];
            if (status) {
              store.setStatus(status);
            }
          }
  
          // Gestion de la complétion
          if (data.type === "complete") {
            const isSuccess = (data as any).status === "success";
            const projectId = (data as any).project_id;
            const errorMessage = isSuccess ? undefined : data.message;
  
            store.completeTask(projectId, errorMessage);
            eventSource.close();
  
            if (optionsRef.current?.onComplete) {
              optionsRef.current.onComplete(projectId, errorMessage);
            }
          }
        }

      } catch (error) {
        console.error("[Agent Stream] Error parsing message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[Agent Stream] Connection error:", error);
      eventSource.close();
    };

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        console.log("[Agent Stream] Closing connection");
        eventSourceRef.current.close();
      }
      if (flushTimeout) {
        clearTimeout(flushTimeout);
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
export async function startAgentProjectCreation(
  prompt: string,
  file?: File
): Promise<string> {
  const formData = new FormData();
  const enhancedPrompt = `${prompt}\n\nIMPORTANT: Pour chaque nœud créé, tu DOIS inclure une description qui donne une définition claire et concise de la notion économique ou mathématique représentée par ce nœud.`;
  formData.append("prompt", enhancedPrompt);
  if (file) {
    formData.append("file", file);
  }

  const response = await apiClient.post<{ task_id: string; message: string }>(
    "/ai/agent-project-create",
    formData
  );

  return response.task_id;
}
