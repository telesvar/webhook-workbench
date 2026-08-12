import { queryOptions } from "@tanstack/react-query";

import { fetchSession } from "./api";

/** Session is fetched once per page load. */
export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: ({ signal }) => fetchSession(signal),
  staleTime: Infinity,
});
