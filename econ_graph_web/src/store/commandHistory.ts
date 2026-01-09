/**
 * Command History Store - Implements Undo/Redo with Command Pattern
 * 
 * This store manages the command history for undo/redo operations.
 * Each command stores the data needed to both execute and undo an action.
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import type {
  Command,
  CommandHistoryState,
  NodeCreateCommand,
  NodeUpdateCommand,
  NodeDeleteCommand,
  BatchCommand,
} from '@/lib/commands/types';

const MAX_HISTORY_SIZE = 50;

interface CommandHistoryActions {
  // Push a new command to the history
  pushCommand: (command: Command) => void;
  
  // Undo the last command
  undo: () => Promise<boolean>;
  
  // Redo the last undone command
  redo: () => Promise<boolean>;
  
  // Clear history (e.g., when switching projects)
  clearHistory: () => void;
  
  // Set current project context
  setCurrentProject: (projectId: string | null) => void;
}

type CommandHistoryStore = CommandHistoryState & CommandHistoryActions;

/**
 * Execute the undo action for a command
 */
async function executeUndo(command: Command, refreshNodes: () => Promise<void>): Promise<boolean> {
  console.log('[UNDO/REDO] executeUndo() starting for:', command.type);
  
  try {
    switch (command.type) {
      case 'node_create': {
        // Undo creation = delete the node
        const cmd = command as NodeCreateCommand;
        console.log('[UNDO/REDO] Undoing node creation, deleting node:', cmd.data.createdNodeId);
        await apiClient.delete(`/nodes/${cmd.data.createdNodeId}`);
        console.log('[UNDO/REDO] Node deleted successfully');
        break;
      }
      
      case 'node_update': {
        // Undo update = restore previous state
        const cmd = command as NodeUpdateCommand;
        console.log('[UNDO/REDO] Undoing node update, restoring node:', cmd.data.nodeId);
        console.log('[UNDO/REDO] Previous state:', cmd.data.previousState);
        await apiClient.patch(`/nodes/${cmd.data.nodeId}`, cmd.data.previousState);
        console.log('[UNDO/REDO] Node restored successfully');
        break;
      }
      
      case 'node_delete': {
        // Undo deletion = recreate the node with same ID
        const cmd = command as NodeDeleteCommand;
        const { deletedNode } = cmd.data;
        console.log('[UNDO/REDO] Undoing node deletion, recreating node:', deletedNode.id);
        await apiClient.post('/nodes', {
          id: deletedNode.id,
          slug: deletedNode.slug,
          label: deletedNode.label,
          unit: deletedNode.unit,
          status: deletedNode.status,
          computation_definition: deletedNode.computation_definition,
          notes: deletedNode.notes,
          pos_x: deletedNode.pos_x,
          pos_y: deletedNode.pos_y,
          project_id: deletedNode.project_id,
        });
        console.log('[UNDO/REDO] Node recreated successfully');
        break;
      }
      
      case 'ai_batch': {
        // Undo batch = undo all sub-commands in reverse order
        const cmd = command as BatchCommand;
        console.log('[UNDO/REDO] Undoing batch with', cmd.data.subCommands.length, 'sub-commands');
        for (let i = cmd.data.subCommands.length - 1; i >= 0; i--) {
          await executeUndo(cmd.data.subCommands[i], async () => {});
        }
        break;
      }
      
      // TODO: Implement other command types
      default:
        console.warn(`[UNDO/REDO] Undo not implemented for command type: ${command.type}`);
        return false;
    }
    
    console.log('[UNDO/REDO] executeUndo() calling refreshNodes (AWAIT)');
    await refreshNodes();
    console.log('[UNDO/REDO] executeUndo() refreshNodes completed');
    
    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[UNDO/REDO] executeUndo() completed successfully');
    return true;
  } catch (error) {
    console.error('[UNDO/REDO] Failed to execute undo:', error);
    return false;
  }
}

/**
 * Execute the redo action for a command
 */
