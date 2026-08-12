import type { EventSummary } from "../api/generated";

import { EventListItem } from "./EventListItem";

interface EventListProps {
  events: EventSummary[];
  inboxId: string;
}

export function EventList({ events, inboxId }: EventListProps) {
  return (
    <ol aria-label="Captured webhook events" className="flex flex-col gap-0.5">
      {events.map((event) => (
        <EventListItem event={event} inboxId={inboxId} key={event.id} />
      ))}
    </ol>
  );
}
