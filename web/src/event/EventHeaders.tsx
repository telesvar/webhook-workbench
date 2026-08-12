import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MaskedFieldsDialog } from "../mask/MaskedFieldsDialog";
import { show, useMasking } from "../mask/masking";
import { settingsQuery } from "../mask/queries";
import { focusRing } from "../ui/focus";

interface EventHeadersProps {
  headers: Record<string, string[]>;
}

export function EventHeaders({ headers }: EventHeadersProps) {
  const masking = useMasking();
  const settings = useQuery(settingsQuery);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const entries = Object.entries(headers).toSorted(([left], [right]) => left.localeCompare(right));

  function editFields() {
    // Refetch first so one person's save does not silently overwrite another's.
    void settings.refetch();
    setFieldsOpen(true);
  }

  return (
    <section className="mt-5">
      <div className="mb-2 flex min-h-9.5 items-center justify-between gap-4">
        <h3 className="text-sm font-semibold tracking-tight">Headers</h3>
        <div className="flex items-center gap-3">
          <button
            className={`cursor-pointer rounded-md px-1.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${focusRing}`}
            onClick={editFields}
            type="button"
          >
            Masked fields
          </button>
          <span className="text-[11px] text-neutral-500 tabular-nums">{entries.length}</span>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-lg bg-neutral-100 p-4 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          The request carried no headers.
        </p>
      ) : (
        <dl className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          {entries.map(([name, values]) => (
            <div
              className="grid grid-cols-[minmax(100px,0.75fr)_minmax(0,1.25fr)] gap-4 border-b border-neutral-200 px-3 py-2.5 last:border-b-0 md:grid-cols-[minmax(120px,0.6fr)_minmax(0,1.4fr)] dark:border-neutral-800"
              key={name}
            >
              <dt className="text-[11px] font-bold break-words text-neutral-600 dark:text-neutral-400">
                {name}
              </dt>
              <dd className="flex min-w-0 flex-col gap-1">
                {values.map((value, index) => (
                  <code
                    className={`text-[10px] break-words ${
                      masking.listed(name) ? "text-neutral-500" : ""
                    }`}
                    key={`${name}-${index}`}
                  >
                    {show(masking, name, value)}
                  </code>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {fieldsOpen ? (
        <MaskedFieldsDialog
          maskedFields={settings.data?.maskedFields ?? []}
          onClose={() => setFieldsOpen(false)}
        />
      ) : null}
    </section>
  );
}
