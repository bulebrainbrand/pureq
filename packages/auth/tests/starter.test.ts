import { describe, expect, it } from "vitest";
import { createAuthStarter } from "../src";
import { authMemoryStore } from "../src/storage";

describe("createAuthStarter", () => {
  it("shares the default memory store when storage is omitted", async () => {
    const starter = await createAuthStarter({
      security: {
        mode: "ssr-bff",
      },
      session: {
        broadcastChannel: "pureq:test:starter-default",
        instanceId: "starter-default-test",
      },
    });

    await starter.kit.auth.session.setTokens({ accessToken: "default-access", refreshToken: "default-refresh" });
    await starter.context.refreshState();

    expect(starter.context.getState()).toMatchObject({
      accessToken: "default-access",
      refreshToken: "default-refresh",
    });

    starter.context.dispose();
    starter.kit.auth.session.dispose();
  });

  it("bundles the golden path around one setup call", async () => {
    const starter = await createAuthStarter({
      storage: authMemoryStore(),
      security: {
        mode: "ssr-bff",
      },
      session: {
        broadcastChannel: "pureq:test:starter",
        instanceId: "starter-test",
      },
      request: {
        headers: {
          cookie: "pureq_access_token=starter-access; pureq_refresh_token=starter-refresh",
        },
      },
    });

    expect(starter.context.getState()).toMatchObject({
      accessToken: "starter-access",
      refreshToken: "starter-refresh",
    });

    const routeResponse = starter.route.json({ ok: true }, { status: 201 });
    expect(routeResponse.status).toBe(201);
    expect(routeResponse.headers.get("content-type") ?? "").toContain("application/json");

    const actionResult = await starter.action.run(async () => ({ saved: true }));
    expect(actionResult.ok).toBe(true);
    if (actionResult.ok) {
      expect(actionResult.data.saved).toBe(true);
      expect(actionResult.transferPayload.format).toBe("pureq-auth-session-transfer/v1");
    }

    const sessionStore = starter.createSessionStore();
    await sessionStore.refresh();
    expect(sessionStore.getSnapshot()).toMatchObject({
      accessToken: "starter-access",
      refreshToken: "starter-refresh",
    });

    sessionStore.dispose();
    starter.context.dispose();
    starter.kit.auth.session.dispose();
  });

  it("fails fast when adapter readiness is blocked", async () => {
    const minimal = {
      createUser: async () => ({ id: "u1" }),
      getUser: async () => null,
      getUserByEmail: async () => null,
      getUserByAccount: async () => null,
      updateUser: async (user: { id: string }) => user,
      linkAccount: async (account: unknown) => account,
      createSession: async (session: unknown) => session,
      getSessionAndUser: async () => null,
      updateSession: async () => null,
      deleteSession: async () => {},
    } as any;

    await expect(
      createAuthStarter({
        adapter: minimal,
        adapterReadiness: {
          deployment: "production",
          requireEmailProviderSupport: true,
        },
      })
    ).rejects.toMatchObject({ code: "PUREQ_ADAPTER_NOT_READY" });
  });
});