import type { ReactNode } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";

import { setToken, useToken } from "../api/token";
import { Button } from "../ui/Button";
import { focusRing } from "../ui/focus";
import { Logo } from "../ui/Logo";
import { ProblemBanner } from "../ui/ProblemBanner";
import { tokenIsAccepted } from "./api";
import { sessionQuery } from "./queries";

/**
 * Holds the app until a token is set when the server requires one.
 * A 401 clears the stored token and returns here.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const token = useToken();
  const session = useQuery(sessionQuery);

  if (session.isPending) {
    return null;
  }
  if (session.data?.authenticationRequired && !token) {
    return <SignIn />;
  }
  return children;
}

function SignIn() {
  const [candidate, setCandidate] = useState("");
  const inputId = useId();
  const signIn = useMutation({
    mutationFn: tokenIsAccepted,
    onSuccess: (accepted, value) => {
      if (accepted) {
        setToken(value);
      }
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signIn.mutate(candidate.trim());
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form className="flex w-full max-w-sm flex-col gap-5" onSubmit={submit}>
        <div className="flex flex-col gap-2">
          <Logo />
          <h1 className="text-lg font-bold">Access token required</h1>
          <p className="text-sm text-neutral-500">
            Paste the token this instance was started with. Providers can still deliver webhooks
            without it. This only guards who can read captures.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold" htmlFor={inputId}>
            Access token
          </label>
          <input
            autoComplete="current-password"
            autoFocus
            className={`min-h-10.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900 ${focusRing}`}
            id={inputId}
            name="token"
            onChange={(event) => {
              setCandidate(event.target.value);
              signIn.reset();
            }}
            required
            type="password"
            value={candidate}
          />
        </div>

        {signIn.data === false || signIn.isError ? (
          <ProblemBanner>
            {signIn.isError
              ? "Webhook Workbench could not reach the server. Try again."
              : "That token was not accepted."}
          </ProblemBanner>
        ) : null}

        <Button
          disabled={candidate.trim() === "" || signIn.isPending}
          type="submit"
          variant="primary"
        >
          {signIn.isPending ? "Checking…" : "Continue"}
        </Button>
      </form>
    </main>
  );
}
