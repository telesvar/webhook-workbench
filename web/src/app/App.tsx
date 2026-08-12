import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useState } from "react";

import { AccessGate } from "../access/AccessGate";
import { createApplication } from "./create-application";

export function App() {
  const [{ queryClient, router }] = useState(createApplication);

  return (
    <QueryClientProvider client={queryClient}>
      <AccessGate>
        <RouterProvider router={router} />
      </AccessGate>
    </QueryClientProvider>
  );
}
