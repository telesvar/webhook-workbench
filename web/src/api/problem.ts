import { accessToken, setToken } from "./token";

/**
 * RFC 9457 problem details. Hand-written because it is a standard, not one of our wire types.
 * Every server failure uses this shape, so one error class covers all endpoints.
 */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export class ApiError extends Error {
  readonly problem: ProblemDetail;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? "The request could not be completed.");
    this.name = "ApiError";
    this.problem = problem;
  }
}

async function problemFrom(response: Response): Promise<ProblemDetail> {
  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return {
      title: "Request failed",
      status: response.status,
      detail: "The server returned an unreadable error response.",
    };
  }
}

/**
 * `T` is asserted, not validated. `generated.ts` is emitted from server records and checked on
 * every build, so a validator here would only restate that contract and could drift. The lint
 * override for this file lives in the config.
 */
export async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await send(input, init);
  return (await response.json()) as T;
}

export async function request(input: string, init?: RequestInit): Promise<void> {
  await send(input, init);
}

async function send(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = accessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(input, { ...init, headers });
  if (response.ok) {
    return response;
  }
  if (response.status === 401) {
    // Clear a rejected token so the UI returns to the sign-in prompt.
    setToken(null);
  }
  throw new ApiError(await problemFrom(response));
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.problem.status === 404;
}

export function problemMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.problem.detail ?? error.message;
  }
  return fallback;
}
