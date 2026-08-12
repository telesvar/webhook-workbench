import type { FormEvent } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import { problemMessage } from "../api/problem";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { focusRing } from "../ui/focus";
import { ProblemBanner } from "../ui/ProblemBanner";
import { saveSettings } from "./api";
import { settingsQuery } from "./queries";

interface MaskedFieldsDialogProps {
  maskedFields: string[];
  onClose: () => void;
}

export function MaskedFieldsDialog({ maskedFields, onClose }: MaskedFieldsDialogProps) {
  const [text, setText] = useState(maskedFields.join("\n"));
  const inputId = useId();
  const helpId = useId();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: saveSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsQuery.queryKey, saved);
      onClose();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate({ maskedFields: text.split("\n") });
  }

  return (
    <Dialog
      description="One name per line. Matched case-insensitively against headers, JSON keys, form fields, and XML."
      onClose={onClose}
      open
      title="Masked fields"
    >
      <form className="px-6 pt-5 pb-6" onSubmit={submit}>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold" htmlFor={inputId}>
            Field names
          </label>
          <textarea
            autoFocus
            aria-describedby={helpId}
            className={`min-h-48 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-900 ${focusRing}`}
            id={inputId}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            value={text}
          />
          <small className="text-[11px] text-neutral-500" id={helpId}>
            Shared with everyone on this instance. What counts as sensitive is about the webhooks,
            not who is looking.
          </small>
        </div>

        {save.isError ? (
          <div className="mt-4">
            <ProblemBanner>
              {problemMessage(save.error, "The list could not be saved. Try again.")}
            </ProblemBanner>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-5">
          <Button onClick={onClose} variant="quiet">
            Cancel
          </Button>
          <Button disabled={save.isPending} type="submit" variant="primary">
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
