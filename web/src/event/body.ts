import type { Masking } from "../mask/masking";

import { useSyncExternalStore } from "react";

import { hidden, MASK } from "../mask/masking";

/**
 * Formatted (indented) versus raw bytes. Per tab, like reveal.
 * Starts formatted so dense JSON is easier to read.
 */
let formattedInThisTab = true;
const listeners = new Set<() => void>();

export function toggleFormat() {
  formattedInThisTab = !formattedInThisTab;
  for (const listener of listeners) {
    listener();
  }
}

export function useFormatted(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => formattedInThisTab,
    () => true,
  );
}

export interface RenderedBody {
  text: string;
  /** False when there is nothing to indent. The toggle is then hidden. */
  formattable: boolean;
}

/**
 * Masks by key, then indents if asked. The two are independent, so unmasked "as sent" is the
 * stored bytes. The exception is JSON with a masked value, which is rebuilt from a parse and
 * loses the original whitespace.
 */
export function renderBody(
  body: string,
  contentType: string,
  masking: Masking,
  formatted: boolean,
): RenderedBody {
  const json = parseJson(body);
  if (json !== undefined) {
    const walked = walkJson(json, masking);
    return {
      text:
        walked.changed || formatted ? JSON.stringify(walked.value, null, formatted ? 2 : 0) : body,
      formattable: true,
    };
  }

  if (contentType.toLowerCase().includes("x-www-form-urlencoded")) {
    const masked = maskForm(body, masking);
    // One pair per line, with separators kept so the result still looks like the request.
    return { text: formatted ? masked.replaceAll("&", "\n&") : masked, formattable: true };
  }

  const document = parseXml(body);
  if (document) {
    const changed = maskElement(document.documentElement, masking) > 0;
    if (formatted) {
      return { text: indent(document.documentElement, 0).join("\n"), formattable: true };
    }
    return {
      text: changed ? new XMLSerializer().serializeToString(document) : body,
      formattable: true,
    };
  }

  return { text: body, formattable: false };
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

function walkJson(node: unknown, masking: Masking): { value: unknown; changed: boolean } {
  if (Array.isArray(node)) {
    const items = node.map((item) => walkJson(item, masking));
    return { value: items.map((item) => item.value), changed: items.some((item) => item.changed) };
  }
  if (node === null || typeof node !== "object") {
    return { value: node, changed: false };
  }
  let changed = false;
  const entries = Object.entries(node).map(([key, value]) => {
    if (hidden(masking, key)) {
      changed = true;
      return [key, MASK];
    }
    const walked = walkJson(value, masking);
    changed ||= walked.changed;
    return [key, walked.value];
  });
  return { value: Object.fromEntries(entries), changed };
}

function maskForm(body: string, masking: Masking): string {
  return body
    .split("&")
    .map((pair) => {
      const equals = pair.indexOf("=");
      return equals < 0 || !hidden(masking, decodeName(pair.slice(0, equals)))
        ? pair
        : `${pair.slice(0, equals)}=${MASK}`;
    })
    .join("&");
}

function decodeName(name: string): string {
  try {
    return decodeURIComponent(name.replaceAll("+", " "));
  } catch {
    return name;
  }
}

function parseXml(body: string): Document | undefined {
  if (!body.trimStart().startsWith("<")) {
    return undefined;
  }
  const document = new DOMParser().parseFromString(body, "application/xml");
  return document.querySelector("parsererror") || !document.documentElement ? undefined : document;
}

/**
 * Masking an element hides its subtree and its attributes.
 * Easy miss: a credential on an attribute stays outside the text content.
 */
function maskElement(element: Element, masking: Masking): number {
  const whole = hidden(masking, element.localName);
  let changed = whole ? 1 : 0;

  for (const attribute of element.attributes) {
    if (whole || hidden(masking, attribute.localName)) {
      element.setAttribute(attribute.name, MASK);
      changed++;
    }
  }
  if (whole) {
    element.textContent = MASK;
    return changed;
  }
  for (const child of element.children) {
    changed += maskElement(child, masking);
  }
  return changed;
}

/**
 * Indents element-only content and leaves mixed content on one line.
 * Tags come from the serializer so attributes keep their escaping. Mixed text and children
 * stay whole, because splitting would invent whitespace that is part of the value.
 */
function indent(element: Element, depth: number): string[] {
  const pad = "  ".repeat(depth);
  const serializer = new XMLSerializer();
  const mixed = [...element.childNodes].some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
  );
  if (element.children.length === 0 || mixed) {
    return [pad + serializer.serializeToString(element).replaceAll(/\s*\n\s*/g, " ")];
  }

  const empty = serializer.serializeToString(element.cloneNode(false));
  const open = empty.endsWith("/>")
    ? `${empty.slice(0, -2)}>`
    : empty.slice(0, empty.lastIndexOf("</"));
  return [
    pad + open,
    ...[...element.children].flatMap((child) => indent(child, depth + 1)),
    `${pad}</${element.tagName}>`,
  ];
}
