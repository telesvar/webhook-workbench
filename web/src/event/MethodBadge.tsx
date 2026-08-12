interface MethodBadgeProps {
  method: string;
}

export function MethodBadge({ method }: MethodBadgeProps) {
  return (
    <span
      className="max-w-24 shrink-0 truncate rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
      title={method}
    >
      {method}
    </span>
  );
}
