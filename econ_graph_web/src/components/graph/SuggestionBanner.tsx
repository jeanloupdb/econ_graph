"use client";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Lightbulb, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  prompt: string;
  priority: string;
  node_id?: string;
  node_label?: string;
}

interface SuggestionsResponse {
  project_id: string;
  suggestions: Suggestion[];
}

export function SuggestionBanner() {
  const { isLightMode } = useGraphTheme();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const canEdit = useProjectStore((s) => s.canEdit)();
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load suggestions when project changes
  useEffect(() => {
    if (!currentProjectId || !canEdit) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<SuggestionsResponse>(
          `/projects/${currentProjectId}/suggestions?max_suggestions=5`
        );
        setSuggestions(response.suggestions);
        setCurrentIndex(0);
      } catch (error) {
        console.error("Failed to load suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Delay loading to avoid blocking initial render
    const timer = setTimeout(loadSuggestions, 2000);
    return () => clearTimeout(timer);
  }, [currentProjectId, canEdit]);

  // Filter out dismissed suggestions
  const activeSuggestions = suggestions.filter((s) => !dismissed.has(s.id));
  const currentSuggestion = activeSuggestions[currentIndex % activeSuggestions.length];

  const handleDismiss = useCallback((suggestionId: string) => {
    setDismissed((prev) => new Set([...prev, suggestionId]));
  }, []);

  const handleApply = useCallback((suggestion: Suggestion) => {
    // Store the prompt in sessionStorage for the AI assistant to use
    sessionStorage.setItem("ai_suggestion_prompt", suggestion.prompt);
    // Open the AI assistant
    setAiAssistantOpen(true);
    // Dismiss this suggestion
    handleDismiss(suggestion.id);
  }, [setAiAssistantOpen, handleDismiss]);

  const handleNext = useCallback(() => {
    if (activeSuggestions.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % activeSuggestions.length);
  }, [activeSuggestions.length]);

  // Don't show if no suggestions or user can't edit
  if (!canEdit || activeSuggestions.length === 0 || loading) {
    return null;
  }

  const priorityColors = {
    high: isLightMode ? "text-amber-600 bg-amber-50 border-amber-200" : "text-amber-400 bg-amber-500/10 border-amber-500/30",
    medium: isLightMode ? "text-blue-700 bg-blue-50 border-blue-200" : "text-blue-400 bg-blue-500/10 border-blue-500/30",
    low: isLightMode ? "text-zinc-600 bg-zinc-100 border-zinc-200" : "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
  };

  return (
    <AnimatePresence mode="wait">
      {currentSuggestion && (
        <motion.div
          key={currentSuggestion.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
            "max-w-xl w-full px-4"
          )}
        >
          <div
            className={cn(
              "rounded-xl border shadow-lg backdrop-blur-xl p-4",
              isLightMode
                ? "bg-blue-50 border-blue-200"
                : "bg-zinc-900/90 border-zinc-700/50"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={cn(
                  "shrink-0 p-2 rounded-lg",
                  priorityColors[currentSuggestion.priority as keyof typeof priorityColors] || priorityColors.medium
                )}
              >
                <Lightbulb className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isLightMode ? "text-blue-900" : "text-zinc-100"
                    )}
                  >
                    {currentSuggestion.title}
                  </span>
                  {activeSuggestions.length > 1 && (
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        isLightMode
                          ? "bg-blue-100 text-blue-600"
                          : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {currentIndex + 1}/{activeSuggestions.length}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs line-clamp-2",
                    isLightMode ? "text-blue-700" : "text-zinc-400"
                  )}
                >
                  {currentSuggestion.description}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {activeSuggestions.length > 1 && (
                  <button
                    onClick={handleNext}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isLightMode
                        ? "hover:bg-blue-100 text-blue-500"
                        : "hover:bg-zinc-800 text-zinc-400"
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}

                <Button
                  size="sm"
                  onClick={() => handleApply(currentSuggestion)}
                  className={cn(
                    "h-8 px-3 text-xs gap-1.5",
                    isLightMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-violet-600 hover:bg-violet-500 text-white"
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  Appliquer
                </Button>

                <button
                  onClick={() => handleDismiss(currentSuggestion.id)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isLightMode
                      ? "hover:bg-blue-100 text-blue-400 hover:text-blue-600"
                      : "hover:bg-zinc-800 text-zinc-500"
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
