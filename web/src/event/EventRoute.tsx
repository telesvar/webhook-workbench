import { useLoaderData, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { eventErrorMessage } from "./api";
import { EventInspector } from "./EventInspector";
import { useDeleteEvent } from "./useDeleteEvent";

export function RemovedEventState() {
  return (
    <EmptyState
      description="This request is gone. Pick another from the list."
      icon={
        <Icon className="size-8" viewBox="0 0 48 48">
          <path d="M12 15h24M19 15V9h10v6M16 15l2 25h12l2-25" />
          <path d="M22 22v11M27 22v11" />
        </Icon>
      }
      title="Event removed"
    />
  );
}

export function EventRoute() {
  const { eventId, inboxId } = useParams({ from: "/inboxes/$inboxId/events/$eventId" });
  const event = useLoaderData({ from: "/inboxes/$inboxId/events/$eventId" });
  const deleteMutation = useDeleteEvent(inboxId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Pending and successful deletes both look removed. On failure, closing the dialog
  // resets the mutation and brings the inspector back.
  const removed = deleteMutation.variables === eventId && !deleteMutation.isError;

  if (removed) {
    return <RemovedEventState />;
  }

  return (
    <>
      <EventInspector event={event} onDelete={() => setDeleteOpen(true)} />

      <ConfirmDialog
        confirmLabel="Delete event"
        description="This removes the stored request permanently. It cannot be undone."
        error={deleteMutation.isError ? eventErrorMessage(deleteMutation.error) : undefined}
        onClose={() => {
          deleteMutation.reset();
          setDeleteOpen(false);
        }}
        onConfirm={() => deleteMutation.mutate(event.id)}
        open={deleteOpen}
        pending={deleteMutation.isPending}
        pendingLabel="Deleting…"
        title="Delete captured event?"
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase">Event ID</span>
          <code className="text-[11px] break-words text-neutral-600 dark:text-neutral-400">
            {event.id}
          </code>
        </div>
      </ConfirmDialog>
    </>
  );
}
