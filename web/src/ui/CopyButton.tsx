import { useEffect, useRef, useState } from "react";

import { Button } from "./Button";
import { Icon } from "./Icon";

interface CopyButtonProps {
  idleLabel?: string;
  successLabel?: string;
  text: string;
  variant?: "primary" | "secondary" | "quiet";
}

const FEEDBACK_DURATION_MS = 1500;

export function CopyButton({
  idleLabel = "Copy",
  successLabel = "Copied",
  text,
  variant = "secondary",
}: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const revert = useRef<ReturnType<typeof setTimeout>>(undefined);

  function announce(next: "copied" | "failed") {
    setStatus(next);
    clearTimeout(revert.current);
    revert.current = setTimeout(() => setStatus("idle"), FEEDBACK_DURATION_MS);
  }

  useEffect(() => () => clearTimeout(revert.current), []);

  async function copy() {
    if (!navigator.clipboard) {
      announce("failed");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      announce("copied");
    } catch {
      announce("failed");
    }
  }

  const label =
    status === "copied" ? successLabel : status === "failed" ? "Copy failed" : idleLabel;

  return (
    <Button
      aria-live="polite"
      className={status === "failed" ? "text-red-600 dark:text-red-400" : ""}
      onClick={copy}
      variant={variant}
    >
      <Icon>
        <rect height="10" rx="2" width="10" x="7" y="7" />
        <path d="M13 5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h1" />
      </Icon>
      {label}
    </Button>
  );
}
