import type { AuthDebugLogger } from "../shared/index.js";

/**
 * FEAT-L1: Debug logger for auth operations.
 * When enabled, logs all middleware, session, and OIDC operations.
 */
export function createAuthDebugLogger(
  enabled = false,
  logger: Pick<Console, "log" | "warn" | "error"> = console
): AuthDebugLogger {
  return {
    enabled,
    log(category: string, message: string, data?: unknown): void {
      if (!enabled) {
        return;
      }
      if (data !== undefined) {
        logger.log(`[pureq/auth/${category}]`, message, data);
      } else {
        logger.log(`[pureq/auth/${category}]`, message);
      }
    },
  };
}

export type { AuthDebugLogger } from "../shared/index.js";
