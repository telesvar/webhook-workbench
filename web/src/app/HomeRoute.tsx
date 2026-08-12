import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";

export function HomeRoute() {
  return (
    <div className="flex h-full min-h-0 bg-neutral-50 dark:bg-neutral-950">
      <EmptyState
        description="Pick an inbox on the left, or create one to get a local endpoint you can point a provider at."
        icon={
          <Icon className="size-8" viewBox="0 0 48 48">
            <path d="M9 14.5A4.5 4.5 0 0 1 13.5 10h21a4.5 4.5 0 0 1 4.5 4.5v19a4.5 4.5 0 0 1-4.5 4.5h-21A4.5 4.5 0 0 1 9 33.5Z" />
            <path d="m10 19 11.5 8.5a4.2 4.2 0 0 0 5 0L38 19" />
            <path d="M24 4v7M19.5 6.5 24 11l4.5-4.5" />
          </Icon>
        }
        title="Catch webhooks here"
      />
    </div>
  );
}
