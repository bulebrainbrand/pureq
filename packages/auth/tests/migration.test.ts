import { describe, expect, it } from "vitest";
import { authMemoryStore } from "../src/storage";
import { createAuthSessionManager } from "../src/session";
import {
  hydrateSessionManagerFromLegacy,
  migrateLegacyTokensToStore,
  normalizeLegacyAuthTokens,
} from "../src/migration";

describe("migration helpers", () => {
  it("normalizes legacy snake_case token payloads", () => {
    const result = normalizeLegacyAuthTokens({
      access_token: "access-1",
      refresh_token: "refresh-1",
    });

    expect(result.source).toBe("legacy-object");
    expect(result.tokens).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("normalizes nested legacy token payloads", () => {
    const result = normalizeLegacyAuthTokens({
      tokens: {
        token: "access-2",
        refresh: "refresh-2",
      },
    });

    expect(result.source).toBe("legacy-nested");
    expect(result.tokens).toEqual({
      accessToken: "access-2",
      refreshToken: "refresh-2",
    });
  });

  it("migrates legacy tokens into an auth store", async () => {
    const store = authMemoryStore();

    const result = await migrateLegacyTokensToStore(store, {
      accessToken: "access-3",
      refreshToken: "refresh-3",
    });

    expect(result.tokens).toEqual({
      accessToken: "access-3",
      refreshToken: "refresh-3",
    });
    expect(await store.get()).toBe("access-3");
    expect(await store.getRefresh()).toBe("refresh-3");
  });

  it("hydrates a session manager from a legacy string payload", async () => {
    const store = authMemoryStore();
    const session = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:migration",
      instanceId: "migration-test",
    });

    const state = await hydrateSessionManagerFromLegacy(session, "access-4");

    expect(state.accessToken).toBe("access-4");
    expect((await session.getState()).accessToken).toBe("access-4");

    session.dispose();
  });
});
