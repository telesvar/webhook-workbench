import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { settingsQuery } from "./queries";

export const MASK = "••••••••";

/**
 * Whether masked values are revealed in this tab.
 * Per person, not the instance. Not persisted, so reload, new tab, and screen share start masked.
 */
let revealedInThisTab = false;
const listeners = new Set<() => void>();

export function toggleReveal() {
  revealedInThisTab = !revealedInThisTab;
  for (const listener of listeners) {
    listener();
  }
}

export function useRevealed(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => revealedInThisTab,
    () => false,
  );
}

export interface Masking {
  /** On the instance mask list, regardless of reveal state. */
  listed: (field: string) => boolean;
  revealed: boolean;
}

export function useMasking(): Masking {
  const settings = useQuery(settingsQuery);
  const revealed = useRevealed();
  const fields = new Set(settings.data?.maskedFields ?? []);

  return { listed: (field) => fields.has(field.toLowerCase()), revealed };
}

export function hidden(masking: Masking, field: string): boolean {
  return !masking.revealed && masking.listed(field);
}

export function show(masking: Masking, field: string, value: string): string {
  return hidden(masking, field) ? MASK : value;
}
