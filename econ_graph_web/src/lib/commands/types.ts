/**
 * Command Pattern Types for Undo/Redo System
 * 
 * This implements the Command Pattern where each action stores both
 * the forward action (execute) and the reverse action (undo).
 */

import type { Node, NodeCreate, NodeUpdate } from '@/lib/types';

// ==================== HTTP Action Types ====================

export interface HttpAction {
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload?: unknown;
}

// ==================== Command Types ====================

export type CommandType =
  | 'node_create'
  | 'node_update'
  | 'node_delete'
  | 'edge_create'
  | 'edge_delete'
  | 'scenario_create'
  | 'scenario_update'
  | 'scenario_delete'
  | 'ai_batch';

// ==================== Base Command ====================

export interface BaseCommand {
  id: string;
  timestamp: Date;
  type: CommandType;
  description: string;
  projectId: string;
}

// ==================== Node Commands ====================

export interface NodeCreateCommand extends BaseCommand {
  type: 'node_create';
  data: {
    createdNodeId: string;
    payload: NodeCreate;
  };
}

export interface NodeUpdateCommand extends BaseCommand {
  type: 'node_update';
  data: {
    nodeId: string;
    previousState: Partial<Node>;
    newState: NodeUpdate;
  };
}

export interface NodeDeleteCommand extends BaseCommand {
  type: 'node_delete';
  data: {
    deletedNode: Node;  // Full node data for restoration
  };
}

// ==================== Edge Commands ====================

export interface EdgeCreateCommand extends BaseCommand {
  type: 'edge_create';
  data: {
    createdEdgeId: string;
    source: string;
    target: string;
  };
}

export interface EdgeDeleteCommand extends BaseCommand {
  type: 'edge_delete';
  data: {
    edgeId: string;
    source: string;
    target: string;
  };
}

// ==================== Scenario Commands ====================

export interface ScenarioCreateCommand extends BaseCommand {
  type: 'scenario_create';
  data: {
    createdScenarioId: string;
    name: string;
    overrides?: unknown[];
  };
}

export interface ScenarioUpdateCommand extends BaseCommand {
  type: 'scenario_update';
  data: {
    scenarioId: string;
    previousState: unknown;
    newState: unknown;
  };
}

export interface ScenarioDeleteCommand extends BaseCommand {
  type: 'scenario_delete';
  data: {
    deletedScenario: unknown;  // Full scenario data for restoration
  };
}

// ==================== Batch Command (AI Actions) ====================

export interface BatchCommand extends BaseCommand {
  type: 'ai_batch';
  data: {
    subCommands: Command[];
    aiPrompt?: string;  // Optional: store the prompt that generated this
  };
}

// ==================== Union Type ====================

export type Command =
  | NodeCreateCommand
  | NodeUpdateCommand
  | NodeDeleteCommand
  | EdgeCreateCommand
  | EdgeDeleteCommand
  | ScenarioCreateCommand
  | ScenarioUpdateCommand
  | ScenarioDeleteCommand
  | BatchCommand;

// ==================== Command History State ====================

export interface CommandHistoryState {
  // Command stacks
  undoStack: Command[];
  redoStack: Command[];
  
  // Current project context
  currentProjectId: string | null;
  
  // Loading states
  isProcessing: boolean;
  
  // Computed states
  canUndo: boolean;
  canRedo: boolean;
  
  // Last action info for UI display
  lastUndoDescription: string | null;
  lastRedoDescription: string | null;
}

// ==================== Utility Types ====================

export interface CommandExecutionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

// Helper to generate unique command IDs
export const generateCommandId = (): string => {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};
