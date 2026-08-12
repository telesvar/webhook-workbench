import { useEffect } from "react";

import { toggleFormat } from "../event/body";
import { toggleReveal } from "../mask/masking";
import { shouldIgnoreShortcut } from "../ui/keyboard";

interface GlobalShortcutOptions {
  onCreateInbox: () => void;
  onShowShortcuts: () => void;
}

export function useGlobalShortcuts({ onCreateInbox, onShowShortcuts }: GlobalShortcutOptions) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreShortcut(event)) {
        return;
      }
      if (event.key === "c") {
        event.preventDefault();
        onCreateInbox();
        return;
      }
      if (event.key === "m") {
        event.preventDefault();
        toggleReveal();
        return;
      }
      if (event.key === "f") {
        event.preventDefault();
        toggleFormat();
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        onShowShortcuts();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onCreateInbox, onShowShortcuts]);
}
