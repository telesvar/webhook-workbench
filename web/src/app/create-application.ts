import { QueryClient } from "@tanstack/react-query";

import { createAppRouter } from "./router";

/** Fresh query client and router per App, so tests do not share cache or history. */
export function createApplication() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  return { queryClient, router: createAppRouter(queryClient) };
}
