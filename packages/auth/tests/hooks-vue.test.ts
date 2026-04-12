import { describe, expect, it } from "vitest";
import { createAuthSessionManager } from "../src/session";
import { authMemoryStore } from "../src/storage";
import { createAuthSessionStore } from "../src/hooks";
import { createVueAuthSessionComposable } from "../src/hooks/vue";

describe("vue composable wrappers", () => {
  it("provides useAuthSession composable via injected vue runtime bindings", async () => {
    const manager = createAuthSessionManager(authMemoryStore(), {
      broadcastChannel: "pureq:test:hooks:vue",
      instanceId: "hooks-vue",
    });

    const sessionStore = createAuthSessionStore(manager);
    await manager.setTokens({ accessToken: "access-vue", refreshToken: "refresh-vue" });

    const useAuthSession = createVueAuthSessionComposable(sessionStore, {
      ref: <T>(value: T) => ({ value }),
      readonly: <T>(value: { value: T }) => value,
    });

    const composable = useAuthSession();
    expect(composable.session.value).toMatchObject({
      accessToken: "access-vue",
      refreshToken: "refresh-vue",
    });

    await manager.setTokens({ accessToken: "access-vue-2", refreshToken: "refresh-vue-2" });
    expect(composable.session.value).toMatchObject({
      accessToken: "access-vue-2",
      refreshToken: "refresh-vue-2",
    });

    await composable.refreshAuthSession();
    composable.disposeAuthSessionStore();
    manager.dispose();
  });
});
