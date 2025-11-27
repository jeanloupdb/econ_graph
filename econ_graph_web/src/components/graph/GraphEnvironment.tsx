import {
  GraphActionsContextValue,
  GraphActionsProvider,
} from "@/graph/context/GraphActionsContext";
import {
  GraphDataContextValue,
  GraphDataProvider,
} from "@/graph/context/GraphDataContext";
import { ReactNode } from "react";

interface GraphEnvironmentProps {
  data: GraphDataContextValue;
  actions: GraphActionsContextValue;
  children: ReactNode;
}

export function GraphEnvironment({
  data,
  actions,
  children,
}: GraphEnvironmentProps) {
  return (
    <GraphDataProvider value={data}>
      <GraphActionsProvider value={actions}>{children}</GraphActionsProvider>
    </GraphDataProvider>
  );
}
