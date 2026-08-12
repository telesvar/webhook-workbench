import type { Timestamp } from "../api/generated";

const absolute = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

const clock = new Intl.DateTimeFormat(undefined, { timeStyle: "medium" });

export function formatAbsoluteTimestamp(value: Timestamp): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : absolute.format(date);
}

/**
 * Clock time rather than "2 minutes ago". Bursts in the same second would look identical as
 * relative times, and a slightly fast server clock makes relative times read as the future.
 */
export function formatEventTime(value: Timestamp): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : clock.format(date);
}
