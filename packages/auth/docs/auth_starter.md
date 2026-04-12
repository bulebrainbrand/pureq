# Auth Starter

`createAuthStarter()` is the shortest supported path for getting the core auth pieces in one place.

It bundles:

- `createAuthKit()` for the auth core
- `createAuthRequestAdapter()` for request bootstrap
- `createAuthFrameworkContext()` for request-scoped state
- route and server-action recipes for response handling

## Example

```ts
import { createAuthStarter, authMemoryStore } from "@pureq/auth";

const starter = await createAuthStarter({
  storage: authMemoryStore(),
  security: { mode: "ssr-bff" },
  request: {
    headers: {
      cookie: "pureq_access_token=access-1; pureq_refresh_token=refresh-1",
    },
  },
});

const session = starter.context.getState();
```

## Adapter Preflight

`createAuthStarter()` can run adapter readiness checks before app boot:

```ts
const starter = await createAuthStarter({
  adapter,
  adapterReadiness: {
    deployment: "production",
    requireEmailProviderSupport: true,
    failOnNeedsAttention: true,
    onReport: (report) => {
      console.info("adapter readiness", report.status, report.blockers, report.warnings);
    },
  },
});
```

If readiness is `blocked`, starter creation throws early so misconfigured adapters do not reach runtime traffic.

## When to Use

- Use it for the first integration pass in a new app.
- Use it when you want the gold path to be visible in one object instead of spread across setup calls.
- Drop down to the lower-level APIs once the starter path is stable.