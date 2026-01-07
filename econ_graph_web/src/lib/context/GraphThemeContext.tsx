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

// Minimal theme colors - only for main containers
// Using warmer, softer tones that complement the dark nodes better
export const GRAPH_LIGHT_COLORS = {
  pageBg: "#c8ccd4", // Darker blue-gray for better harmony with dark nodes
  canvasBg: "#b8bcc5", // Darker blue-gray canvas - much better contrast with dark nodes
  panelBg: "#e8e9ed", // Lighter panels with slight warmth
  panelBorder: "#a1a1aa", // zinc-400 - visible borders
  edgeColor: "#52525b", // zinc-600 - even darker edges for visibility
  gridColor: "#fff", // Darker grid that blends with darker canvas
};

export function GraphThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [graphTheme, setGraphThemeState] = useState<GraphTheme>("dark");

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
      graphTheme: "dark",
      setGraphTheme: () => {},
      toggleGraphTheme: () => {},
      isLightMode: false,
    };
  }

  return context;
}
