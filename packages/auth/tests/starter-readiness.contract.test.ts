import { describe, expect, it, vi } from "vitest";
import { createInMemoryAdapter, createAuthStarter } from "../src";

function createLevelBAdapter(): any {
  return {
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
  };
}

describe("starter readiness contract", () => {
  it("exposes readiness report and onReport callback when adapter needs attention", async () => {
    const onReport = vi.fn();

    const starter = await createAuthStarter({
      adapter: createLevelBAdapter(),
      adapterReadiness: {
        deployment: "production",
        failOnNeedsAttention: false,
        onReport,
      },
    });

    expect(starter.adapterReadiness?.status).toBe("needs-attention");
    expect(onReport).toHaveBeenCalledTimes(1);

    starter.context.dispose();
    starter.kit.auth.session.dispose();
  });

  it("fails startup when needs-attention is configured as a hard failure", async () => {
    await expect(
      createAuthStarter({
        adapter: createLevelBAdapter(),
        adapterReadiness: {
          deployment: "production",
          failOnNeedsAttention: true,
        },
      })
    ).rejects.toMatchObject({ code: "PUREQ_ADAPTER_NEEDS_ATTENTION" });
  });

  it("passes startup and reports ready with full adapter support", async () => {
    const starter = await createAuthStarter({
      adapter: createInMemoryAdapter(),
      adapterReadiness: {
        deployment: "production",
        requireEmailProviderSupport: true,
      },
    });

    expect(starter.adapterReadiness?.status).toBe("ready");

    starter.context.dispose();
    starter.kit.auth.session.dispose();
  });
});
