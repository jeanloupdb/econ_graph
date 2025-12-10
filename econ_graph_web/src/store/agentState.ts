/**
 * Store Zustand pour gérer l'état du pipeline multi-agents
 */

import { create } from 'zustand';

export type AgentStatus = 'idle' | 'initializing' | 'analyzing' | 'planning' | 'executing' | 'validating' | 'correcting' | 'success' | 'error';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface AgentLog {
  type: 'log' | 'start' | 'complete' | 'error' | 'heartbeat';
  level?: LogLevel;
  message: string;
  step?: string;
  timestamp?: string;
}

export interface AgentTask {
  taskId: string;
  status: AgentStatus;
  currentStep?: string;
  logs: AgentLog[];
  projectId?: string;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

interface AgentState {
  // État actuel
  currentTask: AgentTask | null;
  isAgentRunning: boolean;

  // Actions
  startTask: (taskId: string) => void;
  addLog: (log: AgentLog) => void;
  setStatus: (status: AgentStatus) => void;
  setCurrentStep: (step: string) => void;
  completeTask: (projectId?: string, errorMessage?: string) => void;
  clearTask: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  currentTask: null,
  isAgentRunning: false,

  startTask: (taskId: string) =>
    set({
      currentTask: {
        taskId,
        status: 'initializing',
        logs: [],
        startedAt: new Date(),
      },
      isAgentRunning: true,
    }),

  addLog: (log: AgentLog) =>
    set((state) => {
      if (!state.currentTask) return state;

      return {
        currentTask: {
          ...state.currentTask,
          logs: [...state.currentTask.logs, log],
        },
      };
    }),

  setStatus: (status: AgentStatus) =>
    set((state) => {
      if (!state.currentTask) return state;

      return {
        currentTask: {
          ...state.currentTask,
          status,
        },
      };
    }),

  setCurrentStep: (step: string) =>
    set((state) => {
      if (!state.currentTask) return state;

      return {
        currentTask: {
          ...state.currentTask,
          currentStep: step,
        },
      };
    }),

  completeTask: (projectId?: string, errorMessage?: string) =>
    set((state) => {
      if (!state.currentTask) return state;

      return {
        currentTask: {
          ...state.currentTask,
          status: projectId ? 'success' : 'error',
          projectId,
          errorMessage,
          completedAt: new Date(),
        },
        isAgentRunning: false,
      };
    }),

  clearTask: () =>
    set({
      currentTask: null,
      isAgentRunning: false,
    }),
}));
