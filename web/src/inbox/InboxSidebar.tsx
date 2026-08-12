import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { useCreateInbox } from "../app/create-inbox";
import { useMobilePanel } from "../app/mobile-panel";
import { Button } from "../ui/Button";
import { focusRing } from "../ui/focus";
import { Icon } from "../ui/Icon";
import { Skeleton } from "../ui/Skeleton";
import { inboxErrorMessage } from "./api";
import { CreateInboxDialog } from "./CreateInboxDialog";
import { inboxesQuery } from "./queries";

export function InboxSidebar() {
  const { createInboxOpen, setCreateInboxOpen } = useCreateInbox();
  const { panel, setPanel } = useMobilePanel();
  const inboxes = useQuery(inboxesQuery());

  return (
    <aside
      aria-label="Inbox navigation"
      className="flex h-full min-h-0 flex-col border-neutral-200 bg-neutral-50 max-md:data-[mobile-visible=false]:hidden md:border-r dark:border-neutral-800 dark:bg-neutral-950"
      data-mobile-visible={panel === "inboxes"}
    >
      <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3 max-md:justify-end">
        <h2 className="text-sm font-semibold tracking-tight max-md:hidden">Inboxes</h2>
        <Button
          aria-label="Create an inbox"
          onClick={() => setCreateInboxOpen(true)}
          size="icon"
          variant="primary"
        >
          <Icon>
            <path d="M10 4v12M4 10h12" />
          </Icon>
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {inboxes.isPending ? <Skeleton lines={4} /> : null}

        {inboxes.isError ? (
          <div className="px-2 py-3 text-xs text-neutral-600 dark:text-neutral-400" role="alert">
            <p>{inboxErrorMessage(inboxes.error)}</p>
            <Button onClick={() => void inboxes.refetch()} variant="quiet">
              Try again
            </Button>
          </div>
        ) : null}

        {inboxes.data?.length === 0 ? (
          <div className="px-2 py-3 text-xs text-neutral-600 dark:text-neutral-400">
            <p>No inboxes yet.</p>
            <button
              className={`cursor-pointer rounded py-1 font-semibold text-emerald-700 dark:text-emerald-400 ${focusRing}`}
              onClick={() => setCreateInboxOpen(true)}
              type="button"
            >
              Create your first inbox
            </button>
          </div>
        ) : null}

        {inboxes.data?.map((inbox) => (
          <Link
            activeProps={{
              className:
                "bg-white shadow-xs inset-ring-1 inset-ring-neutral-200 dark:bg-neutral-800 dark:inset-ring-neutral-700",
            }}
            className={`my-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60 ${focusRing}`}
            key={inbox.id}
            onClick={() => setPanel("events")}
            params={{ inboxId: inbox.id }}
            to="/inboxes/$inboxId"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <strong className="truncate text-[13px] font-medium">{inbox.name}</strong>
              <small className="truncate font-mono text-[10px] text-neutral-500">
                {inbox.slug}
              </small>
            </span>
            <span
              aria-label={`${inbox.eventCount} events`}
              className="text-[11px] text-neutral-500 tabular-nums"
            >
              {inbox.eventCount}
            </span>
          </Link>
        ))}
      </nav>

      <CreateInboxDialog onClose={() => setCreateInboxOpen(false)} open={createInboxOpen} />
    </aside>
  );
}
