import type { ReactNode } from "react";

import { createContext, useContext, useState } from "react";

interface CreateInboxValue {
  createInboxOpen: boolean;
  setCreateInboxOpen: (open: boolean) => void;
}

const CreateInboxContext = createContext<CreateInboxValue | null>(null);

// Shared so the sidebar dialog and the `c` shortcut open the same flag.
export function CreateInboxProvider({ children }: { children: ReactNode }) {
  const [createInboxOpen, setCreateInboxOpen] = useState(false);

  return (
    <CreateInboxContext value={{ createInboxOpen, setCreateInboxOpen }}>
      {children}
    </CreateInboxContext>
  );
}

export function useCreateInbox(): CreateInboxValue {
  const value = useContext(CreateInboxContext);
  if (!value) {
    throw new Error("useCreateInbox must be used inside a CreateInboxProvider.");
  }
  return value;
}
