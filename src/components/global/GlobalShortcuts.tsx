import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useKeyboardShortcuts, SHORTCUTS } from "@/hooks";
import { useAuth } from "@/services/auth";
import { CommandPalette } from "./CommandPalette";
import { ActionBar } from "./ActionBar";

/**
 * Global shortcuts and UI components that persist across all authenticated pages
 * Includes Command Palette (Cmd+K), Action Bar, and G-key navigation
 */
export function GlobalShortcuts() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [gKeyPending, setGKeyPending] = useState(false);

  // Handle G-key navigation (press G then another key)
  const handleGKeyNavigation = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger in inputs
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      if (gKeyPending && isAdmin) {
        const key = event.key.toLowerCase();
        let destination: string | null = null;

        switch (key) {
          case "d":
            destination = "/admin";
            break;
          case "i":
            destination = "/admin/investors";
            break;
          case "y":
            destination = "/admin/yield-history";
            break;
          case "w":
            destination = "/admin/withdrawals";
            break;
          case "r":
            destination = "/admin/investor-reports";
            break;
          case "s":
            destination = "/admin/settings";
            break;
          case "t":
            destination = "/admin/transactions";
            break;
          case "h":
            destination = "/admin/system-health";
            break;
        }

        if (destination) {
          event.preventDefault();
          navigate(destination);
        }
        setGKeyPending(false);
      } else if (event.key.toLowerCase() === "g" && !event.metaKey && !event.ctrlKey) {
        setGKeyPending(true);
        // Reset after 1.5 seconds if no follow-up key
        setTimeout(() => setGKeyPending(false), 1500);
      }
    },
    [gKeyPending, isAdmin, navigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleGKeyNavigation);
    return () => window.removeEventListener("keydown", handleGKeyNavigation);
  }, [handleGKeyNavigation]);

  // Register global keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...SHORTCUTS.COMMAND_PALETTE,
      handler: () => setCommandPaletteOpen(true),
    },
    {
      ...SHORTCUTS.QUICK_INVESTOR,
      handler: () => {
        if (isAdmin) {
          navigate("/admin/investors");
        }
      },
      enabled: isAdmin,
    },
    {
      ...SHORTCUTS.QUICK_YIELD,
      handler: () => {
        if (isAdmin) {
          navigate("/admin/yield-history");
        }
      },
      enabled: isAdmin,
    },
    {
      ...SHORTCUTS.QUICK_REPORT,
      handler: () => {
        if (isAdmin) {
          navigate("/admin/investor-reports");
        }
      },
      enabled: isAdmin,
    },
    {
      ...SHORTCUTS.QUICK_DEPOSITS,
      handler: () => {
        if (isAdmin) {
          navigate("/admin/transactions"); // Deposits consolidated into transactions
        }
      },
      enabled: isAdmin,
    },
    {
      ...SHORTCUTS.QUICK_WITHDRAWALS,
      handler: () => {
        if (isAdmin) {
          navigate("/admin/withdrawals");
        }
      },
      enabled: isAdmin,
    },
    {
      ...SHORTCUTS.ESCAPE,
      handler: () => setCommandPaletteOpen(false),
    },
  ]);

  return (
    <>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <ActionBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
    </>
  );
}
