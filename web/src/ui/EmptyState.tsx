import type { ReactNode } from "react";

interface EmptyStateProps {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <section className="m-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      {icon ? (
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
