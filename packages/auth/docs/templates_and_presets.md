# Templates and Presets

This guide covers the opinionated but swappable setup templates in `@pureq/auth`.

## Single-Tenant Template

Use `createSingleTenantAuthTemplate` for a default web-app shape with explicit cookie strategy and core preset wiring.

```ts
import { createSingleTenantAuthTemplate } from "@pureq/auth";

const template = createSingleTenantAuthTemplate({
  cookiePrefix: "app",
  sameSite: "strict",
  secureCookies: true,
});

await template.preset.session.setTokens({
  accessToken: "access-1",
  refreshToken: "refresh-1",
});
```

Threat model notes are included in `template.threatModel` so consumers can audit assumptions and caveats.

## Multi-Tenant Template Pack

Use `createMultiTenantAuthTemplatePack` when tenant-specific cookie naming and session isolation are required.

```ts
import { createMultiTenantAuthTemplatePack } from "@pureq/auth";

const pack = createMultiTenantAuthTemplatePack({
  resolveTenantOptions: async (tenantId) => ({
    cookiePrefix: `tenant_${tenantId}`,
  }),
});

const acme = await pack.factory.getTenantPreset("acme");
```

Threat model notes are available at `pack.threatModel`.

## Why "Opinionated but Swappable"

- opinionated: templates provide defaults for cookie naming and boundary-safe setup
- swappable: templates are built from `createAuthPreset` and `createMultiTenantAuthPresetFactory`, so teams can replace pieces without forking core logic
