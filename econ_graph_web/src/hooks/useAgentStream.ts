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
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isActiveRef = useRef(true);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update options ref when options change to avoid useEffect dependency
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!taskId) return;

    const url = `${API_BASE_URL}/ai/agent-status/${taskId}`;

    isActiveRef.current = true;
    retryCountRef.current = 0;

    const connect = () => {
      if (!isActiveRef.current) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log("[Agent Stream] Connecting to:", url);
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // Batching system
      let logBuffer: AgentLog[] = [];

      const stepToStatus: Record<string, AgentStatus> = {
        analyste: "analyzing",
        executeur: "executing",
        validateur: "validating",
        correcteur: "correcting",
      };

      const flushLogs = () => {
        if (logBuffer.length > 0) {
          const store = useAgentStore.getState();
          store.addLogs([...logBuffer]);
          logBuffer = [];
        }
        flushTimeoutRef.current = null;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AgentLog;

          // Ajouter au buffer
          logBuffer.push(data);

          // Reset retry on valid message
          retryCountRef.current = 0;

          // Pour les événements critiques, flush immédiat en un seul set() atomique
          if (data.type === 'start' || data.type === 'complete' || data.step) {
            if (flushTimeoutRef.current) {
              clearTimeout(flushTimeoutRef.current);
              flushTimeoutRef.current = null;
            }

            const store = useAgentStore.getState();
            const pendingLogs = logBuffer.length > 0 ? [...logBuffer] : undefined;
            logBuffer = [];

            if (data.type === "complete") {
              // For completion, flush logs first then complete (avoids extra set calls)
              if (pendingLogs) store.addLogs(pendingLogs);
              const isSuccess = (data as any).status === "success";
              const projectId = (data as any).project_id;
              const errorMessage = isSuccess ? undefined : data.message;
              store.completeTask(projectId, errorMessage);
              eventSource.close();
              if (optionsRef.current?.onComplete) {
                optionsRef.current.onComplete(projectId, errorMessage);
              }
            } else {
              // Merge logs + status + step into a single set() call
              const status: AgentStatus | undefined =
                data.type === "start"
                  ? "initializing"
                  : data.step
                  ? stepToStatus[data.step]
                  : undefined;

              store.batchUpdate({
                newLogs: pendingLogs,
                status,
                step: data.step,
              });
            }
          } else {
            // Planifier le flush si pas déjà fait
            if (!flushTimeoutRef.current) {
              flushTimeoutRef.current = setTimeout(flushLogs, 100);
            }
          }

        } catch (error) {
          console.error("[Agent Stream] Error parsing message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("[Agent Stream] Connection error:", error);
        eventSource.close();

        if (!isActiveRef.current) return;
        const retryCount = retryCountRef.current + 1;
        retryCountRef.current = retryCount;

        if (retryCount > 5) {
          return;
        }

        const baseDelay = Math.min(1000 * 2 ** (retryCount - 1), 8000);
        const jitter = Math.floor(Math.random() * 400);
        const delay = baseDelay + jitter;

        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        retryTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    // Cleanup
    return () => {
      isActiveRef.current = false;
      if (eventSourceRef.current) {
        console.log("[Agent Stream] Closing connection");
        eventSourceRef.current.close();
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
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
