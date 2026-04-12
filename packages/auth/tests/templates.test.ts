import { describe, expect, it, vi } from "vitest";
import {
  createMultiTenantAuthPresetFactory,
  createMultiTenantAuthTemplatePack,
  createSingleTenantAuthTemplate,
} from "../src/templates";

describe("auth templates", () => {
  it("creates a single-tenant template with threat model and cookie strategy", async () => {
    const template = createSingleTenantAuthTemplate({
      cookiePrefix: "app",
      secureCookies: true,
      sameSite: "strict",
      session: {
        broadcastChannel: "pureq:test:single-template",
        instanceId: "single-template",
      },
    });

    expect(template.kind).toBe("single-tenant");
    expect(template.threatModel.summary.length).toBeGreaterThan(0);

    await template.preset.session.setTokens({ accessToken: "access-s", refreshToken: "refresh-s" });
    const cookieHeaders = template.preset.bridge.buildSetCookieHeaders(await template.preset.session.getState());
    expect(cookieHeaders[0]).toContain("app_access_token=");
    expect(cookieHeaders[0]).toContain("SameSite=strict");

    template.preset.session.dispose();
  });

  it("creates and caches per-tenant presets", async () => {
    const resolveTenantOptions = vi.fn(async (tenantId: string) => ({
      bridge: {
        accessTokenCookieName: `${tenantId}_access`,
        refreshTokenCookieName: `${tenantId}_refresh`,
      },
      session: {
        broadcastChannel: `pureq:test:tenant:${tenantId}`,
        instanceId: `tenant-${tenantId}`,
      },
    }));

    const factory = createMultiTenantAuthPresetFactory({ resolveTenantOptions, cache: true });
    const a1 = await factory.getTenantPreset("tenant-a");
    const a2 = await factory.getTenantPreset("tenant-a");
    const b = await factory.getTenantPreset("tenant-b");

    expect(resolveTenantOptions).toHaveBeenCalledTimes(2);
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);

    await a1.session.setTokens({ accessToken: "a-token", refreshToken: "a-refresh" });
    await b.session.setTokens({ accessToken: "b-token", refreshToken: "b-refresh" });

    expect(a1.bridge.readSession({ headers: { cookie: "tenant-a_access=a-token; tenant-a_refresh=a-refresh" } })).toMatchObject({
      accessToken: "a-token",
      refreshToken: "a-refresh",
    });
    expect(b.bridge.readSession({ headers: { cookie: "tenant-b_access=b-token; tenant-b_refresh=b-refresh" } })).toMatchObject({
      accessToken: "b-token",
      refreshToken: "b-refresh",
    });

    factory.dispose();
  });

  it("creates multi-tenant template pack with tenant-scoped cookie names", async () => {
    const pack = createMultiTenantAuthTemplatePack({
      cache: true,
      resolveTenantOptions: async (tenantId) => ({
        cookiePrefix: `tenant_${tenantId}`,
        session: {
          broadcastChannel: `pureq:test:pack:${tenantId}`,
          instanceId: `pack-${tenantId}`,
        },
      }),
    });

    expect(pack.kind).toBe("multi-tenant");
    expect(pack.threatModel.mitigations.length).toBeGreaterThan(0);

    const preset = await pack.factory.getTenantPreset("acme");
    await preset.session.setTokens({ accessToken: "acme-a", refreshToken: "acme-r" });

    const cookieHeaders = preset.bridge.buildSetCookieHeaders(await preset.session.getState());
    expect(cookieHeaders[0]).toContain("tenant_acme_access_token=");
    expect(cookieHeaders[1]).toContain("tenant_acme_refresh_token=");

    pack.factory.dispose();
  });
});
