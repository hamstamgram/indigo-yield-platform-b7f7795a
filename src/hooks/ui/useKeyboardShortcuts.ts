import { useEffect, useCallback } from "react";

type ShortcutHandler = () => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  handler: ShortcutHandler;
  enabled?: boolean;
}

/**
 * Hook for managing global keyboard shortcuts
 * Supports Cmd/Ctrl modifiers for cross-platform compatibility
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const metaOrCtrl = event.metaKey || event.ctrlKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifierMatch =
          (shortcut.meta || shortcut.ctrl) ? metaOrCtrl : !metaOrCtrl;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        if (keyMatch && modifierMatch && shiftMatch) {
          // Allow escape to work even in inputs
          if (shortcut.key.toLowerCase() === "escape" || !isInput) {
            event.preventDefault();
            shortcut.handler();
            return;
          }
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Pre-defined shortcut keys for consistency across the app
 */
export const SHORTCUTS = {
  // Global
  COMMAND_PALETTE: { key: "k", meta: true },
  ESCAPE: { key: "Escape" },
  
  // Admin Quick Navigation (Cmd/Ctrl + Key)
  QUICK_INVESTOR: { key: "i", meta: true },
  QUICK_YIELD: { key: "y", meta: true },
  QUICK_REPORT: { key: "r", meta: true },
  QUICK_DEPOSITS: { key: "d", meta: true },
  QUICK_WITHDRAWALS: { key: "w", meta: true },
  
  // G-Key Navigation (Press G then another key)
  GO_DASHBOARD: { key: "g" }, // G then D handled in component
  GO_INVESTORS: { key: "g" }, // G then I handled in component
  GO_YIELDS: { key: "g" }, // G then Y handled in component
  GO_WITHDRAWALS: { key: "g" }, // G then W handled in component
} as const;

/**
 * Format shortcut for display (e.g., "⌘K" on Mac, "Ctrl+K" on Windows)
 */
export function formatShortcut(shortcut: { key: string; meta?: boolean; ctrl?: boolean; shift?: boolean }): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts: string[] = [];

  if (shortcut.meta || shortcut.ctrl) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (shortcut.shift) {
    parts.push(isMac ? "⇧" : "Shift");
  }
  
  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  parts.push(key);

  return isMac ? parts.join("") : parts.join("+");
}
