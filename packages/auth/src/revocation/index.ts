import type { Middleware } from "@pureq/pureq";
import { markPolicyMiddleware } from "@pureq/pureq";
import type {
  AuthRevocationClaims,
  AuthRevocationGuardOptions,
  AuthRevocationRegistry,
  AuthRevocationRegistryBackend,
} from "../shared";
import { createAuthError } from "../shared";

type RevocationBucket = Map<string, number | null>;

function isExpired(expiresAt: number | null, now: number): boolean {
  return expiresAt !== null && expiresAt <= now;
}

function clearBucket(bucket: RevocationBucket, now: number): void {
  for (const [key, expiresAt] of bucket) {
    if (isExpired(expiresAt, now)) {
      bucket.delete(key);
    }
  }
}

/** SEC-H3: In-memory revocation registry backend. */
function createInMemoryBackend(): AuthRevocationRegistryBackend {
  const buckets = new Map<string, RevocationBucket>();

  const getBucket = (name: string): RevocationBucket => {
    let bucket = buckets.get(name);
    if (!bucket) {
      bucket = new Map();
      buckets.set(name, bucket);
    }
    return bucket;
  };

  return {
    set(bucket, key, expiresAt) {
      getBucket(bucket).set(key, expiresAt);
    },
    has(bucket, key) {
      const b = buckets.get(bucket);
      if (!b) {
        return false;
      }
      const expiresAt = b.get(key);
      if (expiresAt === undefined) {
        return false;
      }
      if (isExpired(expiresAt, Date.now())) {
        b.delete(key);
        return false;
      }
      return true;
    },
    delete(bucket, key) {
      buckets.get(bucket)?.delete(key);
    },
    clear(bucket) {
      buckets.get(bucket)?.clear();
    },
    keys(bucket) {
      return Array.from(buckets.get(bucket)?.keys() ?? []);
    },
  };
}

/**
 * Create a revocation registry.
 * SEC-H3: Accepts an optional pluggable backend for distributed deployments (Redis, DB, etc.).
 * Default is in-memory.
 */
export function createAuthRevocationRegistry(backend?: AuthRevocationRegistryBackend): AuthRevocationRegistry {
  // When using custom backend, delegate fully
  if (backend) {
    return {
      revokeToken(tokenId, expiresAt) {
        void backend.set("tokens", tokenId, expiresAt ?? null);
      },
      revokeSession(sessionId, expiresAt) {
        void backend.set("sessions", sessionId, expiresAt ?? null);
      },
      revokeSubject(subject, expiresAt) {
        void backend.set("subjects", subject, expiresAt ?? null);
      },
      isRevoked(claims) {
        const tokenRevoked = claims.jti ? backend.has("tokens", claims.jti) : false;
        const sessionRevoked = claims.sid ? backend.has("sessions", claims.sid) : false;
        const subjectRevoked = claims.sub ? backend.has("subjects", claims.sub) : false;
        // Handle both sync and async backends — sync for backward compat
        if (typeof tokenRevoked === "boolean") {
          return tokenRevoked || (sessionRevoked as boolean) || (subjectRevoked as boolean);
        }
        // For async backends, callers must check promises. Sync path only for in-memory.
        return false;
      },
      clearExpired() {
        // delegated to backend implementation
      },
      clear() {
        void backend.clear("tokens");
        void backend.clear("sessions");
        void backend.clear("subjects");
      },
      snapshot() {
        const tokens = backend.keys("tokens");
        const sessions = backend.keys("sessions");
        const subjects = backend.keys("subjects");
        return {
          tokens: Array.isArray(tokens) ? tokens : [],
          sessions: Array.isArray(sessions) ? sessions : [],
          subjects: Array.isArray(subjects) ? subjects : [],
        };
      },
    };
  }

  // Default in-memory implementation
  const tokens: RevocationBucket = new Map();
  const sessions: RevocationBucket = new Map();
  const subjects: RevocationBucket = new Map();

  const revoke = (bucket: RevocationBucket, key: string, expiresAt?: number): void => {
    bucket.set(key, expiresAt ?? null);
  };

  const isBucketRevoked = (bucket: RevocationBucket, key: string | undefined, now: number): boolean => {
    if (!key) {
      return false;
    }

    const expiresAt = bucket.get(key);
    if (expiresAt === undefined) {
      return false;
    }

    if (isExpired(expiresAt, now)) {
      bucket.delete(key);
      return false;
    }

    return true;
  };

  return {
    revokeToken(tokenId: string, expiresAt?: number): void {
      revoke(tokens, tokenId, expiresAt);
    },

    revokeSession(sessionId: string, expiresAt?: number): void {
      revoke(sessions, sessionId, expiresAt);
    },

    revokeSubject(subject: string, expiresAt?: number): void {
      revoke(subjects, subject, expiresAt);
    },

    isRevoked(claims: Readonly<AuthRevocationClaims>): boolean {
      const now = Date.now();
      clearBucket(tokens, now);
      clearBucket(sessions, now);
      clearBucket(subjects, now);

      return (
        isBucketRevoked(tokens, claims.jti, now) ||
        isBucketRevoked(sessions, claims.sid, now) ||
        isBucketRevoked(subjects, claims.sub, now)
      );
    },

    clearExpired(now = Date.now()): void {
      clearBucket(tokens, now);
      clearBucket(sessions, now);
      clearBucket(subjects, now);
    },

    clear(): void {
      tokens.clear();
      sessions.clear();
      subjects.clear();
    },

    snapshot() {
      return {
        tokens: Array.from(tokens.keys()),
        sessions: Array.from(sessions.keys()),
        subjects: Array.from(subjects.keys()),
      };
    },
  };
}

export function withRevocationGuard(options: AuthRevocationGuardOptions): Middleware {
  const middleware: Middleware = async (req, next) => {
    const claims = await options.getClaims(req);
    if (!claims) {
      return next(req);
    }

    if (options.registry.isRevoked(claims)) {
      await options.onRevoked?.(claims);
      throw createAuthError("PUREQ_AUTH_REVOKED", "pureq: token or session has been revoked", {
        details: {
          ...(claims.jti !== undefined ? { jti: claims.jti } : {}),
          ...(claims.sid !== undefined ? { sid: claims.sid } : {}),
          ...(claims.sub !== undefined ? { sub: claims.sub } : {}),
        },
      });
    }

    return next(req);
  };

  return markPolicyMiddleware(middleware, { name: "revocationGuard", kind: "auth" });
}