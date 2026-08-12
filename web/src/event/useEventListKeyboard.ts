import type { EventSummary } from "../api/generated";

import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { shouldIgnoreShortcut } from "../ui/keyboard";

interface EventListKeyboardOptions {
  events: EventSummary[];
  inboxId: string;
  selectedEventId: string | undefined;
}

/** Selection is in the route, so list movement is ordinary navigation. */
export function useEventListKeyboard({
  events,
  inboxId,
  selectedEventId,
}: EventListKeyboardOptions) {
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreShortcut(event)) {
        return;
      }

      const forward = event.key === "ArrowDown" || event.key === "j" ? 1 : 0;
      const back = event.key === "ArrowUp" || event.key === "k" ? -1 : 0;
      const offset = forward + back;

      if (offset !== 0 && events.length > 0) {
        event.preventDefault();
        const current = events.findIndex((item) => item.id === selectedEventId);
        // With nothing selected, down opens the newest and up opens the oldest.
        const next =
          current === -1
            ? offset > 0
              ? 0
              : events.length - 1
            : Math.min(events.length - 1, Math.max(0, current + offset));
        const target = events[next];
        if (target) {
          void navigate({
            to: "/inboxes/$inboxId/events/$eventId",
            params: { eventId: target.id, inboxId },
          });
        }
        return;
      }

      if (event.key === "Enter" && selectedEventId) {
        const inspector = document.querySelector<HTMLElement>("[aria-label='Event inspector']");
        if (inspector) {
          event.preventDefault();
          inspector.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [events, inboxId, navigate, selectedEventId]);
}
