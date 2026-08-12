import type { QueryClient } from "@tanstack/react-query";

import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
} from "@tanstack/react-router";

import { isNotFound } from "../api/problem";
import { EventRoute, RemovedEventState } from "../event/EventRoute";
import { eventQuery } from "../event/queries";
import {
  InboxErrorState,
  InboxMissingState,
  InboxWorkspace,
  InboxWorkspaceSkeleton,
  NoEventSelected,
} from "../inbox/InboxWorkspace";
import { inboxQuery } from "../inbox/queries";
import { ApplicationShell } from "./ApplicationShell";
import { HomeRoute } from "./HomeRoute";

interface RouterContext {
  queryClient: QueryClient;
}

/** Deleted resources use the empty state, not the error boundary retry. */
async function ensureOrNotFound<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (isNotFound(error)) {
      throw notFound();
    }
    throw error;
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: ApplicationShell,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeRoute,
});

// Loader warms the cache before mount. The workspace does not own loading or missing states.
const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inboxes/$inboxId",
  loader: ({ context, params }) =>
    ensureOrNotFound(() => context.queryClient.ensureQueryData(inboxQuery(params.inboxId))),
  component: InboxWorkspace,
  pendingComponent: InboxWorkspaceSkeleton,
  errorComponent: InboxErrorState,
  notFoundComponent: InboxMissingState,
});

const inboxIndexRoute = createRoute({
  getParentRoute: () => inboxRoute,
  path: "/",
  component: NoEventSelected,
});

// Child route for the open event. Selection lives only in the URL.
const eventRoute = createRoute({
  getParentRoute: () => inboxRoute,
  path: "events/$eventId",
  loader: ({ context, params }) =>
    ensureOrNotFound(() => context.queryClient.ensureQueryData(eventQuery(params.eventId))),
  component: EventRoute,
  notFoundComponent: RemovedEventState,
  // Sibling events reuse this component. Without a key, delete mutation state leaks and a
  // newly opened event looks already removed.
  remountDeps: ({ params }) => params.eventId,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  inboxRoute.addChildren([inboxIndexRoute, eventRoute]),
]);

/** Builds a router against the given client so tests can isolate cache and history. */
export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

// History state, not a search param. Shows once and does not survive a reload.
declare module "@tanstack/history" {
  interface HistoryState {
    notice?: string;
  }
}
