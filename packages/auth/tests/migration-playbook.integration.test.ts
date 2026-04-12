import { describe, expect, it } from "vitest";
import {
  authMemoryStore,
  createAuthFrameworkContext,
  createAuthSessionManager,
  createAuthSessionStore,
  createReactAuthHooks,
  hydrateSessionManagerFromLegacy,
  migrateLegacyTokensToStore,
} from "../src";

describe("migration playbook integration", () => {
  it("migrates legacy payload to store/session and transfers server state to client hook bootstrap", async () => {
    const store = authMemoryStore();
    const session = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:migration-playbook",
      instanceId: "migration-playbook",
    });

    const legacyPayload = {
      tokens: {
        access_token: "access-migrate",
        refresh_token: "refresh-migrate",
      },
    };

    const migrated = await migrateLegacyTokensToStore(store, legacyPayload);
    expect(migrated.tokens).toMatchObject({
      accessToken: "access-migrate",
      refreshToken: "refresh-migrate",
    });

    await hydrateSessionManagerFromLegacy(session, legacyPayload);

    const context = await createAuthFrameworkContext({ storage: store });
    await context.refreshState();
    const transfer = context.toSessionTransferPayload();

    const clientStore = createAuthSessionStore(session, { transferPayload: transfer });
    const hooks = createReactAuthHooks(clientStore, (_subscribe, getSnapshot) => getSnapshot());

    await hooks.refreshAuthSession();
    expect(hooks.useAuthSession()).toMatchObject({
      status: "authenticated",
      data: {
        accessToken: "access-migrate",
        refreshToken: "refresh-migrate",
      },
    });

    hooks.disposeAuthSessionStore();
    context.dispose();
    session.dispose();
  });
});
