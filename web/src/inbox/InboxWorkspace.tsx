import type { Inbox } from "../api/generated";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, Outlet, useParams, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { useMobilePanel } from "../app/mobile-panel";
import { eventErrorMessage } from "../event/api";
import { EventList } from "../event/EventList";
import { eventKeys, eventPagesQuery } from "../event/queries";
import { useEventListKeyboard } from "../event/useEventListKeyboard";
import { useInboxEventStream } from "../stream/useInboxEventStream";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { CopyButton } from "../ui/CopyButton";
import { EmptyState } from "../ui/EmptyState";
import { focusRing } from "../ui/focus";
import { Icon } from "../ui/Icon";
import { Skeleton } from "../ui/Skeleton";
import { clearInbox, deleteInbox, inboxErrorMessage } from "./api";
import { inboxKeys, inboxQuery } from "./queries";

const panelColumn =
  "flex h-full min-h-0 min-w-0 flex-col border-neutral-200 bg-white md:border-r dark:border-neutral-800 dark:bg-neutral-900";
const insetFocusRing =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 dark:focus-visible:outline-blue-400";
const inspectorColumn =
  "h-full min-h-0 min-w-0 overflow-y-auto bg-white dark:bg-neutral-900 max-md:data-[mobile-visible=false]:hidden";

export function InboxWorkspaceSkeleton() {
  const { panel } = useMobilePanel();

  return (
    <div className="block h-full md:grid md:grid-cols-[minmax(300px,0.78fr)_minmax(340px,1.22fr)] lg:grid-cols-[minmax(330px,0.78fr)_minmax(400px,1.22fr)]">
      <section
        className={`${panelColumn} max-md:data-[mobile-visible=false]:hidden`}
        data-mobile-visible={panel === "events"}
      >
        <Skeleton lines={7} />
      </section>
      <section className={inspectorColumn} data-mobile-visible={panel === "inspector"}>
        <Skeleton lines={7} />
      </section>
    </div>
  );
}

export function InboxMissingState() {
  return (
    <div className="flex h-full min-h-0 bg-neutral-50 dark:bg-neutral-950">
      <EmptyState
        action={
          <Link
            className={`inline-flex min-h-9 items-center rounded-md border border-emerald-700 bg-emerald-700 px-3 py-2 text-[13px] font-semibold text-white hover:bg-emerald-600 dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 ${focusRing}`}
            to="/"
          >
            Return to inboxes
          </Link>
        }
        description="This inbox is gone. It may have been deleted in another window."
        title="Inbox was deleted"
      />
    </div>
  );
}

export function InboxErrorState({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <div className="flex h-full min-h-0 bg-neutral-50 dark:bg-neutral-950">
      <EmptyState
        action={
          <Button onClick={() => void router.invalidate()} variant="primary">
            Try again
          </Button>
        }
        description={inboxErrorMessage(error)}
        title="Inbox loading failed"
      />
    </div>
  );
}

export function NoEventSelected() {
  return (
    <EmptyState
      description="Pick a request from the list to see its body, headers, and metadata."
      icon={
        <Icon className="size-8" viewBox="0 0 48 48">
          <circle cx="21" cy="21" r="12" />
          <path d="m30 30 9 9M17 17h8M17 22h8M17 27h5" />
        </Icon>
      }
      title="Select an event"
    />
  );
}

