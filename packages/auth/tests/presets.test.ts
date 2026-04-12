import { describe, expect, it } from "vitest";
import { createAuthPreset, createAuthRequestAdapter, authMemoryStore } from "../src";

describe("auth presets", () => {
  it("creates a preset around one shared store", async () => {
    const storage = authMemoryStore();
    const preset = createAuthPreset({
      storage,
      session: {
        broadcastChannel: "pureq:test:preset",
        instanceId: "preset",
      },
      bridge: {
        accessTokenCookieName: "auth_access",
        refreshTokenCookieName: "auth_refresh",
      },
    });

    await preset.session.setTokens({ accessToken: "access-1", refreshToken: "refresh-1" });

    const snapshot = preset.bridge.readSession({
      headers: {
        cookie: "auth_access=access-1; auth_refresh=refresh-1",
      },
    });

    expect(snapshot.accessToken).toBe("access-1");
    expect(snapshot.refreshToken).toBe("refresh-1");
    expect(await preset.storage.get()).toBe("access-1");
    expect(await preset.storage.getRefresh()).toBe("refresh-1");

    preset.session.dispose();
  });

  it("bootstraps a request adapter from the incoming request", async () => {
    const adapter = createAuthRequestAdapter({
      bridge: {
        accessTokenCookieName: "auth_access",
        refreshTokenCookieName: "auth_refresh",
      },
    });

    const snapshot = await adapter.bootstrap({
      headers: {
        cookie: "auth_access=access-2; auth_refresh=refresh-2",
      },
    });

    expect(snapshot.accessToken).toBe("access-2");
    expect(snapshot.refreshToken).toBe("refresh-2");
    expect(await adapter.session.getState()).toMatchObject({
      accessToken: "access-2",
      refreshToken: "refresh-2",
    });

    adapter.session.dispose();
  });

  it("builds response headers and response init with Set-Cookie values", () => {
    const adapter = createAuthRequestAdapter();
    const session = {
      accessToken: "access-3",
      refreshToken: "refresh-3",
    };

    const headers = adapter.buildResponseHeaders(session, {
      "x-auth-source": "adapter",
    });
    const setCookie = headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("pureq_access_token=access-3");
    expect(setCookie).toContain("pureq_refresh_token=refresh-3");
    expect(headers.get("x-auth-source")).toBe("adapter");

    const init = adapter.buildResponseInit(session, {
      status: 201,
      headers: {
        "x-auth-source": "adapter",
      },
    });

    expect(init.status).toBe(201);
    expect(new Headers(init.headers).get("set-cookie") ?? "").toContain("pureq_access_token=access-3");

    adapter.session.dispose();
  });
});