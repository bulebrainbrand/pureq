import { describe, expect, it, vi } from "vitest";
import { createAuthKit } from "../src/core/kit";
import { authMemoryStore } from "../src/storage";

async function settleBroadcastTasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createAuthKit security presets", () => {
  it("applies ssr-bff defaults when mode is omitted", async () => {
    const kit = createAuthKit({
      storage: authMemoryStore(),
      session: {
        broadcastChannel: "pureq:test:kit:security:ssr",
        instanceId: "kit-security-ssr",
      },
    });

    await kit.auth.session.setTokens({ accessToken: "token-a", refreshToken: "refresh-a" });
    const state = await kit.auth.session.rotateTokens({ accessToken: "token-b" });
    expect(state.refreshToken).toBe("refresh-a");

    const signOut = await kit.handlers.handleSignOut({ headers: {} });
    const setCookie = signOut.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("HttpOnly");

    kit.auth.session.dispose();
  });

  it("emits policy override diagnostics when user overrides security defaults", () => {
    const onPolicyOverride = vi.fn();

    const kit = createAuthKit({
      storage: authMemoryStore(),
      security: {
        mode: "ssr-bff",
        onPolicyOverride,
      },
      bridge: {
        secure: false,
        httpOnly: false,
        sameSite: "none",
      },
      session: {
        rotationPolicy: "preserve-refresh-token",
        minRefreshIntervalMs: 1,
      },
    });

    expect(onPolicyOverride).toHaveBeenCalled();
    const keys = onPolicyOverride.mock.calls.map((call) => call[0]?.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "bridge.secure",
        "bridge.httpOnly",
        "bridge.sameSite",
        "session.rotationPolicy",
        "session.minRefreshIntervalMs",
      ])
    );

    kit.auth.session.dispose();
  });

  it("validates default-vs-opt-in behavior matrix across runtime modes", async () => {
    const cases = [
      {
        mode: "browser-spa" as const,
        expectHttpOnly: false,
        requiresRefreshTokenByDefault: false,
      },
      {
        mode: "ssr-bff" as const,
        expectHttpOnly: true,
        requiresRefreshTokenByDefault: true,
      },
      {
        mode: "edge" as const,
        expectHttpOnly: true,
        requiresRefreshTokenByDefault: true,
      },
    ];

    for (const testCase of cases) {
      const kit = createAuthKit({
        storage: authMemoryStore(),
        security: {
          mode: testCase.mode,
        },
        session: {
          broadcastChannel: `pureq:test:kit:security:matrix:${testCase.mode}`,
          instanceId: `kit-security-matrix-${testCase.mode}`,
        },
      });

      const signOut = await kit.handlers.handleSignOut({ headers: {} });
      const setCookie = signOut.headers.get("set-cookie") ?? "";
      if (testCase.expectHttpOnly) {
        expect(setCookie).toContain("HttpOnly");
      } else {
        expect(setCookie).not.toContain("HttpOnly");
      }

      if (testCase.requiresRefreshTokenByDefault) {
        await expect(kit.auth.session.rotateTokens({ accessToken: `token-${testCase.mode}` })).rejects.toThrow(
          /refresh token is required/i
        );
      } else {
        await expect(kit.auth.session.rotateTokens({ accessToken: `token-${testCase.mode}` })).resolves.toMatchObject({
          accessToken: `token-${testCase.mode}`,
        });
      }

      const optInOverrideKit = createAuthKit({
        storage: authMemoryStore(),
        security: {
          mode: testCase.mode,
        },
        session: {
          rotationPolicy: "preserve-refresh-token",
          broadcastChannel: `pureq:test:kit:security:matrix:override:${testCase.mode}`,
          instanceId: `kit-security-matrix-override-${testCase.mode}`,
        },
      });

      await expect(
        optInOverrideKit.auth.session.rotateTokens({ accessToken: `override-${testCase.mode}` })
      ).resolves.toMatchObject({
        accessToken: `override-${testCase.mode}`,
      });

      await settleBroadcastTasks();
      kit.auth.session.dispose();
      optInOverrideKit.auth.session.dispose();
    }
  });
});