export function InboxWorkspace() {
  const { inboxId } = useParams({ from: "/inboxes/$inboxId" });
  const { eventId: selectedEventId } = useParams({ strict: false });
  const { panel } = useMobilePanel();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteInboxOpen, setDeleteInboxOpen] = useState(false);
  const [clearInboxOpen, setClearInboxOpen] = useState(false);

  // The loader already resolved this inbox, so the cache is warm and this does not really
  // suspend. Reading through the query keeps live event-count updates flowing.
  const { data: inbox } = useSuspenseQuery(inboxQuery(inboxId));
  const eventsQuery = useInfiniteQuery(eventPagesQuery(inboxId));
  const streamDisconnected = useInboxEventStream(inboxId);

  const deleteInboxMutation = useMutation({
    mutationFn: () => deleteInbox(inboxId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: inboxKeys.all });
      const removed = queryClient
        .getQueryData<Inbox[]>(inboxKeys.all)
        ?.find((entry) => entry.id === inboxId);
      queryClient.setQueryData<Inbox[]>(inboxKeys.all, (current) =>
        current?.filter((entry) => entry.id !== inboxId),
      );
      return { removed };
    },
    onError: (_error, _variables, context) => {
      if (context?.removed) {
        const { removed } = context;
        queryClient.setQueryData<Inbox[]>(inboxKeys.all, (current) => {
          const withoutDuplicate = (current ?? []).filter((entry) => entry.id !== removed.id);
          return [...withoutDuplicate, removed].toSorted((left, right) =>
            right.createdAt.localeCompare(left.createdAt),
          );
        });
      }
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: inboxKeys.detail(inboxId) });
      queryClient.removeQueries({ queryKey: eventKeys.list(inboxId) });
      void router.navigate({ to: "/", state: { notice: "Inbox deleted." } });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });

  const clearInboxMutation = useMutation({
    mutationFn: () => clearInbox(inboxId),
    onSuccess: async () => {
      setClearInboxOpen(false);
      await router.navigate({ to: "/inboxes/$inboxId", params: { inboxId } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.list(inboxId) }),
        queryClient.invalidateQueries({ queryKey: inboxKeys.all }),
        queryClient.invalidateQueries({ queryKey: inboxKeys.detail(inboxId) }),
      ]);
    },
  });

  const events = eventsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const eventCount = eventsQuery.data?.pages[0]?.totalElements ?? inbox.eventCount;
  const endpoint = new URL(inbox.endpoint, window.location.origin).toString();

  useEventListKeyboard({ events, inboxId, selectedEventId });

  return (
    <div className="block h-full md:grid md:grid-cols-[minmax(300px,0.78fr)_minmax(340px,1.22fr)] lg:grid-cols-[minmax(330px,0.78fr)_minmax(400px,1.22fr)]">
      <section
        aria-label={`${inbox.name} events`}
        className={`@container ${panelColumn} max-md:data-[mobile-visible=false]:hidden`}
        data-mobile-visible={panel === "events"}
      >
        <div className="border-b border-neutral-200 px-4 pt-4 pb-3 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">{inbox.name}</h1>
            <div className="flex shrink-0 gap-0.5">
              <Button
                aria-label="Clear events"
                disabled={eventCount === 0}
                onClick={() => setClearInboxOpen(true)}
                variant="quiet"
              >
                Clear
              </Button>
              <Button
                aria-label="Delete inbox"
                onClick={() => setDeleteInboxOpen(true)}
                variant="quiet"
              >
                Delete
              </Button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2 rounded-md bg-neutral-100 py-1 pr-1 pl-3 dark:bg-neutral-800">
            <code className="min-w-0 flex-1 truncate text-[11px] text-neutral-600 dark:text-neutral-400">
              {endpoint}
            </code>
            <CopyButton idleLabel="Copy" successLabel="Copied" text={endpoint} variant="quiet" />
          </div>
        </div>

        {streamDisconnected ? (
          <p
            className="mx-2 mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            role="status"
          >
            Live updates disconnected. Retrying now. Stored events are safe.
          </p>
        ) : null}

        <div className="flex items-baseline justify-between gap-4 px-4 pt-3 pb-1.5">
          <h2 className="text-[11px] font-bold tracking-[0.13em] text-neutral-500 uppercase">
            Events
          </h2>
          <span className="text-[11px] text-neutral-500 tabular-nums">{eventCount}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-5">
          {eventsQuery.isPending ? <Skeleton lines={6} /> : null}

          {eventsQuery.isError ? (
            <EmptyState
              action={
                <Button onClick={() => void eventsQuery.refetch()} variant="primary">
                  Try again
                </Button>
              }
              description={eventErrorMessage(eventsQuery.error)}
              title="Events failed to load"
            />
          ) : null}

          {eventsQuery.isSuccess && events.length === 0 ? (
            <EmptyState
              description="Send anything to the endpoint above. It shows up here the moment it lands."
              icon={
                <Icon className="size-8" viewBox="0 0 48 48">
                  <path d="M9 24h25M27 16l8 8-8 8" />
                  <rect height="34" rx="6" width="34" x="7" y="7" />
                </Icon>
              }
              title="Waiting for a webhook"
            />
          ) : null}

          {events.length > 0 ? <EventList events={events} inboxId={inboxId} /> : null}

          {eventsQuery.hasNextPage ? (
            <Button
              className="mx-1.5 mt-3 w-[calc(100%-0.75rem)]"
              disabled={eventsQuery.isFetchingNextPage}
              onClick={() => void eventsQuery.fetchNextPage()}
              variant="secondary"
            >
              {eventsQuery.isFetchingNextPage ? "Loading older events…" : "Load older events"}
            </Button>
          ) : null}
        </div>
      </section>

      {/* Inset focus ring. This pane clips overflow, so an outset outline would only show on one edge. */}
      <section
        aria-label="Event inspector"
        className={`${inspectorColumn} ${insetFocusRing}`}
        data-mobile-visible={panel === "inspector"}
        tabIndex={-1}
      >
        <Outlet />
      </section>

      <ConfirmDialog
        confirmLabel="Delete inbox"
        description="The inbox and every captured event inside it will be removed permanently."
        error={
          deleteInboxMutation.isError ? inboxErrorMessage(deleteInboxMutation.error) : undefined
        }
        onClose={() => {
          deleteInboxMutation.reset();
          setDeleteInboxOpen(false);
        }}
        onConfirm={() => deleteInboxMutation.mutate()}
        open={deleteInboxOpen}
        pending={deleteInboxMutation.isPending}
        pendingLabel="Deleting…"
        title={`Delete ${inbox.name}?`}
      />

      <ConfirmDialog
        confirmLabel="Clear events"
        description={`Permanently remove all ${eventCount} captured events while keeping this inbox and its endpoint.`}
        error={clearInboxMutation.isError ? inboxErrorMessage(clearInboxMutation.error) : undefined}
        onClose={() => {
          clearInboxMutation.reset();
          setClearInboxOpen(false);
        }}
        onConfirm={() => clearInboxMutation.mutate()}
        open={clearInboxOpen}
        pending={clearInboxMutation.isPending}
        pendingLabel="Clearing…"
        title="Clear this inbox?"
      />
    </div>
  );
}
