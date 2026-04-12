import { describe, expect, it } from "vitest";
import { authMemoryStore } from "../src/storage";
import { createAuthSessionManager } from "../src/session";
import { createAuthBridge } from "../src/bridge";

describe("createAuthBridge", () => {
  it("reads access token from cookie header", () => {
    const bridge = createAuthBridge({
      accessTokenCookieName: "auth_access",
      refreshTokenCookieName: "auth_refresh",
    });

    const snapshot = bridge.readSession({
      headers: {
        cookie: "auth_access=access-1; auth_refresh=refresh-1",
      },
    });

    expect(snapshot.accessToken).toBe("access-1");
    expect(snapshot.refreshToken).toBe("refresh-1");
  });

  it("falls back to bearer authorization when cookie is missing", () => {
    const bridge = createAuthBridge();

    const snapshot = bridge.readSession({
      headers: {
        authorization: "Bearer access-2",
      },
    });

    expect(snapshot.accessToken).toBe("access-2");
    expect(snapshot.refreshToken).toBeNull();
  });

  it("builds set-cookie headers for session snapshot", () => {
    const bridge = createAuthBridge({
      accessTokenCookieName: "auth_access",
      refreshTokenCookieName: "auth_refresh",
      cookiePath: "/",
      sameSite: "lax",
      secure: false,
    });

    const headers = bridge.buildSetCookieHeaders({
      accessToken: "access-3",
      refreshToken: "refresh-3",
    });

    expect(headers).toHaveLength(2);
    expect(headers[0]).toContain("auth_access=access-3");
    expect(headers[1]).toContain("auth_refresh=refresh-3");
  });

  it("hydrates a session manager from request headers", async () => {
    const bridge = createAuthBridge({
      accessTokenCookieName: "auth_access",
      refreshTokenCookieName: "auth_refresh",
    });
    const session = createAuthSessionManager(authMemoryStore(), {
      broadcastChannel: "pureq:test:bridge",
      instanceId: "bridge-test",
    });

    await bridge.hydrateSessionManager(session, {
      headers: {
        cookie: "auth_access=access-4; auth_refresh=refresh-4",
      },
    });

    const state = await session.getState();
    expect(state.accessToken).toBe("access-4");
    expect(state.refreshToken).toBe("refresh-4");

    session.dispose();
  });
});
