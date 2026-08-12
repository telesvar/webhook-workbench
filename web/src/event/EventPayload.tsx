import { useMasking } from "../mask/masking";
import { CopyButton } from "../ui/CopyButton";
import { focusRing } from "../ui/focus";
import { Kbd } from "../ui/Kbd";
import { renderBody, toggleFormat, useFormatted } from "./body";

interface EventPayloadProps {
  body: string;
  contentType: string;
}

/**
 * Shows the captured body, masked by key and indented when asked.
 * Copy takes the original bytes, not the on-screen view.
 */
export function EventPayload({ body, contentType }: EventPayloadProps) {
  const masking = useMasking();
  const formatted = useFormatted();
  const rendered = renderBody(body, contentType, masking, formatted);

  return (
    <section className="mt-5">
      <div className="mb-2 flex min-h-8 items-center justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h3 className="text-sm font-semibold tracking-tight">Body</h3>
          <span className="truncate font-mono text-[11px] text-neutral-500">
            {contentType || "no content type"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {rendered.formattable ? (
            <button
              aria-pressed={formatted}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 ${focusRing}`}
              onClick={toggleFormat}
              type="button"
            >
              <Kbd>f</Kbd>
              {formatted ? "Formatted" : "As sent"}
            </button>
          ) : null}
          {body ? (
            <CopyButton idleLabel="Copy" successLabel="Copied" text={body} variant="quiet" />
          ) : null}
        </div>
      </div>
      {body ? (
        <pre
          aria-label="Webhook payload"
          className="max-h-[460px] overflow-auto rounded-lg bg-neutral-900 p-4 text-xs/relaxed tab-2 text-neutral-100 dark:bg-neutral-950"
        >
          <code>{rendered.text}</code>
        </pre>
      ) : (
        <p className="rounded-lg bg-neutral-100 p-4 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          The request had no body.
        </p>
      )}
    </section>
  );
}
