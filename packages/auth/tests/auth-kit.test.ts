import { describe, expect, it } from "vitest";
import { createAuthKit } from "../src/core/kit";
import { authMemoryStore } from "../src/storage";

async function settleBroadcastTasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createAuthKit", () => {
  it("wires core handlers and creates a refreshable session store", async () => {
    const kit = createAuthKit({
      storage: authMemoryStore(),
      session: {
        broadcastChannel: "pureq:test:kit:store",
        instanceId: "kit-store",
      },
    });

    const providersResponse = await kit.handlers.handleSignIn({ method: "GET", headers: {} });
    expect(providersResponse.status).toBe(200);

    await kit.auth.session.setTokens({ accessToken: "kit-access", refreshToken: "kit-refresh" });
    const store = kit.createSessionStore();
    await store.refresh();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "kit-access",
      refreshToken: "kit-refresh",
    });

    store.dispose();
    await settleBroadcastTasks();
    kit.auth.session.dispose();
  });

  it("creates React and Vue integration helpers from the same auth instance", async () => {
    const kit = createAuthKit({
      storage: authMemoryStore(),
      session: {
        broadcastChannel: "pureq:test:kit:framework",
        instanceId: "kit-framework",
      },
    });

    await kit.auth.session.setTokens({ accessToken: "framework-access", refreshToken: "framework-refresh" });

    const reactHooks = kit.createReactHooks((_subscribe, getSnapshot) => getSnapshot());
    const initialReactState = reactHooks.useAuthSession();
    expect(initialReactState.status).toBe("loading");
    await reactHooks.refreshAuthSession();
    const reactState = reactHooks.useAuthSession();
    expect(reactState.status).toBe("authenticated");
    expect(reactState.data.accessToken).toBe("framework-access");

    const runtime = {
      ref<T>(value: T) {
        return { value };
      },
    };

    const useVueSession = kit.createVueSessionComposable(runtime);
    const vueComposable = useVueSession();
    await vueComposable.refreshAuthSession();
    expect(vueComposable.session.value.accessToken).toBe("framework-access");

    reactHooks.disposeAuthSessionStore();
    vueComposable.disposeAuthSessionStore();
    await settleBroadcastTasks();
    kit.auth.session.dispose();
  });
});
