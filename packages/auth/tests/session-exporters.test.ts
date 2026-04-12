import { describe, expect, it, vi } from "vitest";
import {
  composeSessionEventAudits,
  createBufferedSessionEventExporter,
  createConsoleSessionEventAudit,
} from "../src/session";

describe("session event exporters", () => {
  it("composes multiple audits in order", async () => {
    const calls: string[] = [];
    const first = vi.fn(async () => {
      calls.push("first");
    });
    const second = vi.fn(async () => {
      calls.push("second");
    });

    const audit = composeSessionEventAudits(first, second);
    await audit({
      type: "tokens-updated",
      at: Date.now(),
      source: "local",
      state: {
        accessToken: "token-a",
        refreshToken: null,
      },
    });

    expect(calls).toEqual(["first", "second"]);
  });

  it("flushes buffered events when threshold is reached", async () => {
    const sink = vi.fn(async () => undefined);
    const exporter = createBufferedSessionEventExporter({
      sink,
      flushSize: 2,
    });

    exporter.auditEvent({
      type: "tokens-updated",
      at: Date.now(),
      source: "local",
      state: {
        accessToken: "token-a",
        refreshToken: "refresh-a",
      },
    });
    exporter.auditEvent({
      type: "session-logout",
      at: Date.now(),
      source: "local",
      reason: "manual",
    });

    await exporter.flush();

    expect(sink).toHaveBeenCalledTimes(1);
    const flushed = sink.mock.calls[0]?.[0];
    expect(Array.isArray(flushed)).toBe(true);
    expect(flushed).toHaveLength(2);
    expect(exporter.snapshot()).toHaveLength(0);
  });

  it("formats console audit payload", async () => {
    const logger = {
      info: vi.fn(),
    };
    const audit = createConsoleSessionEventAudit(logger);

    await audit({
      type: "session-refresh-failed",
      at: 123,
      source: "remote",
      errorMessage: "boom",
    });

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("[pureq/auth/session]", {
      type: "session-refresh-failed",
      source: "remote",
      at: 123,
      errorMessage: "boom",
    });
  });
});