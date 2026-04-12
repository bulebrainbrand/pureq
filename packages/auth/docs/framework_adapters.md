# Framework Adapters

`@pureq/auth` provides a framework-neutral adapter layer for route handlers and server-side actions.

Use `createAuthFrameworkContext` when you want one flow to:

- bootstrap session state from an incoming request
- update session tokens in a controlled way
- produce response headers / response init with `Set-Cookie`

## Example

```ts
import { createAuthFrameworkContext } from "@pureq/auth";

const auth = await createAuthFrameworkContext({
  request: {
    headers: {
      cookie: "pureq_access_token=access-1; pureq_refresh_token=refresh-1",
    },
  },
});

await auth.setTokens({
  accessToken: "access-2",
  refreshToken: "refresh-2",
});

const responseInit = auth.toResponseInit({ status: 200 });
```

## Server-to-Client Session Handoff (Typed Seam)

Use `toSessionTransferPayload()` on the server side and pass the payload to hook-side session store initialization.

```ts
const context = await createAuthFrameworkContext({ request });
const transfer = context.toSessionTransferPayload();

// transfer.state can be passed to client bootstrap props/state.
// On the client wrapper side, map it into createAuthSessionStore(..., { transferPayload: transfer }).
```

The payload format is versioned (`pureq-auth-session-transfer/v1`) so adapter and hook layers can evolve without hidden coupling.

## Route Handler Recipe

```ts
import { createAuthFrameworkContext, createAuthRouteHandlerRecipe } from "@pureq/auth";

const context = await createAuthFrameworkContext({ request });
const route = createAuthRouteHandlerRecipe(context);

// success
return route.json({ ok: true }, { status: 200 });

// error
// return route.error(authError);
```

## Server Action Recipe

```ts
import { createAuthFrameworkContext, createAuthServerActionRecipe } from "@pureq/auth";

const context = await createAuthFrameworkContext({ request });
const action = createAuthServerActionRecipe(context);

const result = await action.run(async () => {
  return { saved: true };
});

if (!result.ok) {
  return result;
}

return result;
```

## Error Mapping

Use `mapAuthErrorToHttp(error)` to normalize auth errors for response status handling.

- `PUREQ_AUTH_UNAUTHORIZED` / `PUREQ_AUTH_MISSING_TOKEN`: `401`
- `PUREQ_AUTH_CSRF_INVALID`: `403`
- `PUREQ_OIDC_*`: `400`
- unknown errors: `500`

## API

- `createAuthFrameworkContext(options)`
- `context.getState()`
- `context.refreshState()`
- `context.setTokens(tokens)`
- `context.clearSession()`
- `context.toResponseHeaders(headers?)`
- `context.toResponseInit(init?)`
- `context.toSessionTransferPayload()`
- `createAuthRouteHandlerRecipe(context)`
- `createAuthServerActionRecipe(context)`
- `mapAuthErrorToHttp(error)`
- `context.dispose()`
