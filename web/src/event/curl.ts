import type { EventDetail } from "../api/generated";

// curl sets these itself. A stale value would disagree with the request it sends.
const DERIVED_HEADERS = new Set(["host", "content-length", "connection", "transfer-encoding"]);

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", String.raw`'\''`)}'`;
}

/**
 * Rebuilds the capture as curl aimed at the same inbox.
 * Uses the values that arrived (not masked ones) so the command is runnable as-is.
 * Change the URL to point it at your own handler.
 */
export function curlCommand(event: EventDetail, origin: string): string {
  const parts = [`curl -X ${event.httpMethod} ${shellQuote(`${origin}${event.inbox.endpoint}`)}`];

  if (event.contentType) {
    parts.push(`  -H ${shellQuote(`Content-Type: ${event.contentType}`)}`);
  }
  for (const [name, values] of Object.entries(event.headers)) {
    if (DERIVED_HEADERS.has(name.toLowerCase()) || name.toLowerCase() === "content-type") {
      continue;
    }
    for (const value of values) {
      parts.push(`  -H ${shellQuote(`${name}: ${value}`)}`);
    }
  }
  if (event.body) {
    parts.push(`  --data-raw ${shellQuote(event.body)}`);
  }

  return parts.join(" \\\n");
}
