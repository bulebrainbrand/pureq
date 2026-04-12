import { describe, expect, it, vi } from "vitest";
import { createAuthSessionManager } from "../src/session";
import { authMemoryStore } from "../src/storage";
import { createAuthSessionStore } from "../src/hooks";

describe("auth hooks", () => {
  it("initializes from a server transfer payload", async () => {
    const manager = createAuthSessionManager(authMemoryStore(), {
      broadcastChannel: "pureq:test:hooks:transfer",
      instanceId: "hooks-transfer",
    });

    const store = createAuthSessionStore(manager, {
      transferPayload: {
        format: "pureq-auth-session-transfer/v1",
        issuedAt: Date.now(),
        state: {
          accessToken: "access-transfer",
          refreshToken: null,
        },
        setCookieHeaders: [],
      },
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "access-transfer",
      refreshToken: null,
    });

    store.dispose();
    manager.dispose();
  });

  it("tracks session updates through a subscribable store", async () => {
    const manager = createAuthSessionManager(authMemoryStore(), {
      broadcastChannel: "pureq:test:hooks:session-store",
      instanceId: "hooks-store",
    });
    const store = createAuthSessionStore(manager);
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    await manager.setTokens({ accessToken: "access-1", refreshToken: "refresh-1" });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    expect(listener).toHaveBeenCalled();

    await manager.logout("test");
    expect(store.getSnapshot()).toMatchObject({
      accessToken: null,
      refreshToken: null,
    });

    unsubscribe();
    store.dispose();
    manager.dispose();
  });
});
