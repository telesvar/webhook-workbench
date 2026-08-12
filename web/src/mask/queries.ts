import { queryOptions } from "@tanstack/react-query";

import { fetchSettings } from "./api";

/** Refetches on focus so a teammate's list edit shows up without a reload. */
export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: ({ signal }) => fetchSettings(signal),
  staleTime: 30_000,
});
