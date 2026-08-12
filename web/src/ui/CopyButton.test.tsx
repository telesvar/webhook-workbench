import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./CopyButton";

const writeText = vi.fn<(text: string) => Promise<void>>();

async function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
  // Clipboard write is async, so wait before reading the label.
  await act(async () => {});
}

function wait(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

describe("copy button", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("acknowledges a copy and returns to its resting label", async () => {
    render(<CopyButton text="payload" />);

    await click("Copy");
    expect(writeText).toHaveBeenCalledWith("payload");
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();

    wait(1500);
    expect(screen.getByRole("button", { name: "Copy" })).toBeVisible();
  });

  it("gives a second copy the same acknowledgement as the first", async () => {
    render(<CopyButton text="payload" />);

    await click("Copy");
    wait(1400);
    await click("Copied");

    // The first countdown should not carry over, or this acknowledgement only lasts 100ms.
    wait(1400);
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
    wait(100);
    expect(screen.getByRole("button", { name: "Copy" })).toBeVisible();
  });

  it("says so when the clipboard refuses, and recovers", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<CopyButton text="payload" />);

    await click("Copy");
    expect(screen.getByRole("button", { name: "Copy failed" })).toBeVisible();

    wait(1500);
    expect(screen.getByRole("button", { name: "Copy" })).toBeVisible();
  });
});
