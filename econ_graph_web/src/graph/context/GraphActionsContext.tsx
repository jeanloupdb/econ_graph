import { createContext, useContext } from 'react';
import type { Node, NodeCreate, NodeUpdate } from '@/lib/types';

export interface GraphActionsContextValue {
  mode: 'project' | 'composite';
  getNodeById: (id: string) => Node | undefined;
  createNode: (payload: NodeCreate) => Promise<Node>;
  updateNode: (id: string, payload: NodeUpdate) => Promise<Node>;
  deleteNode: (id: string) => Promise<void>;
  computeNode?: (id: string) => Promise<void>;
  refreshNodes: () => void;
}

const missing = () => {
  throw new Error('GraphActionsProvider is not configured.');
};

const defaultValue: GraphActionsContextValue = {
  mode: 'project',
  getNodeById: () => undefined,
  createNode: async () => missing(),
  updateNode: async () => missing(),
  deleteNode: async () => missing(),
  computeNode: undefined,
  refreshNodes: () => missing(),
};

const GraphActionsContext = createContext<GraphActionsContextValue>(defaultValue);

export function GraphActionsProvider({
  value,
  children,
}: {
  value: GraphActionsContextValue;
  children: React.ReactNode;
}) {
  return (
    <GraphActionsContext.Provider value={value}>
      {children}
    </GraphActionsContext.Provider>
  );
}

export function useGraphActions() {
  return useContext(GraphActionsContext);
}
