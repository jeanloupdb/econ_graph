/**
 * useCommandHistory Hook - Wraps graph actions with undo/redo tracking
 * 
 * This hook provides wrapped versions of graph actions that automatically
 * record commands for the undo/redo system.
 */

import { useCallback } from 'react';
import { useCommandHistoryStore } from '@/store/commandHistory';
import { useProjectStore } from '@/store/projectState';
import { useGraphActions } from '@/graph/context/GraphActionsContext';
import { useGraphData } from '@/graph/context/GraphDataContext';
import {
  buildNodeCreateCommand,
  buildNodeUpdateCommand,
  buildNodeDeleteCommand,
  snapshotNodeForUndo,
} from '@/lib/commands';
import type { Node, NodeCreate, NodeUpdate } from '@/lib/types';

/**
 * Hook that provides undo/redo functionality and wrapped graph actions
 */
export function useCommandHistory() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const graphActions = useGraphActions();
  const { nodes } = useGraphData();
  
  const {
    pushCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    isProcessing,
    lastUndoDescription,
    lastRedoDescription,
  } = useCommandHistoryStore();

  /**
   * Create a node with undo tracking
   */
  const createNodeWithHistory = useCallback(
    async (payload: NodeCreate): Promise<Node> => {
      const createdNode = await graphActions.createNode(payload);
      
      if (currentProjectId) {
        const command = buildNodeCreateCommand(
          currentProjectId,
          createdNode.id,
          payload,
          createdNode.label
        );
        pushCommand(command);
      }
      
      return createdNode;
    },
    [graphActions, currentProjectId, pushCommand]
  );

  /**
   * Update a node with undo tracking
   */
  const updateNodeWithHistory = useCallback(
    async (nodeId: string, payload: NodeUpdate): Promise<Node> => {
      // Find the current node state BEFORE updating
      const currentNode = nodes.find((n) => n.id === nodeId);
      
      if (!currentNode) {
        // Fallback: just update without history if node not found in local state
        return graphActions.updateNode(nodeId, payload);
      }
      
      // Capture the previous state for undo
      const previousState = snapshotNodeForUndo(currentNode);
      
      // Perform the update
      const updatedNode = await graphActions.updateNode(nodeId, payload);
      
      // Record the command
      if (currentProjectId) {
        const command = buildNodeUpdateCommand(
          currentProjectId,
          nodeId,
          previousState,
          payload,
          currentNode.label
        );
        pushCommand(command);
      }
      
      return updatedNode;
    },
    [graphActions, nodes, currentProjectId, pushCommand]
  );

  /**
   * Delete a node with undo tracking
   */
  const deleteNodeWithHistory = useCallback(
    async (nodeId: string): Promise<void> => {
      // Find the current node state BEFORE deleting
      const currentNode = nodes.find((n) => n.id === nodeId);
      
      if (!currentNode) {
        // Fallback: just delete without history if node not found
        return graphActions.deleteNode(nodeId);
      }
      
      // Record the command BEFORE deleting
      if (currentProjectId) {
        const command = buildNodeDeleteCommand(currentProjectId, currentNode);
        pushCommand(command);
      }
      
      // Perform the deletion
      await graphActions.deleteNode(nodeId);
    },
    [graphActions, nodes, currentProjectId, pushCommand]
  );

  /**
   * Undo the last action
   */
  const handleUndo = useCallback(async () => {
    if (!canUndo || isProcessing) return false;
    return undo();
  }, [undo, canUndo, isProcessing]);

  /**
   * Redo the last undone action
   */
  const handleRedo = useCallback(async () => {
    if (!canRedo || isProcessing) return false;
    return redo();
  }, [redo, canRedo, isProcessing]);

  return {
    // Wrapped actions with history tracking
    createNodeWithHistory,
    updateNodeWithHistory,
    deleteNodeWithHistory,
    
    // Undo/Redo controls
    undo: handleUndo,
    redo: handleRedo,
    
    // State
    canUndo,
    canRedo,
    isProcessing,
    
    // UI helpers
    lastUndoDescription,
    lastRedoDescription,
  };
}
