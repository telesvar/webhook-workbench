import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// The router drives jsdom's real history, which outlives a test.
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

// jsdom's <dialog> support varies. Only the `open` attribute matters here.
function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
}

function closeDialog(this: HTMLDialogElement) {
  this.removeAttribute("open");
}

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = showModal;
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = closeDialog;
}

/**
 * Every workspace render opens a stream. Without this stub, jsdom spams connection errors.
 * Streaming tests install their own double.
 */
class QuietEventSource {
  readonly url: string | URL;
  readonly withCredentials = false;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;
  readyState = 0;
  onerror: ((this: EventSource, event: Event) => unknown) | null = null;
  onmessage: ((this: EventSource, event: MessageEvent) => unknown) | null = null;
  onopen: ((this: EventSource, event: Event) => unknown) | null = null;

  constructor(url: string | URL) {
    this.url = url;
  }

  addEventListener() {}
  close() {
    this.readyState = this.CLOSED;
  }
  dispatchEvent() {
    return true;
  }
  removeEventListener() {}
}

Object.defineProperty(globalThis, "EventSource", {
  configurable: true,
  writable: true,
  value: QuietEventSource,
});
