# pureq

Functional, immutable, and type-safe HTTP transport layer for TypeScript.

[Getting Started](./docs/getting_started.md) | [Documentation](./docs/README.md) | [Middleware Reference](./docs/middleware_reference.md) | [GitHub](https://github.com/shiro-shihi/pureq)

---

pureq is a policy-first transport layer that makes HTTP behavior explicit, composable, and observable across frontend, BFF, backend, and edge runtimes.

```ts
import { createClient, retry, circuitBreaker, dedupe } from "@pureq/pureq";

const api = createClient({ baseURL: "https://api.example.com" })
  .use(dedupe())
  .use(retry({ maxRetries: 2, delay: 200 }))
  .use(circuitBreaker({ failureThreshold: 5, cooldownMs: 30_000 }));

const user = await api.getJson<User>("/users/:id", { params: { id: "42" } });
```

## Highlights

- Immutable client composition
- Onion model middleware
- Typed path params
- Result-based error handling
- No runtime dependencies
- Works in Node, browser, and edge runtimes

## Documentation

- [Getting Started](./docs/getting_started.md)
- [Core Concepts](./docs/core_concepts.md)
- [API Reference](./docs/api_reference.md)
- [Middleware Reference](./docs/middleware_reference.md)
- [Error Handling](./docs/error_handling.md)
- [Observability](./docs/observability.md)
- [Migration Guide](./docs/migration_guide.md)
- [Benchmarks](./docs/benchmarks.md)

## License

MIT
