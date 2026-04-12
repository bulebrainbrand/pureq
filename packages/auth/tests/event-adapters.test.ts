import { describe, expect, it, vi } from "vitest";
import { authMemoryStore } from "../src/storage";
import { createAuthEventAdapter, composeAuthEventListeners, createAuthSessionManager } from "../src";

describe("createAuthEventAdapter", () => {
  it("routes event types to the matching callbacks", async () => {
    const onEvent = vi.fn();
    const onLogout = vi.fn();
    const adapter = createAuthEventAdapter({
      onEvent,
      onSessionLogout: onLogout,
    });

    await adapter.dispatch({
      type: "session-logout",
      at: Date.now(),
      source: "local",
      reason: "manual",
    });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("allows multiple listeners to be composed", async () => {
    const first = vi.fn();
    const second = vi.fn();

    const listener = composeAuthEventListeners(first, second);
    await listener({
      type: "tokens-cleared",
      at: Date.now(),
      source: "local",
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("can be attached to a session manager", async () => {
    const onLogout = vi.fn();
    const adapter = createAuthEventAdapter({
      onSessionLogout: onLogout,
    });
    const session = createAuthSessionManager(authMemoryStore(), {
      broadcastChannel: "pureq:test:event-adapters",
    });

    const unsubscribe = session.onEvent(adapter.listener);
    await session.logout("manual");
    unsubscribe();
    session.dispose();

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});