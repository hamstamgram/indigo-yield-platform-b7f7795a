import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKeyboardShortcuts, SHORTCUTS } from "@/hooks";
import { useAuth } from "@/lib/auth/context";
import { CommandPalette } from "./CommandPalette";
import { ActionBar } from "./ActionBar";

/**
 * Global shortcuts and UI components that persist across all authenticated pages
 * Includes Command Palette (Cmd+K) and Action Bar
 */
export function GlobalShortcuts() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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
          navigate("/admin/monthly-data-entry");
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
      ...SHORTCUTS.ESCAPE,
      handler: () => setCommandPaletteOpen(false),
    },
  ]);

  return (
    <>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <ActionBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
    </>
  );
}
