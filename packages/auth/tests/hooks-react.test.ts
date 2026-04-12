import { describe, expect, it } from "vitest";
import { createAuthSessionManager } from "../src/session";
import { authMemoryStore } from "../src/storage";
import { createAuthSessionStore } from "../src/hooks";
import { createReactAuthHooks } from "../src/hooks/react";

describe("react hook wrappers", () => {
  it("provides useAuthSession via injected useSyncExternalStore", async () => {
    const manager = createAuthSessionManager(authMemoryStore(), {
      broadcastChannel: "pureq:test:hooks:react",
      instanceId: "hooks-react",
    });

    const sessionStore = createAuthSessionStore(manager);
    await manager.setTokens({ accessToken: "access-react", refreshToken: "refresh-react" });

    const hooks = createReactAuthHooks(sessionStore, (_subscribe, getSnapshot) => getSnapshot());
    const state = hooks.useAuthSession();

    expect(state).toMatchObject({
      status: "authenticated",
      data: {
        accessToken: "access-react",
        refreshToken: "refresh-react",
      },
    });

    await hooks.refreshAuthSession();
    hooks.disposeAuthSessionStore();
    manager.dispose();
  });
});
