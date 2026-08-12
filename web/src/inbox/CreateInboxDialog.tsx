import type { Inbox } from "../api/generated";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId, useState, type FormEvent } from "react";

import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { focusRing } from "../ui/focus";
import { ProblemBanner } from "../ui/ProblemBanner";
import { createInbox, inboxErrorMessage } from "./api";
import { inboxKeys } from "./queries";

interface CreateInboxDialogProps {
  onClose: () => void;
  open: boolean;
}

export function CreateInboxDialog({ onClose, open }: CreateInboxDialogProps) {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputId = useId();
  const helpId = useId();
  // Length is the server's rule. Duplicating it here would create two limits that can disagree.
  // An over-long name comes back as a problem this dialog already shows.
  const nameIsValid = name.trim() !== "";
  const createMutation = useMutation({
    mutationFn: createInbox,
    onSuccess: (created) => {
      queryClient.setQueryData<Inbox[]>(inboxKeys.all, (current) => {
        if (!current) {
          return [created];
        }
        return [created, ...current.filter((inbox) => inbox.id !== created.id)];
      });
      queryClient.setQueryData(inboxKeys.detail(created.id), created);
      setName("");
      onClose();
      void navigate({ to: "/inboxes/$inboxId", params: { inboxId: created.id } });
    },
  });

  function close() {
    createMutation.reset();
    setName("");
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nameIsValid) {
      return;
    }
    createMutation.mutate({ name });
  }

  return (
    <Dialog
      description="Name it something you will recognize. We will generate a local endpoint for you."
      onClose={close}
      open={open}
      title="Create an inbox"
    >
      <form className="px-6 pt-5 pb-6" onSubmit={submit}>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold" htmlFor={inputId}>
            Inbox name
          </label>
          <input
            autoComplete="off"
            autoFocus
            aria-describedby={helpId}
            className={`min-h-10.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900 ${focusRing}`}
            id={inputId}
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Payment events"
            required
            value={name}
          />
          <small className="text-[11px] text-neutral-500" id={helpId}>
            You can create more inboxes at any time.
          </small>
        </div>

        {createMutation.isError ? (
          <div className="mt-4">
            <ProblemBanner>
              <strong className="font-semibold">Inbox creation failed.</strong>{" "}
              {inboxErrorMessage(createMutation.error)}
            </ProblemBanner>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-5">
          <Button onClick={close} variant="quiet">
            Cancel
          </Button>
          <Button
            disabled={!nameIsValid || createMutation.isPending}
            type="submit"
            variant="primary"
          >
            {createMutation.isPending ? "Creating…" : "Create inbox"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
