import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";

import { MobilePanelProvider } from "../app/mobile-panel";

export function renderWithRouter(node: ReactNode) {
  const rootRoute = createRootRoute({
    component: () => <MobilePanelProvider>{node}</MobilePanelProvider>,
  });
  const inboxRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/inboxes/$inboxId",
  });
  const eventRoute = createRoute({
    getParentRoute: () => inboxRoute,
    path: "events/$eventId",
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([inboxRoute.addChildren([eventRoute])]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
