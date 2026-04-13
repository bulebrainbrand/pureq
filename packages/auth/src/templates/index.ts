import type {
  AuthPreset,
  MultiTenantAuthPresetFactory,
  MultiTenantAuthPresetFactoryOptions,
  MultiTenantAuthTemplatePack,
  MultiTenantAuthTemplatePackOptions,
  SingleTenantAuthTemplate,
  SingleTenantAuthTemplateOptions,
} from "../shared/index.js";
import { createAuthPreset } from "../presets/index.js";

const singleTenantThreatModel = {
  summary: "Single-tenant web app with cookie-backed session bootstrap and explicit auth middleware composition.",
  assumptions: [
    "Application controls one trust domain for auth cookies.",
    "Session bootstrap runs on trusted server-side entry points.",
  ],
  mitigations: [
    "Secure + SameSite + HttpOnly cookies are enabled by default.",
    "Request/response cookie sync is centralized through adapters.",
  ],
  caveats: [
    "Cross-domain embedding requires revisiting SameSite/secure choices.",
    "Token claims still require endpoint-level authorization checks.",
  ],
} as const;

const multiTenantThreatModel = {
  summary: "Multi-tenant setup with tenant-scoped cookie naming and isolated session channels.",
  assumptions: [
    "Tenant resolution is deterministic and validated before auth usage.",
    "Per-tenant configuration is sourced from trusted control-plane data.",
  ],
  mitigations: [
    "Cookie prefixes are tenant scoped to reduce accidental token overlap.",
    "Session manager instances are isolated per tenant preset.",
  ],
  caveats: [
    "Tenant mis-resolution can still lead to cross-tenant access bugs.",
    "Strong tenant boundary checks are still required in application authorization.",
  ],
} as const;

export function createSingleTenantAuthTemplate(options: SingleTenantAuthTemplateOptions = {}): SingleTenantAuthTemplate {
  const cookiePrefix = options.cookiePrefix ?? "pureq";
  const sameSite = options.sameSite ?? "lax";
  const secure = options.secureCookies ?? true;

  const preset = createAuthPreset({
    ...options,
    bridge: {
      accessTokenCookieName: `${cookiePrefix}_access_token`,
      refreshTokenCookieName: `${cookiePrefix}_refresh_token`,
      sameSite,
      secure,
      httpOnly: true,
      ...(options.bridge ?? {}),
    },
  });

  return {
    kind: "single-tenant",
    preset,
    threatModel: singleTenantThreatModel,
  };
}

/**
 * ARCH-1: Multi-tenant preset factory with LRU cache eviction.
 */
export function createMultiTenantAuthPresetFactory(
  options: MultiTenantAuthPresetFactoryOptions
): MultiTenantAuthPresetFactory {
  const cacheEnabled = options.cache ?? true;
  const maxCacheSize = options.maxCacheSize ?? 100;
  const cache = new Map<string, AuthPreset>();
  // Track insertion order for LRU eviction
  const accessOrder: string[] = [];

  const touchAccess = (tenantId: string): void => {
    const idx = accessOrder.indexOf(tenantId);
    if (idx !== -1) {
      accessOrder.splice(idx, 1);
    }
    accessOrder.push(tenantId);
  };

  const evictIfNeeded = (): void => {
    while (cache.size > maxCacheSize && accessOrder.length > 0) {
      const oldest = accessOrder.shift()!;
      const preset = cache.get(oldest);
      if (preset) {
        preset.session.dispose();
        cache.delete(oldest);
      }
    }
  };

  const createTenantPreset = async (tenantId: string): Promise<AuthPreset> => {
    const tenantOptions = await options.resolveTenantOptions(tenantId);
    return createAuthPreset(tenantOptions);
  };

  return {
    async getTenantPreset(tenantId: string): Promise<AuthPreset> {
      if (!cacheEnabled) {
        return createTenantPreset(tenantId);
      }

      const existing = cache.get(tenantId);
      if (existing) {
        touchAccess(tenantId);
        return existing;
      }

      const preset = await createTenantPreset(tenantId);
      cache.set(tenantId, preset);
      touchAccess(tenantId);
      evictIfNeeded();
      return preset;
    },

    clearTenant(tenantId: string): void {
      const existing = cache.get(tenantId);
      if (existing) {
        existing.session.dispose();
        cache.delete(tenantId);
        const idx = accessOrder.indexOf(tenantId);
        if (idx !== -1) {
          accessOrder.splice(idx, 1);
        }
      }
    },

    clearAll(): void {
      for (const preset of cache.values()) {
        preset.session.dispose();
      }
      cache.clear();
      accessOrder.length = 0;
    },

    dispose(): void {
      this.clearAll();
    },
  };
}

export function createMultiTenantAuthTemplatePack(
  options: MultiTenantAuthTemplatePackOptions
): MultiTenantAuthTemplatePack {
  const factory = createMultiTenantAuthPresetFactory({
    ...(options.cache !== undefined ? { cache: options.cache } : {}),
    ...(options.maxCacheSize !== undefined ? { maxCacheSize: options.maxCacheSize } : {}),
    resolveTenantOptions: async (tenantId) => {
      const resolved = await options.resolveTenantOptions(tenantId);
      const cookiePrefix = resolved.cookiePrefix ?? tenantId;

      return {
        ...resolved,
        bridge: {
          accessTokenCookieName: `${cookiePrefix}_access_token`,
          refreshTokenCookieName: `${cookiePrefix}_refresh_token`,
          httpOnly: true,
          ...(resolved.bridge ?? {}),
        },
      };
    },
  });

  return {
    kind: "multi-tenant",
    factory,
    threatModel: multiTenantThreatModel,
  };
}

export type {
  MultiTenantAuthPresetFactory,
  MultiTenantAuthPresetFactoryOptions,
  MultiTenantAuthTemplatePack,
  MultiTenantAuthTemplatePackOptions,
  SingleTenantAuthTemplate,
  SingleTenantAuthTemplateOptions,
} from "../shared/index.js";
