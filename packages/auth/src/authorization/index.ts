import type { Middleware } from "@pureq/pureq";
import { markPolicyMiddleware } from "@pureq/pureq";
import type { AuthAuthorization, AuthAuthorizationOptions, AuthSessionState } from "../shared";
import { buildAuthError } from "../shared";
import { decodeJwt } from "../jwt";

/**
 * FEAT-M1: Create RBAC authorization helpers.
 * Provides role checking and middleware for protecting routes by role.
 */
export function createAuthorization<TRole extends string = string>(
  options: AuthAuthorizationOptions<TRole>
): AuthAuthorization<TRole> {
  const extractRoles = options.extractRoles;

  return {
    hasRole(session: AuthSessionState, role: TRole): boolean {
      const roles = extractRoles(session);
      return roles.includes(role);
    },

    hasAnyRole(session: AuthSessionState, roles: readonly TRole[]): boolean {
      const userRoles = extractRoles(session);
      return roles.some((r) => userRoles.includes(r));
    },

    requireRole(role: TRole): Middleware {
      const middleware: Middleware = async (req, next) => {
        // Extract session state from Authorization header token
        const authHeader = req.headers?.["Authorization"] ?? req.headers?.["authorization"] ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");

        if (!token) {
          throw buildAuthError("PUREQ_AUTH_MISSING_TOKEN", "pureq: no access token for role check");
        }

        let session: AuthSessionState;
        try {
          const claims = decodeJwt<Record<string, unknown>>(token);
          session = {
            accessToken: token,
            refreshToken: null,
            ...claims,
          };
        } catch {
          session = { accessToken: token, refreshToken: null };
        }

        const roles = extractRoles(session);
        if (!roles.includes(role)) {
          throw buildAuthError("PUREQ_AUTH_FORBIDDEN", `pureq: required role "${role}" not found`);
        }

        return next(req);
      };

      return markPolicyMiddleware(middleware, { name: `requireRole:${role}`, kind: "auth" });
    },
  };
}

export type { AuthAuthorization, AuthAuthorizationOptions } from "../shared";
