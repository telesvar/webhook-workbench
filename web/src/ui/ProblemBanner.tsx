import type { ReactNode } from "react";

interface ProblemBannerProps {
  children: ReactNode;
}

export function ProblemBanner({ children }: ProblemBannerProps) {
  return (
    <p
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
      role="alert"
    >
      {children}
    </p>
  );
}
