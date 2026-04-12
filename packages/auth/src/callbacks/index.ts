import type { AuthCallbacks } from "../shared";

/**
 * FEAT-H5: Compose multiple callback registrations into one.
 * Useful for combining app callbacks with plugin callbacks.
 */
export function composeAuthCallbacks(...callbackSets: readonly Partial<AuthCallbacks>[]): AuthCallbacks {
  return {
    async signIn(params) {
      for (const cb of callbackSets) {
        if (cb.signIn) {
          const result = await cb.signIn(params);
          if (result === false) {
            return false;
          }
        }
      }
      return true;
    },
    async signOut(params) {
      for (const cb of callbackSets) {
        await cb.signOut?.(params);
      }
    },
    async createUser(params) {
      for (const cb of callbackSets) {
        await cb.createUser?.(params);
      }
    },
    async linkAccount(params) {
      for (const cb of callbackSets) {
        await cb.linkAccount?.(params);
      }
    },
    async session(params) {
      let session = params.session;
      for (const cb of callbackSets) {
        if (cb.session) {
          session = await cb.session({ ...params, session });
        }
      }
      return session;
    },
    async jwt(params) {
      let token = params.token;
      for (const cb of callbackSets) {
        if (cb.jwt) {
          token = await cb.jwt({ ...params, token });
        }
      }
      return token;
    },
  };
}

export type { AuthCallbacks } from "../shared";
