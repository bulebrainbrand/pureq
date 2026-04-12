# Framework Hooks

`@pureq/auth` provides thin framework-hook wrappers that delegate to the core session store.

These wrappers keep framework specifics at the edge while reusing the same policy-first session primitives.

## React Wrapper

Use `createReactAuthHooks(sessionStore, useSyncExternalStore)`.

```ts
import { createAuthSessionStore, createReactAuthHooks } from "@pureq/auth";
import { useSyncExternalStore } from "react";

const sessionStore = createAuthSessionStore(sessionManager, {
  transferPayload,
});

const auth = createReactAuthHooks(sessionStore, useSyncExternalStore);
const session = auth.useAuthSession();
```

## Vue Wrapper

Use `createVueAuthSessionComposable(sessionStore, runtimeBindings)`.

```ts
import { createAuthSessionStore, createVueAuthSessionComposable } from "@pureq/auth";
import { ref, readonly, onMounted, onBeforeUnmount } from "vue";

const sessionStore = createAuthSessionStore(sessionManager, {
  transferPayload,
});

const useAuthSession = createVueAuthSessionComposable(sessionStore, {
  ref,
  readonly,
  onMounted,
  onBeforeUnmount,
});

const { session } = useAuthSession();
```

## Typed Server/Client Handoff

When used with framework adapters, pass `transferPayload` from server to client bootstrap.

- server: `context.toSessionTransferPayload()`
- client: `createAuthSessionStore(sessionManager, { transferPayload })`
