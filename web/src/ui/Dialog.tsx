import type { ReactNode } from "react";

import { useEffect, useId, useRef } from "react";

import { focusRing } from "./focus";
import { Icon } from "./Icon";

interface DialogProps {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
}

export function Dialog({ children, description, onClose, open, title }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-neutral-300 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-950/55 backdrop:backdrop-blur-[3px] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      {/* Render nothing while closed. A hidden autofocus field steals focus and eats shortcuts. */}
      {open ? (
        <DialogContent
          description={description}
          descriptionId={descriptionId}
          onClose={onClose}
          title={title}
          titleId={titleId}
        >
          {children}
        </DialogContent>
      ) : null}
    </dialog>
  );
}

interface DialogContentProps {
  children: ReactNode;
  description?: string;
  descriptionId: string;
  onClose: () => void;
  title: string;
  titleId: string;
}

function DialogContent({
  children,
  description,
  descriptionId,
  onClose,
  title,
  titleId,
}: DialogContentProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-5 border-b border-neutral-200 px-6 pt-6 pb-4 dark:border-neutral-700">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-neutral-600 dark:text-neutral-400" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        <button
          aria-label="Close dialog"
          className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700 ${focusRing}`}
          onClick={onClose}
          type="button"
        >
          <Icon className="size-[18px]">
            <path d="m5 5 10 10M15 5 5 15" />
          </Icon>
        </button>
      </div>
      {children}
    </>
  );
}
