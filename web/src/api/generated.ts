// Generated from Java @WireType records. Edit the records, then regenerate:
//   ./scripts/generate-api-types.sh
//
// ApiTypeContractTest fails the build when this file drifts from the server.

/** An RFC 3339 timestamp, as produced by Java's `Instant`. */
export type Timestamp = string;

/** A canonical UUID string. */
export type Uuid = string;

export interface CaptureReceipt {
  id: Uuid;
  receivedAt: Timestamp;
}

export interface CreateInboxRequest {
  name: string;
}

export interface EventDetail {
  id: Uuid;
  inboxId: Uuid;
  httpMethod: string;
  contentType: string;
  receivedAt: Timestamp;
  inbox: InboxReference;
  headers: Record<string, string[]>;
  body: string;
}

export interface EventPage {
  items: EventSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface EventSummary {
  id: Uuid;
  inboxId: Uuid;
  httpMethod: string;
  contentType: string;
  receivedAt: Timestamp;
}

export interface Inbox {
  id: Uuid;
  name: string;
  slug: string;
  endpoint: string;
  eventCount: number;
  createdAt: Timestamp;
}

export interface InboxReference {
  id: Uuid;
  name: string;
  slug: string;
  endpoint: string;
}

export interface Session {
  authenticationRequired: boolean;
}

export interface Settings {
  maskedFields: string[];
}

export interface WebhookCapturedMessage {
  id: Uuid;
  inboxId: Uuid;
  httpMethod: string;
  contentType: string;
  receivedAt: Timestamp;
  eventCount: number;
}
