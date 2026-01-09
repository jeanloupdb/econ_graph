/**
 * Command Builders - Factory functions to create commands
 * 
 * These functions create properly structured commands that can be
 * pushed to the command history store.
 */

import type { Node, NodeCreate, NodeUpdate } from '@/lib/types';
import {
  generateCommandId,
  type Command,
  type NodeCreateCommand,
  type NodeUpdateCommand,
  type NodeDeleteCommand,
  type BatchCommand,
} from './types';

// ==================== Node Command Builders ====================

/**
 * Create a command for node creation
 * Call this AFTER the node has been created successfully
 */
export function buildNodeCreateCommand(
  projectId: string,
  createdNodeId: string,
  payload: NodeCreate,
  label?: string
): NodeCreateCommand {
  return {
    id: generateCommandId(),
    timestamp: new Date(),
    type: 'node_create',
    description: `Création du nœud "${label || payload.label || 'Nouveau nœud'}"`,
    projectId,
    data: {
      createdNodeId,
      payload,
    },
  };
}

/**
 * Create a command for node update
 * Call this BEFORE updating the node, passing the current state
 */
export function buildNodeUpdateCommand(
  projectId: string,
  nodeId: string,
  previousState: Partial<Node>,
  newState: NodeUpdate,
  label?: string
): NodeUpdateCommand {
  // Build a human-readable description of what changed
  const changes: string[] = [];
  
  if (newState.label !== undefined && newState.label !== previousState.label) {
    changes.push(`nom: "${previousState.label}" → "${newState.label}"`);
  }
  if (newState.value !== undefined && newState.value !== previousState.value) {
    changes.push(`valeur: ${previousState.value ?? '?'} → ${newState.value}`);
  }
  if (newState.computation_definition !== undefined) {
    changes.push('formule modifiée');
  }
  if (newState.unit !== undefined && newState.unit !== previousState.unit) {
    changes.push(`unité: "${previousState.unit || ''}" → "${newState.unit}"`);
  }
  
  const changeDesc = changes.length > 0 ? ` (${changes.join(', ')})` : '';
  
  return {
    id: generateCommandId(),
    timestamp: new Date(),
    type: 'node_update',
    description: `Modification de "${label || previousState.label || nodeId}"${changeDesc}`,
    projectId,
    data: {
      nodeId,
      previousState,
      newState,
    },
  };
}

/**
 * Create a command for node deletion
 * Call this BEFORE deleting the node, passing the full node data
 */
export function buildNodeDeleteCommand(
  projectId: string,
  deletedNode: Node
): NodeDeleteCommand {
  return {
    id: generateCommandId(),
    timestamp: new Date(),
    type: 'node_delete',
    description: `Suppression du nœud "${deletedNode.label || deletedNode.id}"`,
    projectId,
    data: {
      deletedNode,
    },
  };
}

// ==================== Batch Command Builder ====================

/**
 * Create a batch command for AI actions that create/modify multiple items
 */
export function buildBatchCommand(
  projectId: string,
  subCommands: Command[],
  description: string,
  aiPrompt?: string
): BatchCommand {
  return {
    id: generateCommandId(),
    timestamp: new Date(),
    type: 'ai_batch',
    description,
    projectId,
    data: {
      subCommands,
      aiPrompt,
    },
  };
}

// ==================== Utility Functions ====================

/**
 * Extract the fields that changed between two states
 * Useful for building more precise update commands
 */
export function extractChangedFields<T extends object>(
  previous: T,
  next: Partial<T>
): Partial<T> {
  const changed: Partial<T> = {};
  
  for (const key in next) {
    if (next[key] !== previous[key]) {
      changed[key] = previous[key];
    }
  }
  
  return changed;
}

/**
 * Get a snapshot of the relevant node fields for undo
 */
export function snapshotNodeForUndo(node: Node): Partial<Node> {
  return {
    id: node.id,
    slug: node.slug,
    label: node.label,
    unit: node.unit,
    status: node.status,
    value: node.value,
    value_computed: node.value_computed,
    computation_definition: node.computation_definition,
    computation_error: node.computation_error,
    notes: node.notes,
    pos_x: node.pos_x,
    pos_y: node.pos_y,
    project_id: node.project_id,
    composite_id: node.composite_id,
  };
}
