import type { EventSummary } from "../api/generated";

import { Link } from "@tanstack/react-router";

import { useMobilePanel } from "../app/mobile-panel";
import { focusRing } from "../ui/focus";
import { MethodBadge } from "./MethodBadge";
import { formatAbsoluteTimestamp, formatEventTime } from "./timestamps";

interface EventListItemProps {
  event: EventSummary;
  inboxId: string;
}

export function EventListItem({ event, inboxId }: EventListItemProps) {
  const { setPanel } = useMobilePanel();

  return (
    <li>
      <Link
        // The visible row is terse. The accessible name carries full identity for screen readers.
        aria-label={`${event.httpMethod} ${event.contentType} received ${formatAbsoluteTimestamp(event.receivedAt)}`}
        activeProps={{
          "aria-current": "true",
          className:
            "bg-emerald-50 inset-ring-1 inset-ring-emerald-200 dark:bg-emerald-950 dark:inset-ring-emerald-900",
        }}
        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 ${focusRing}`}
        onClick={() => setPanel("inspector")}
        params={{ eventId: event.id, inboxId }}
        to="/inboxes/$inboxId/events/$eventId"
      >
        <MethodBadge method={event.httpMethod} />
        <span className="min-w-0 flex-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
          {event.contentType}
        </span>
        <time
          className="shrink-0 font-mono text-[11px] text-neutral-500 tabular-nums"
          dateTime={event.receivedAt}
          title={formatAbsoluteTimestamp(event.receivedAt)}
        >
          {formatEventTime(event.receivedAt)}
        </time>
      </Link>
    </li>
  );
}
