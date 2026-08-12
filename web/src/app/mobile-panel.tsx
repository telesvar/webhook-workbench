import type { ReactNode } from "react";

import { useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";

export type MobilePanel = "inboxes" | "events" | "inspector";

interface MobilePanelValue {
  panel: MobilePanel;
  reachable: Record<MobilePanel, boolean>;
  setPanel: (panel: MobilePanel) => void;
}

const MobilePanelContext = createContext<MobilePanelValue | null>(null);

/**
 * Which of the three columns is visible on narrow viewports.
 *
 * The route picks the default and a tab press overrides until the next navigation.
 * Free-standing panel state used to drift out of sync with the route. Going home from an event
 * left the inspector selected but unreachable, so a tab was both active and disabled.
 */
export function MobilePanelProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<{ at: string; panel: MobilePanel } | null>(null);
  // Matched route ids. `useMatchRoute` fuzzy match does not report parents reliably from root.
  const { pathname, routeIds } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      routeIds: state.matches.map((match) => match.routeId),
    }),
  });

  const onEvent = routeIds.includes("/inboxes/$inboxId/events/$eventId");
  const onInbox = routeIds.includes("/inboxes/$inboxId");
  const fromRoute: MobilePanel = onEvent ? "inspector" : onInbox ? "events" : "inboxes";

  // Tag the override with its path so the next navigation expires it without an effect.
  const panel = override && override.at === pathname ? override.panel : fromRoute;

  return (
    <MobilePanelContext
      value={{
        panel,
        reachable: { inboxes: true, events: onInbox, inspector: onEvent },
        setPanel: (next) => setOverride({ at: pathname, panel: next }),
      }}
    >
      {children}
    </MobilePanelContext>
  );
}

export function useMobilePanel(): MobilePanelValue {
  const value = useContext(MobilePanelContext);
  if (!value) {
    throw new Error("useMobilePanel must be used inside a MobilePanelProvider.");
  }
  return value;
}
