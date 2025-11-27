import { createContext, useContext } from 'react';
import type { Node } from '@/lib/types';

export interface NodePositionUpdate {
  id: string;
  x: number;
  y: number;
}

export interface GraphDataContextValue {
  nodes: Node[];
  isLoading: boolean;
  refresh: () => void | Promise<unknown>;
  persistNodePositions: (updates: NodePositionUpdate[]) => Promise<void>;
}

const defaultValue: GraphDataContextValue = {
  nodes: [],
  isLoading: false,
  refresh: () => {},
  persistNodePositions: async () => {},
};

const GraphDataContext = createContext<GraphDataContextValue>(defaultValue);

export function GraphDataProvider({
  value,
  children,
}: {
  value: GraphDataContextValue;
  children: React.ReactNode;
}) {
  return (
    <GraphDataContext.Provider value={value}>
      {children}
    </GraphDataContext.Provider>
  );
}

export function useGraphData() {
  return useContext(GraphDataContext);
}
