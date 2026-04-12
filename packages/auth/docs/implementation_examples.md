# Implementation Examples

This guide collects end-to-end examples for `@pureq/auth`.

The primary goal is framework neutrality:

- use the core auth primitives first
- keep framework-specific code as a thin transport layer
- treat Next.js, Express, Fastify, and similar integrations as optional shims

## Framework Adaptation Map

All integrations below follow the same pattern:

- read the incoming request
- hand it to `createAuthFrameworkContext()` or the relevant pack
- return the response created by the core layer

| Framework | Best fit | Shape |
| --- | --- | --- |
| Next.js App Router | route handlers | thin wrapper around `createNextAuthKitPack()` |
| Hono / Cloudflare Workers | edge handlers | direct `Request` to `createAuthFrameworkContext()` |
| Remix | loaders/actions | use `createAuthFrameworkContext()` inside loader/action |
| SvelteKit | `+server.ts` / `+page.server.ts` | use `createAuthFrameworkContext()` and `toResponseInit()` |
| Express | router middleware | thin wrapper around `createExpressAuthKitPack()` |
| Fastify | plugin routes | thin wrapper around `createFastifyAuthKitPack()` |
| React / Vue | client session bootstrap | create one session store and reuse it across hooks |

## 1. Framework-Neutral HTTP Handlers

This is the recommended starting point if you want to avoid locking the app to a specific web framework.

```ts
import {
  createAuthKit,
  createInMemoryAdapter,
  credentialsProvider,
} from "@pureq/auth";
import { verify } from "argon2";

async function verifyPassword(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return null;
  }

  const ok = await verify(user.passwordHash, password);
  return ok ? { id: user.id, email: user.email, name: user.name } : null;
}

const kit = createAuthKit({
  security: { mode: "ssr-bff" },
  adapter: createInMemoryAdapter(),
  providers: [
    credentialsProvider({
      authorize: async (credentials) => {
        return verifyPassword(credentials.email, credentials.password);
      },
    }),
  ],
});

async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }
  return request.json().catch(() => undefined);
}

export async function handleAuth(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const action = url.pathname.split("/").filter(Boolean).at(-1) ?? "";

  const requestLike = {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.method === "POST" ? await readJsonBody(request) : undefined,
  };

  if (action === "providers") {
    return kit.handlers.handleSignIn({ ...requestLike, method: "GET" });
  }

  if (action === "signin") {
    return kit.handlers.handleSignIn({ ...requestLike, method: "POST" });
  }

  if (action === "callback") {
    return kit.handlers.handleCallback(requestLike);
  }

  if (action === "session") {
    return kit.handlers.handleSession(requestLike);
  }

  if (action === "signout") {
    return kit.handlers.handleSignOut(requestLike);
  }

  return new Response(JSON.stringify({ error: "not found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}
```

## 2. Server-Side Rendering / BFF Handoff

Use the framework context when you need request bootstrap and response cookie handling without tying the app to a framework API.

```ts
import { createAuthFrameworkContext } from "@pureq/auth";

export async function handleProtectedPage(request: Request): Promise<Response> {
  const context = await createAuthFrameworkContext({ request });
  const state = context.getState();

  if (!state.accessToken) {
    await context.clearSession();
    return new Response("unauthorized", { status: 401 });
  }

  const responseInit = context.toResponseInit({ status: 200 });
  return new Response(JSON.stringify({ ok: true, state }), responseInit);
}
```

## 3. Hono / Cloudflare Workers Example

This keeps the handler layer framework-neutral while showing how to adapt it to edge-style request/response objects.

```ts
import { Hono } from "hono";
import { createAuthFrameworkContext } from "@pureq/auth";

const app = new Hono();

app.get("/auth/session", async (c) => {
  const context = await createAuthFrameworkContext({
    request: {
      headers: c.req.raw.headers,
    },
  });

  return new Response(JSON.stringify({ ok: true, state: context.getState() }), context.toResponseInit({ status: 200 }));
});

app.post("/auth/signout", async (c) => {
  const context = await createAuthFrameworkContext({
    request: {
      headers: c.req.raw.headers,
    },
  });

  await context.clearSession();
  return new Response(JSON.stringify({ ok: true }), context.toResponseInit({ status: 200 }));
});
```