async function executeRedo(command: Command, refreshNodes: () => Promise<void>): Promise<boolean> {
  console.log('[UNDO/REDO] executeRedo() starting for:', command.type);
  
  try {
    switch (command.type) {
      case 'node_create': {
        // Redo creation = create the node again
        const cmd = command as NodeCreateCommand;
        console.log('[UNDO/REDO] Redoing node creation:', cmd.data.createdNodeId);
        const result = await apiClient.post('/nodes', {
          ...cmd.data.payload,
          id: cmd.data.createdNodeId,  // Use the same ID
        });
        console.log('[UNDO/REDO] Node created successfully');
        // Update the command with the new ID if different
        if (result && (result as any).id !== cmd.data.createdNodeId) {
          cmd.data.createdNodeId = (result as any).id;
        }
        break;
      }
      
      case 'node_update': {
        // Redo update = apply the new state again
        const cmd = command as NodeUpdateCommand;
        console.log('[UNDO/REDO] Redoing node update:', cmd.data.nodeId);
        console.log('[UNDO/REDO] New state:', cmd.data.newState);
        await apiClient.patch(`/nodes/${cmd.data.nodeId}`, cmd.data.newState);
        console.log('[UNDO/REDO] Node updated successfully');
        break;
      }
      
      case 'node_delete': {
        // Redo deletion = delete the node again
        const cmd = command as NodeDeleteCommand;
        console.log('[UNDO/REDO] Redoing node deletion:', cmd.data.deletedNode.id);
        await apiClient.delete(`/nodes/${cmd.data.deletedNode.id}`);
        console.log('[UNDO/REDO] Node deleted successfully');
        break;
      }
      
      case 'ai_batch': {
        // Redo batch = redo all sub-commands in order
        const cmd = command as BatchCommand;
        console.log('[UNDO/REDO] Redoing batch with', cmd.data.subCommands.length, 'sub-commands');
        for (const subCmd of cmd.data.subCommands) {
          await executeRedo(subCmd, async () => {});
        }
        break;
      }
      
      // TODO: Implement other command types
      default:
        console.warn(`[UNDO/REDO] Redo not implemented for command type: ${command.type}`);
        return false;
    }
    
    console.log('[UNDO/REDO] executeRedo() calling refreshNodes (AWAIT)');
    await refreshNodes();
    console.log('[UNDO/REDO] executeRedo() refreshNodes completed');
    
    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[UNDO/REDO] executeRedo() completed successfully');
    return true;
  } catch (error) {
    console.error('[UNDO/REDO] Failed to execute redo:', error);
    return false;
  }
}

// Store a reference to the refresh function (will be set by the provider)
let refreshNodesCallback: (() => Promise<void>) | null = null;

export const setRefreshNodesCallback = (callback: () => Promise<void>) => {
  refreshNodesCallback = callback;
};

