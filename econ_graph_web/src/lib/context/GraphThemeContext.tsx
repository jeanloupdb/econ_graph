"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type GraphTheme = "light" | "dark";

interface GraphThemeContextValue {
  graphTheme: GraphTheme;
  setGraphTheme: (theme: GraphTheme) => void;
  toggleGraphTheme: () => void;
  isLightMode: boolean;
}

const GraphThemeContext = createContext<GraphThemeContextValue | null>(null);

// Light mode colors for graph page containers
export const GRAPH_LIGHT_COLORS = {
  pageBg: "#f0f0f5",    // soft blue-gray page background
  canvasBg: "#e8e8f0",  // canvas slightly darker than page
  panelBg: "#ffffff",   // pure white panels
  panelBorder: "#e2e2ea", // subtle border
  edgeColor: "#6366f1",  // indigo edges - visible on light
  gridColor: "#d1d1db",  // soft grid dots
};

export function GraphThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [graphTheme, setGraphThemeState] = useState<GraphTheme>("light");

  useEffect(() => {
    const saved = sessionStorage.getItem(
      "graph-page-theme"
    ) as GraphTheme | null;
    if (saved === "light" || saved === "dark") {
      setGraphThemeState(saved);
    }
  }, []);

  const setGraphTheme = useCallback((theme: GraphTheme) => {
    setGraphThemeState(theme);
    sessionStorage.setItem("graph-page-theme", theme);
  }, []);

  const toggleGraphTheme = useCallback(() => {
    const newTheme = graphTheme === "light" ? "dark" : "light";
    setGraphTheme(newTheme);
  }, [graphTheme, setGraphTheme]);

  const isLightMode = graphTheme === "light";

  return (
    <GraphThemeContext.Provider
      value={{ graphTheme, setGraphTheme, toggleGraphTheme, isLightMode }}
    >
      {children}
    </GraphThemeContext.Provider>
  );
}

/**
 * Safe hook - returns dark defaults if outside provider
 */
export function useGraphTheme(): GraphThemeContextValue {
  const context = useContext(GraphThemeContext);

  if (context === null) {
    return {
      graphTheme: "light",
      setGraphTheme: () => {},
      toggleGraphTheme: () => {},
      isLightMode: true,
    };
  }

  return context;
}
