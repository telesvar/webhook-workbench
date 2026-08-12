interface SkeletonProps {
  lines?: number;
}

export function Skeleton({ lines = 3 }: SkeletonProps) {
  return (
    <div aria-label="Loading" className="flex animate-pulse flex-col gap-2 p-3" role="status">
      {Array.from({ length: lines }, (_, index) => (
        <span
          className="block h-12 rounded-lg bg-neutral-100 even:w-[86%] dark:bg-neutral-800"
          key={index}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
