import type { EventDetail } from "../api/generated";

import { Button } from "../ui/Button";
import { CopyButton } from "../ui/CopyButton";
import { Icon } from "../ui/Icon";
import { curlCommand } from "./curl";
import { EventHeaders } from "./EventHeaders";
import { EventPayload } from "./EventPayload";
import { MethodBadge } from "./MethodBadge";
import { formatAbsoluteTimestamp } from "./timestamps";

interface EventInspectorProps {
  event: EventDetail;
  onDelete: () => void;
}

export function EventInspector({ event, onDelete }: EventInspectorProps) {
  return (
    <div className="mx-auto min-h-full w-full max-w-[900px] px-5 pt-5 pb-10 md:px-8">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <MethodBadge method={event.httpMethod} />
            <time dateTime={event.receivedAt}>{formatAbsoluteTimestamp(event.receivedAt)}</time>
          </h2>
          <p className="mt-1.5 truncate font-mono text-[11px] text-neutral-500">{event.id}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <CopyButton
            idleLabel="Copy as curl"
            successLabel="curl copied"
            text={curlCommand(event, window.location.origin)}
          />
          <Button onClick={onDelete} variant="danger">
            <Icon>
              <path d="M4 6h12M8 6V3h4v3M6 6l1 11h6l1-11M9 9v5M12 9v5" />
            </Icon>
            Delete
          </Button>
        </div>
      </div>

      <EventPayload body={event.body} contentType={event.contentType} />
      <EventHeaders headers={event.headers} />
    </div>
  );
}
