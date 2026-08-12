# Architecture

Webhook Workbench is one Spring Boot process. It receives webhooks, stores them, and serves the UI that reads them back.

## Overview

```text
Browser ──HTTP, SSE──> Spring MVC ──JdbcClient──> MySQL
```

The Maven build copies Vite's output onto the classpath, so one JAR serves the API, webhook endpoints, and UI. There is no second port and no CORS.

Only two paths fall through to `index.html`: `/inboxes/{inboxId}` and `/inboxes/{inboxId}/events/{eventId}`. Anything else that misses a handler is a real error, so a typo'd API or asset path won't quietly render the shell.

Those routes exist because the open event lives in the URL, not in component state.

## Capturing a request

`/hooks/{slug}` accepts any method, content type, and body. Headers and body are stored exactly as they arrived, with no validation, parsing, or redaction on the way in.

One transaction does the work against a locked inbox row: insert the event, prune past the retention limit, and publish to the stream. The lock keeps concurrent captures and pruning from stepping on each other.

Subscribers hear about it only after commit, so the browser never sees a row that later rolls back.

The receipt is written straight to the response instead of returned from the handler. A return value would run content negotiation. A sender with `Accept: text/plain` would then get a 406 *after* the event was stored, treat it as a failed delivery, and retry.

## Live updates

Each browser holds one SSE stream per inbox. A capture arrives as `webhook-captured` with the summary and the inbox's new total, so the client can splice it into the list without refetching.

On reconnect the browser sends `Last-Event-ID` and the server replays everything with a greater id. It sends `reset` instead when the cursor isn't a valid id, when there's too much backlog, or after deletes. The client then refetches.

Delivery is at-least-once. An emitter is registered before its backlog is sent, so a capture in that window can arrive twice and out of order. Clients dedupe by event id and sort with the same key the server uses.

Fan-out is in-memory, so a second instance only serves its own clients. Those clients miss live push until they reconnect and replay from the database.

## Reading a capture

Masking and formatting are separate browser transforms over the stored bytes.

Masking replaces values whose key is on the instance's list (JSON properties at any depth, form names, XML elements and attributes). Bodies with no matchable keys are left alone.

Formatting only indents. Because the two stay independent, an unmasked body is the original string, not a reserialization. The exception is JSON with a masked value, which has to be rebuilt from a parse and loses the sender's whitespace.

Which fields are masked lives on the server and is shared. Whether they're revealed right now is per-tab and never persisted.

## Access

`workbench.access-token` guards `/api`. `/hooks` stays open, because providers don't have a token. The token controls who *reads* captures, not who creates them.

It's accepted as a bearer header or a cookie. The cookie is what lets `EventSource` authenticate, since it can't set headers.

`/api/session` is unauthenticated so the client can learn whether a token is needed at all.

## Data

Three tables: `inboxes`, `webhook_events`, and a single-row `settings`.

Settings are one JSON document. An update writes only the path it owns, so a key added by a newer version survives an older one.

IDs are UUIDv7, stored as `BINARY(16)` and sent as lowercase canonical UUIDs. A v7 id already carries creation time, so there are no timestamp columns. `createdAt` and `receivedAt` are derived from the id to the millisecond. Headers are JSON. The body is text.

Because UUIDv7 sorts by creation time, the id alone orders newest-first paging, retention pruning, and the replay cursor. `web/src/event/cache.ts` sorts by that same key so optimistic edits don't make paging skip or repeat rows.

Reconnect needs no separate cursor lookup for the same reason. The server replays everything with a greater id, so even if the cursor's event was pruned or deleted, the client still lands in the right place.

## Code layout

| Package | Owns |
| --- | --- |
| `inbox` | Identity, naming, slugs |
| `event` | Capture, retention, queries, live delivery |
| `settings` | Masked field list |
| `access` | Token |
| `problem` | Maps exceptions to RFC 9457 |
| `api` | `@WireType` annotation |
| `web` | The two SPA forward paths |

Each feature has one store class for its SQL, row mapping, and locking.

Java records annotated `@WireType` define the wire format. `web/src/api/generated.ts` is generated from them. `ApiTypeContractTest` fails the build if they disagree.

## Native image

Same source, compiled ahead of time, either via `APP_DOCKER_TARGET` or with a GraalVM JDK directly.

AOT infers most controller return types. Two types reach Jackson another way and need explicit binding hints: the SSE message (untyped event data) and the capture receipt (written by hand).

Without those hints a native build can fail where every JVM check still passes. The SSE case is easy to miss, because a failed write looks much like a client that disconnected. `scripts/smoke-application.sh` catches that.
