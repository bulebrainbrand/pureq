import { describe, expect, it, vi } from "vitest";
import { createAuthKit } from "../src/core/kit";
import {
  createExpressAuthKitPack,
  createFastifyAuthKitPack,
  createNextAuthKitPack,
  createReactAuthKitBootstrapPack,
} from "../src/framework/packs";
import { authMemoryStore } from "../src/storage";

describe("framework packs", () => {
  it("maps next pack handlers to auth kit handlers", async () => {
    const kit = createAuthKit({
      storage: authMemoryStore(),
      session: {
        broadcastChannel: "pureq:test:packs:next",
        instanceId: "pack-next",
      },
    });

    const nextPack = createNextAuthKitPack(kit);
    const response = await nextPack.providers({ headers: {} });
    expect(response.status).toBe(200);

    kit.auth.session.dispose();
  });

  it("maps express and fastify responses", async () => {
    const kit = createAuthKit({
      storage: authMemoryStore(),
      session: {
        broadcastChannel: "pureq:test:packs:server",
        instanceId: "pack-server",
      },
    });

    const express = createExpressAuthKitPack(kit);
    const expressJson = vi.fn();
    const expressStatus = vi.fn(() => ({ setHeader: vi.fn(), json: expressJson } as any));
    const expressRes = {
      status: expressStatus,
      setHeader: vi.fn(),
      json: expressJson,
    };
    await express.providers({ headers: {} }, expressRes as any);
    expect(expressStatus).toHaveBeenCalledWith(200);

    const fastify = createFastifyAuthKitPack(kit);
    const fastifySend = vi.fn();
    const fastifyReply = {
      code: vi.fn(() => ({ header: vi.fn(() => ({ send: fastifySend })), send: fastifySend } as any)),
      header: vi.fn(() => ({ send: fastifySend } as any)),
      send: fastifySend,
    };
    await fastify.providers({ headers: {} }, fastifyReply as any);
    expect(fastifyReply.code).toHaveBeenCalledWith(200);

    kit.auth.session.dispose();
  });

  it("creates react bootstrap hooks pack", async () => {
    const kit = createAuthKit({
      storage: authMemoryStore(),
      session: {
        broadcastChannel: "pureq:test:packs:react",
        instanceId: "pack-react",
      },
    });

    await kit.auth.session.setTokens({ accessToken: "access-pack", refreshToken: "refresh-pack" });
    const hooks = createReactAuthKitBootstrapPack(kit, (_subscribe, getSnapshot) => getSnapshot());
    await hooks.refreshAuthSession();

    const state = hooks.useAuthSession();
    expect(state.data.accessToken).toBe("access-pack");

    hooks.disposeAuthSessionStore();
    kit.auth.session.dispose();
  });
});
