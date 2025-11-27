"use client";

import { AlgorithmPanel } from "@/components/panels/AlgorithmPanel";
import { useUIStore } from "@/store/uiState";

export function StackPanelRenderer() {
  const panelStack = useUIStore((state) => state.panelStack);
  const top = panelStack[panelStack.length - 1];
  if (!top) return null;

  if (top.type === "algorithm") {
    return <AlgorithmPanel nodeId={top.props?.nodeId as string} />;
  }

  return null;
}