export const useCommandHistoryStore = create<CommandHistoryStore>((set, get) => ({
  // Initial state
  undoStack: [],
  redoStack: [],
  currentProjectId: null,
  isProcessing: false,
  canUndo: false,
  canRedo: false,
  lastUndoDescription: null,
  lastRedoDescription: null,

  pushCommand: (command) => {
    console.log('[UNDO/REDO] pushCommand:', {
      type: command.type,
      description: command.description,
      projectId: command.projectId,
      commandData: command.data,
    });
    
    set((state) => {
      // Only add commands for the current project
      if (state.currentProjectId && command.projectId !== state.currentProjectId) {
        console.warn('[UNDO/REDO] Command rejected - wrong project:', {
          commandProjectId: command.projectId,
          currentProjectId: state.currentProjectId,
        });
        return state;
      }
      
      const newUndoStack = [...state.undoStack, command];
      
      // Limit stack size
      if (newUndoStack.length > MAX_HISTORY_SIZE) {
        newUndoStack.shift();
      }
      
      console.log('[UNDO/REDO] Command added to history. Stack size:', newUndoStack.length);
      
      return {
        undoStack: newUndoStack,
        redoStack: [],  // Clear redo stack when new action is performed
        canUndo: true,
        canRedo: false,
        lastUndoDescription: command.description,
        lastRedoDescription: null,
      };
    });
  },

  undo: async () => {
    const state = get();
    
    console.log('[UNDO/REDO] undo() called. State:', {
      isProcessing: state.isProcessing,
      undoStackSize: state.undoStack.length,
      canUndo: state.canUndo,
    });
    
    if (state.isProcessing || state.undoStack.length === 0) {
      console.warn('[UNDO/REDO] undo() blocked:', {
        isProcessing: state.isProcessing,
        undoStackEmpty: state.undoStack.length === 0,
      });
      return false;
    }
    
    set({ isProcessing: true });
    
    const command = state.undoStack[state.undoStack.length - 1];
    console.log('[UNDO/REDO] Executing undo for command:', {
      type: command.type,
      description: command.description,
      data: command.data,
    });
    
    const success = await executeUndo(command, refreshNodesCallback || (async () => {}));
    
    console.log('[UNDO/REDO] Undo execution result:', success);
    
    if (success) {
      set((state) => {
        const newUndoStack = state.undoStack.slice(0, -1);
        const newRedoStack = [command, ...state.redoStack];
        
        console.log('[UNDO/REDO] Undo successful. New stack sizes:', {
          undo: newUndoStack.length,
          redo: newRedoStack.length,
        });
        
        return {
          undoStack: newUndoStack,
          redoStack: newRedoStack,
          isProcessing: false,
          canUndo: newUndoStack.length > 0,
          canRedo: true,
          lastUndoDescription: newUndoStack.length > 0 
            ? newUndoStack[newUndoStack.length - 1].description 
            : null,
          lastRedoDescription: command.description,
        };
      });
    } else {
      console.error('[UNDO/REDO] Undo failed');
      set({ isProcessing: false });
    }
    
    return success;
  },

  redo: async () => {
    const state = get();
    
    console.log('[UNDO/REDO] redo() called. State:', {
      isProcessing: state.isProcessing,
      redoStackSize: state.redoStack.length,
      canRedo: state.canRedo,
    });
    
    if (state.isProcessing || state.redoStack.length === 0) {
      console.warn('[UNDO/REDO] redo() blocked:', {
        isProcessing: state.isProcessing,
        redoStackEmpty: state.redoStack.length === 0,
      });
      return false;
    }
    
    set({ isProcessing: true });
    
    const command = state.redoStack[0];
    console.log('[UNDO/REDO] Executing redo for command:', {
      type: command.type,
      description: command.description,
      data: command.data,
    });
    
    const success = await executeRedo(command, refreshNodesCallback || (async () => {}));
    
    console.log('[UNDO/REDO] Redo execution result:', success);
    
    if (success) {
      set((state) => {
        const newRedoStack = state.redoStack.slice(1);
        const newUndoStack = [...state.undoStack, command];
        
        console.log('[UNDO/REDO] Redo successful. New stack sizes:', {
          undo: newUndoStack.length,
          redo: newRedoStack.length,
        });
        
        return {
          undoStack: newUndoStack,
          redoStack: newRedoStack,
          isProcessing: false,
          canUndo: true,
          canRedo: newRedoStack.length > 0,
          lastUndoDescription: command.description,
          lastRedoDescription: newRedoStack.length > 0 
            ? newRedoStack[0].description 
            : null,
        };
      });
    } else {
      console.error('[UNDO/REDO] Redo failed');
      set({ isProcessing: false });
    }
    
    return success;
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
      lastUndoDescription: null,
      lastRedoDescription: null,
    });
  },

  setCurrentProject: (projectId) => {
    const state = get();
    
    console.log('[UNDO/REDO] setCurrentProject() called:', {
      newProjectId: projectId,
      oldProjectId: state.currentProjectId,
      undoStackSize: state.undoStack.length,
      redoStackSize: state.redoStack.length,
    });
    
    // Clear history when switching projects
    if (projectId !== state.currentProjectId) {
      console.log('[UNDO/REDO] Project changed, clearing history');
      set({
        currentProjectId: projectId,
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
        lastUndoDescription: null,
        lastRedoDescription: null,
      });
    } else {
      console.log('[UNDO/REDO] Same project, keeping history');
    }
  },
}));
