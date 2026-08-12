import { useQuery } from "@tanstack/react-query";

import { setToken } from "../api/token";
import { focusRing } from "../ui/focus";
import { sessionQuery } from "./queries";

export function AccessBadge() {
  const session = useQuery(sessionQuery);

  if (!session.data?.authenticationRequired) {
    return null;
  }
  return (
    <button
      className={`cursor-pointer rounded-md px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${focusRing}`}
      onClick={() => setToken(null)}
      type="button"
    >
      Sign out
    </button>
  );
}
