import type { ReactNode } from "react";

import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { ProblemBanner } from "./ProblemBanner";

interface ConfirmDialogProps {
  children?: ReactNode;
  confirmLabel: string;
  description: string;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  pending: boolean;
  pendingLabel: string;
  title: string;
}

export function ConfirmDialog({
  children,
  confirmLabel,
  description,
  error,
  onClose,
  onConfirm,
  open,
  pending,
  pendingLabel,
  title,
}: ConfirmDialogProps) {
  return (
    <Dialog description={description} onClose={onClose} open={open} title={title}>
      <div className="space-y-4 px-6 pt-4 pb-6">
        {children}
        {error ? <ProblemBanner>{error}</ProblemBanner> : null}
        <div className="flex justify-end gap-2">
          <Button disabled={pending} onClick={onClose} variant="quiet">
            Cancel
          </Button>
          <Button disabled={pending} onClick={onConfirm} variant="danger">
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
