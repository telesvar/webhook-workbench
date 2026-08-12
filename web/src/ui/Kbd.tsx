import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-neutral-300 bg-neutral-50 px-1.5 font-mono text-[11px] text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      {children}
    </kbd>
  );
}