## 4. Remix Example

```ts
import { createAuthFrameworkContext } from "@pureq/auth";

export async function loader({ request }: { request: Request }) {
  const context = await createAuthFrameworkContext({ request });
  return new Response(JSON.stringify({ state: context.getState() }), context.toResponseInit({ status: 200 }));
}

export async function action({ request }: { request: Request }) {
  const context = await createAuthFrameworkContext({ request });
  await context.clearSession();
  return new Response(JSON.stringify({ ok: true }), context.toResponseInit({ status: 200 }));
}
```

## 5. SvelteKit Example

```ts
import { createAuthFrameworkContext } from "@pureq/auth";

export const GET = async ({ request }: { request: Request }) => {
  const context = await createAuthFrameworkContext({ request });
  return new Response(JSON.stringify({ state: context.getState() }), context.toResponseInit({ status: 200 }));
};

export const POST = async ({ request }: { request: Request }) => {
  const context = await createAuthFrameworkContext({ request });
  await context.clearSession();
  return new Response(JSON.stringify({ ok: true }), context.toResponseInit({ status: 200 }));
};
```

## 6. Next.js App Router Example

This is intentionally thin. The app route stays a transport wrapper over the same core handlers.

```ts
import { createAuthKit, createNextAuthKitPack } from "@pureq/auth";

const kit = createAuthKit();
const pack = createNextAuthKitPack(kit);

async function dispatch(action: string, request: Request): Promise<Response> {
  const body = request.method === "POST" ? await request.json().catch(() => undefined) : undefined;

  const requestLike = {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body,
  };

  if (action === "providers") return pack.providers(requestLike);
  if (action === "signin") return pack.signIn(requestLike);
  if (action === "callback") return pack.callback(requestLike);
  if (action === "session") return pack.session(requestLike);
  if (action === "signout") return pack.signOut(requestLike);

  return new Response(null, { status: 404 });
}
```

## 7. Express Example

```ts
import express from "express";
import { createAuthKit, createExpressAuthKitPack } from "@pureq/auth";

const kit = createAuthKit();
const pack = createExpressAuthKitPack(kit);
const router = express.Router();

router.get("/auth/providers", pack.providers);
router.post("/auth/signin", pack.signIn);
router.get("/auth/callback", pack.callback);
router.get("/auth/session", pack.session);
router.post("/auth/signout", pack.signOut);

export default router;
```

## 8. Fastify Example

```ts
import { FastifyInstance } from "fastify";
import { createAuthKit, createFastifyAuthKitPack } from "@pureq/auth";

export async function registerAuthRoutes(app: FastifyInstance) {
  const kit = createAuthKit();
  const pack = createFastifyAuthKitPack(kit);

  app.get("/auth/providers", pack.providers);
  app.post("/auth/signin", pack.signIn);
  app.get("/auth/callback", pack.callback);
  app.get("/auth/session", pack.session);
  app.post("/auth/signout", pack.signOut);
}
```

## 9. Vue / React Session Bootstrap

Use the same session store in any UI framework that can subscribe to external state.

```ts
import {
  createAuthKit,
  createAuthSessionStore,
  createReactAuthHooks,
  createVueAuthSessionComposable,
} from "@pureq/auth";

const kit = createAuthKit();
const sessionStore = createAuthSessionStore(kit.auth.session);

// React
// const hooks = createReactAuthHooks(sessionStore, useSyncExternalStore);
// const session = hooks.useAuthSession();

// Vue
// const useAuthSession = createVueAuthSessionComposable(sessionStore, runtimeBindings);
// const session = useAuthSession();
```

## Notes

- Keep framework code thin and route-specific.
- Use core handlers for auth behavior and framework packs only for request/response adaptation.
- Prefer the framework-neutral example when you want portability across Next.js, Node servers, edge runtimes, and test harnesses.
