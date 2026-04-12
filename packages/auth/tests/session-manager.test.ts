import { describe, expect, it, vi } from "vitest";
import { authMemoryStore } from "../src/storage";
import { createAuthSessionManager } from "../src/session";

function createUnsignedJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `${header}.${payload}.`;
}

describe("createAuthSessionManager", () => {
  it("emits audit events for token update and logout", async () => {
    const store = authMemoryStore();
    const audit = vi.fn();
    const manager = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:session:audit",
      auditEvent: audit,
    });

    await manager.setTokens({ accessToken: "token-a", refreshToken: "refresh-a" });
    await manager.logout("manual");

    expect(audit).toHaveBeenCalled();
    const eventTypes = audit.mock.calls.map((call) => call[0]?.type);
    expect(eventTypes).toContain("tokens-updated");
    expect(eventTypes).toContain("session-logout");
  });

  it("throws when require-refresh-token policy has no refresh token", async () => {
    const store = authMemoryStore();
    const manager = createAuthSessionManager(store, {
      rotationPolicy: "require-refresh-token",
      broadcastChannel: "pureq:test:session:rotation",
    });

    await expect(manager.rotateTokens({ accessToken: "token-a" })).rejects.toThrow(
      "refresh token is required"
    );
  });

  it("deduplicates concurrent refreshIfNeeded calls", async () => {
    const store = authMemoryStore();
    const manager = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:session:refresh",
    });

    const expired = createUnsignedJwt(Math.floor(Date.now() / 1000) - 5);
    await manager.setTokens({ accessToken: expired, refreshToken: "refresh-a" });

    const next = createUnsignedJwt(Math.floor(Date.now() / 1000) + 3600);
    const refresh = vi.fn(async () => ({ accessToken: next, refreshToken: "refresh-b" }));

    const [a, b] = await Promise.all([
      manager.refreshIfNeeded(refresh, 60_000),
      manager.refreshIfNeeded(refresh, 60_000),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(a.accessToken).toBe(next);
    expect(b.accessToken).toBe(next);
    expect((await manager.getState()).refreshToken).toBe("refresh-b");
  });

  it("forwards session events to exporter", async () => {
    const store = authMemoryStore();
    const exporter = {
      export: vi.fn(),
      dispose: vi.fn(),
    };
    const manager = createAuthSessionManager(store, {
      exporter,
      broadcastChannel: "pureq:test:session:exporter",
    });

    await manager.setTokens({ accessToken: "token-a" });
    await manager.logout("user-action");
    manager.dispose();

    const eventTypes = exporter.export.mock.calls.map((call) => call[0]?.type);
    expect(eventTypes).toContain("tokens-updated");
    expect(eventTypes).toContain("session-logout");
    expect(exporter.dispose).toHaveBeenCalledTimes(1);
  });
});
