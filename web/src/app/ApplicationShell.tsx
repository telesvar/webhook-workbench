import type { MobilePanel } from "./mobile-panel";

import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";

import { AccessBadge } from "../access/AccessBadge";
import { InboxSidebar } from "../inbox/InboxSidebar";
import { RevealedNotice } from "../mask/RevealedNotice";
import { focusRing } from "../ui/focus";
import { Kbd } from "../ui/Kbd";
import { Logo } from "../ui/Logo";
import { ShortcutSheet } from "../ui/ShortcutSheet";
import { CreateInboxProvider, useCreateInbox } from "./create-inbox";
import { MobilePanelProvider, useMobilePanel } from "./mobile-panel";
import { useGlobalShortcuts } from "./useGlobalShortcuts";

export function ApplicationShell() {
  return (
    <MobilePanelProvider>
      <CreateInboxProvider>
        <ShellLayout />
      </CreateInboxProvider>
    </MobilePanelProvider>
  );
}

const tabs: [panel: MobilePanel, label: string][] = [
  ["inboxes", "Inboxes"],
  ["events", "Events"],
  ["inspector", "Inspector"],
];

function ShellLayout() {
  const { panel, reachable, setPanel } = useMobilePanel();
  const { setCreateInboxOpen } = useCreateInbox();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const notice = useLocation({ select: (location) => location.state.notice });

  useGlobalShortcuts({
    onCreateInbox: () => setCreateInboxOpen(true),
    onShowShortcuts: () => setShortcutsOpen(true),
  });

  return (
    <div className="grid min-h-full grid-rows-[56px_42px_minmax(0,1fr)] bg-white md:grid-rows-[56px_minmax(0,1fr)] dark:bg-neutral-900">
      <header className="z-2 flex items-center gap-4 border-b border-neutral-200 bg-white px-4 md:px-5 dark:border-neutral-800 dark:bg-neutral-900">
        <Link
          aria-label="Webhook Workbench home"
          className={`inline-flex items-center gap-2.5 rounded-md whitespace-nowrap ${focusRing}`}
          to="/"
        >
          <Logo className="size-[22px] text-emerald-700 dark:text-emerald-400" />
          <span className="tracking-tight">
            <strong className="font-semibold">Webhook</strong> Workbench
          </span>
        </Link>

        <div className="ml-auto">
          <RevealedNotice />
        </div>

        <button
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 ${focusRing}`}
          onClick={() => setShortcutsOpen(true)}
          type="button"
        >
          <Kbd>?</Kbd>
          <span className="hidden sm:inline">Shortcuts</span>
        </button>

        <AccessBadge />
      </header>

      <nav
        aria-label="Workspace panels"
        className="grid grid-cols-3 border-b border-neutral-200 bg-white md:hidden dark:border-neutral-800 dark:bg-neutral-900"
      >
        {tabs.map(([value, label]) => (
          <button
            aria-current={panel === value ? "page" : undefined}
            className={`relative cursor-pointer text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${focusRing} ${
              panel === value
                ? "text-emerald-700 after:absolute after:inset-x-[18%] after:bottom-0 after:h-0.5 after:bg-emerald-700 after:content-[''] dark:text-emerald-400 dark:after:bg-emerald-400"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
            disabled={!reachable[value]}
            key={value}
            onClick={() => setPanel(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="relative block h-full min-h-0 md:grid md:grid-cols-[228px_minmax(0,1fr)] lg:grid-cols-[256px_minmax(0,1fr)]">
        {notice ? (
          <p
            className="absolute inset-x-4 top-4 z-10 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 shadow-sm md:inset-x-auto md:left-1/2 md:-translate-x-1/2 dark:bg-emerald-950 dark:text-emerald-300"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        <InboxSidebar />
        <main
          className="h-full min-h-0 min-w-0 max-md:data-[visible=false]:hidden"
          data-visible={panel !== "inboxes"}
        >
          <Outlet />
        </main>
      </div>

      <ShortcutSheet onClose={() => setShortcutsOpen(false)} open={shortcutsOpen} />
    </div>
  );
}
