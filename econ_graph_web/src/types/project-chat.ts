/**
 * Types pour le chat IA par projet.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  context_summary?: string;
  messages: ChatMessage[];
  generation_prompt?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  actions_performed: Array<{
    type: string;
    [key: string]: unknown;
  }>;
  suggested_actions: Array<{
    label: string;
    action: string;
  }>;
}

export interface ProjectChatState {
  conversation: Conversation | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}
