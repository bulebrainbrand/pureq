# Framework Packs

Framework packs provide thin integration helpers on top of AuthKit.

## Included Packs

- `createNextAuthKitPack(kit)`
- `createExpressAuthKitPack(kit)`
- `createFastifyAuthKitPack(kit)`
- `createReactAuthKitBootstrapPack(kit, useSyncExternalStore)`

These packs are intentionally small wrappers around `kit.handlers` and `kit.createReactHooks`.

## Next.js Pack

Use the pack methods in route handlers:

- `providers`
- `signIn`
- `callback`
- `session`
- `signOut`

## Express/Fastify Packs

Use the same method names for route wiring. The pack bridges `Response` output into framework response APIs.

## React Bootstrap Pack

Returns the same hooks surface as `kit.createReactHooks` but through a framework-pack entrypoint.

## Notes

- Packs do not replace low-level APIs.
- Keep custom policy logic in AuthKit config (`security`, callbacks, adapters).
