/**
 * Global keyboard shortcuts hook
 * Manages all keyboard shortcuts for the application
 */

import { useEffect } from 'react';
import { useUIStore } from '@/store/uiState';
import { useHistoryStore } from '@/store/history';

interface KeyboardShortcutsOptions {
  onFitView?: () => void;
  onCheckRules?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;
  const clearSelection = useUIStore((state) => state.clearSelection);
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape even in inputs
        if (e.key !== 'Escape') return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Escape - clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Ctrl/Cmd+K - command palette
      if (isMod && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Ctrl/Cmd+Z - undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl/Cmd+Shift+Z - redo
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Single-key shortcuts (only when not in input)
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        !target.isContentEditable
      ) {
        switch (e.key.toLowerCase()) {
          case 'f':
            e.preventDefault();
            options.onFitView?.();
            break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    clearSelection,
    toggleCommandPalette,
    undo,
    redo,
    options.onFitView,
  ]);
}
