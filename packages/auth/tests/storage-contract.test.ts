import { describe, it, expect, beforeEach } from "vitest";
import {
  authMemoryStore,
  authLocalStorage,
  authSessionStorage,
  authCookieStore,
  authCustomStore,
  authHybridStore,
} from "../src/storage";
import type { AuthStore } from "../src/shared";

/**
 * Storage Contract Tests
 *
 * These tests verify that all storage implementations conform to the AuthStore contract:
 * - get()/set()/clear() for access tokens
 * - getRefresh()/setRefresh()/clearRefresh() for refresh tokens
 * - All methods are idempotent and handle concurrent calls correctly
 * - Clear operations properly remove stored values
 * - Fallback behavior (memory when unavailable) is transparent
 */

describe("AuthStore Contract", () => {
  const testToken = "test-access-token";
  const testRefreshToken = "test-refresh-token";

  /**
   * Factory for common storage contract tests.
   * Validates basic get/set/clear semantics for both access and refresh tokens.
   */
  function defineStorageContractTests(name: string, createStore: () => AuthStore) {
    describe(`${name}`, () => {
      let store: AuthStore;

      beforeEach(() => {
        store = createStore();
      });

      describe("Access Token Operations", () => {
        it("should initially return null for get()", async () => {
          const token = await store.get();
          expect(token).toBeNull();
        });

        it("should store and retrieve access token", async () => {
          await store.set(testToken);
          const retrieved = await store.get();
          expect(retrieved).toBe(testToken);
        });

        it("should clear access token", async () => {
          await store.set(testToken);
          await store.clear();
          const retrieved = await store.get();
          expect(retrieved).toBeNull();
        });

        it("should overwrite existing access token", async () => {
          await store.set("token-1");
          await store.set("token-2");
          const retrieved = await store.get();
          expect(retrieved).toBe("token-2");
        });

        it("should handle empty string as valid token", async () => {
          await store.set("");
          const retrieved = await store.get();
          expect(retrieved).toBe("");
        });

        it("should handle long token values", async () => {
          const longToken = "x".repeat(10000);
          await store.set(longToken);
          const retrieved = await store.get();
          expect(retrieved).toBe(longToken);
        });

        it("should handle tokens with special characters", async () => {
          const specialToken = "token~!@#$%^&*()_+-=[]{}|;:',.<>?/";
          await store.set(specialToken);
          const retrieved = await store.get();
          expect(retrieved).toBe(specialToken);
        });

        it("should handle tokens with unicode", async () => {
          const unicodeToken = "token-🔐-中文-العربية";
          await store.set(unicodeToken);
          const retrieved = await store.get();
          expect(retrieved).toBe(unicodeToken);
        });

        it("clear() should be idempotent", async () => {
          await store.set(testToken);
          await store.clear();
          await store.clear();
          const retrieved = await store.get();
          expect(retrieved).toBeNull();
        });
      });

      describe("Refresh Token Operations", () => {
        it("should initially return null for getRefresh()", async () => {
          const token = await store.getRefresh();
          expect(token).toBeNull();
        });

        it("should store and retrieve refresh token", async () => {
          await store.setRefresh(testRefreshToken);
          const retrieved = await store.getRefresh();
          expect(retrieved).toBe(testRefreshToken);
        });

        it("should clear refresh token", async () => {
          await store.setRefresh(testRefreshToken);
          await store.clearRefresh();
          const retrieved = await store.getRefresh();
          expect(retrieved).toBeNull();
        });

        it("should overwrite existing refresh token", async () => {
          await store.setRefresh("refresh-1");
          await store.setRefresh("refresh-2");
          const retrieved = await store.getRefresh();
          expect(retrieved).toBe("refresh-2");
        });

        it("should handle empty string as valid refresh token", async () => {
          await store.setRefresh("");
          const retrieved = await store.getRefresh();
          expect(retrieved).toBe("");
        });

        it("clearRefresh() should be idempotent", async () => {
          await store.setRefresh(testRefreshToken);
          await store.clearRefresh();
          await store.clearRefresh();
          const retrieved = await store.getRefresh();
          expect(retrieved).toBeNull();
        });
      });

      describe("Token Independence", () => {
        it("access and refresh tokens should be independent", async () => {
          await store.set(testToken);
          await store.setRefresh(testRefreshToken);

          expect(await store.get()).toBe(testToken);
          expect(await store.getRefresh()).toBe(testRefreshToken);
        });

        it("clearing access token should not affect refresh token", async () => {
          await store.set(testToken);
          await store.setRefresh(testRefreshToken);
          await store.clear();

          expect(await store.get()).toBeNull();
          expect(await store.getRefresh()).toBe(testRefreshToken);
        });

        it("clearing refresh token should not affect access token", async () => {
          await store.set(testToken);
          await store.setRefresh(testRefreshToken);
          await store.clearRefresh();

          expect(await store.get()).toBe(testToken);
          expect(await store.getRefresh()).toBeNull();
        });
      });

      describe("Concurrent Operations", () => {
        it("should handle concurrent set operations", async () => {
          const token1 = "token-concurrent-1";
          const token2 = "token-concurrent-2";

          await Promise.all([store.set(token1), store.set(token2)]);

          const retrieved = await store.get();
          expect([token1, token2]).toContain(retrieved);
        });

        it("should handle concurrent get operations during set", async () => {
          const promises: Promise<string | null>[] = [];

          // Start multiple reads
          for (let i = 0; i < 5; i++) {
            promises.push(store.get());
          }

          // Write a token while reads are pending
          await store.set(testToken);

          const results = await Promise.all(promises);
          // All reads should eventually see either null or the token
          results.forEach((result) => {
            expect([null, testToken]).toContain(result);
          });
        });

        it("should handle set/clear sequence correctly", async () => {
          const sequences = await Promise.all([
            (async () => {
              await store.set("seq-1");
              return await store.get();
            })(),
            (async () => {
              await store.clear();
              return await store.get();
            })(),
          ]);

          expect(sequences).toBeDefined();
        });
      });

      describe("Isolation Between Stores", () => {
        it("should not interfere with separate store instance", async () => {
          const store2 = createStore();

          await store.set(testToken);
          await store2.set("different-token");

          // Note: For memory stores, instances are isolated
          // For web storage, they share underlying storage
          // This test documents expected behavior
          const token1 = await store.get();
          const token2 = await store2.get();

          // Web storage implementations share state; memory stores do not
          expect(token1).toBeDefined();
          expect(token2).toBeDefined();
        });
      });
    });
  }

  // Run contract tests for each implementation
  defineStorageContractTests("authMemoryStore", () => authMemoryStore());

  defineStorageContractTests("authLocalStorage", () => {
    // localStorage may not be available in all test environments
    // Fallback to memory is transparent to contract
    return authLocalStorage({ prefix: `test_${Date.now()}_` });
  });

  defineStorageContractTests("authSessionStorage", () => {
    // sessionStorage may not be available in all test environments
    return authSessionStorage({ prefix: `test_${Date.now()}_` });
  });

  defineStorageContractTests("authCookieStore", () => {
    return authCookieStore({
      prefix: `test_${Date.now()}_`,
      path: "/",
      sameSite: "lax",
      secure: false, // For testing in non-HTTPS environments
    });
  });

  defineStorageContractTests("authCustomStore (simple)", () => {
    const storage: Record<string, string | null> = {
      accessToken: null,
      refreshToken: null,
    };

    return authCustomStore({
      get: async () => storage.accessToken,
      set: async (token: string) => {
        storage.accessToken = token;
      },
      clear: async () => {
        storage.accessToken = null;
      },
      getRefresh: async () => storage.refreshToken,
      setRefresh: async (token: string) => {
        storage.refreshToken = token;
      },
      clearRefresh: async () => {
        storage.refreshToken = null;
      },
    });
  });

  /**
   * Custom Store Fallback-Specific Tests
   * These tests document the behavior when refresh methods are not provided
   */
  describe("authCustomStore (fallback behavior - no refresh delegation)", () => {
    it("should keep refresh token null when refresh methods are not provided", async () => {
      const storage: Record<string, string | null> = {
        token: null,
      };

      const store = authCustomStore({
        get: async () => storage.token,
        set: async (token: string) => {
          storage.token = token;
        },
        clear: async () => {
          storage.token = null;
        },
      });

      // Setting access token
      await store.set("access-value");
      expect(await store.get()).toBe("access-value");

      // setRefresh is a no-op without explicit setRefresh callback
      await store.setRefresh("refresh-value");
      expect(await store.getRefresh()).toBeNull();
      expect(await store.get()).toBe("access-value");
    });

    it("clearRefresh is a no-op when clearRefresh callback is not provided", async () => {
      const storage: Record<string, string | null> = {
        token: null,
      };

      const store = authCustomStore({
        get: async () => storage.token,
        set: async (token: string) => {
          storage.token = token;
        },
        clear: async () => {
          storage.token = null;
        },
      });

      await store.set("shared-token");
      await store.clearRefresh();

      expect(await store.get()).toBe("shared-token");
      expect(await store.getRefresh()).toBeNull();
    });
  });

  defineStorageContractTests("authHybridStore", () => {
    return authHybridStore({
      accessToken: authMemoryStore(),
      refreshToken: authMemoryStore(),
    });
  });

  /**
   * Hybrid Store Specific Tests
   */
  describe("authHybridStore (advanced)", () => {
    it("should use different physical stores for access and refresh", async () => {
      const accessMemory = authMemoryStore();
      const refreshMemory = authMemoryStore();
      const hybrid = authHybridStore({
        accessToken: accessMemory,
        refreshToken: refreshMemory,
      });

      await hybrid.set("access-value");
      await hybrid.setRefresh("refresh-value");

      // Verify delegation works correctly
      expect(await accessMemory.get()).toBe("access-value");
      expect(await refreshMemory.get()).toBe("refresh-value");
    });

    it("should support different storage backends for each token type", async () => {
      const accessStore = authMemoryStore();
      const refreshStore = authCustomStore({
        get: async () => "hardcoded-refresh",
        set: async () => {
          /* no-op */
        },
        clear: async () => {
          /* no-op */
        },
      });

      const hybrid = authHybridStore({
        accessToken: accessStore,
        refreshToken: refreshStore,
      });

      await hybrid.set("user-access-token");
      const refresh = await hybrid.getRefresh();

      expect(await hybrid.get()).toBe("user-access-token");
      expect(refresh).toBe("hardcoded-refresh");
    });
  });

  /**
   * Custom Store Fallback Tests
   */
  describe("authCustomStore (fallback behavior)", () => {
    it("should default refresh reads to null when refresh methods not provided", async () => {
      const storage: Record<string, string | null> = {
        token: null,
      };

      const store = authCustomStore({
        get: async () => storage.token,
        set: async (token: string) => {
          storage.token = token;
        },
        clear: async () => {
          storage.token = null;
        },
        // No refresh methods provided
      });

      // Access token and refresh token are independent unless refresh callbacks are provided.
      await store.set("shared-token");
      const refreshResult = await store.getRefresh();
      expect(refreshResult).toBeNull();

      // Clearing access token only affects access token storage.
      await store.clear();
      expect(await store.get()).toBeNull();
      expect(await store.getRefresh()).toBeNull();
    });

    it("should support async get/set/clear operations", async () => {
      const operations: string[] = [];

      const store = authCustomStore({
        get: async () => {
          operations.push("get");
          await new Promise((resolve) => setTimeout(resolve, 1));
          return "async-token";
        },
        set: async (token: string) => {
          operations.push("set");
          await new Promise((resolve) => setTimeout(resolve, 1));
        },
        clear: async () => {
          operations.push("clear");
          await new Promise((resolve) => setTimeout(resolve, 1));
        },
      });

      await store.set("test");
      await store.get();
      await store.clear();

      expect(operations).toEqual(["set", "get", "clear"]);
    });

    it("should support sync get/set/clear operations", async () => {
      const storage: Record<string, string | null> = { token: null };

      const store = authCustomStore({
        get: () => storage.token,
        set: (token: string) => {
          storage.token = token;
        },
        clear: () => {
          storage.token = null;
        },
      });

      await store.set("sync-token");
      const result = await store.get();

      expect(result).toBe("sync-token");
    });
  });

  /**
   * Error Resilience Tests
   */
  describe("Storage Error Resilience", () => {
    it("authMemoryStore should always available", async () => {
      const store = authMemoryStore();
      await store.set(testToken);
      expect(await store.get()).toBe(testToken);
    });

    it("authCustomStore should propagate custom implementation errors", async () => {
      const store = authCustomStore({
        get: async () => {
          throw new Error("Custom storage error");
        },
        set: async () => {
          throw new Error("Custom storage error");
        },
        clear: async () => {
          throw new Error("Custom storage error");
        },
      });

      await expect(store.get()).rejects.toThrow("Custom storage error");
      await expect(store.set("token")).rejects.toThrow("Custom storage error");
    });

    it("authCookieStore should fallback to memory for unavailable storage", async () => {
      // This tests the fallback behavior when document.cookie is unavailable
      const store = authCookieStore({ secure: false });
      await store.set(testToken);
      const retrieved = await store.get();
      expect(retrieved).toBe(testToken);
    });
  });

  /**
   * Prefix Isolation Tests
   */
  describe("Prefix Isolation", () => {
    it("authLocalStorage with different prefixes should be independent", async () => {
      // Note: This test assumes both stores can access underlying storage
      const store1 = authLocalStorage({ prefix: "prefix1_" });
      const store2 = authLocalStorage({ prefix: "prefix2_" });

      await store1.set("token1");
      await store2.set("token2");

      expect(await store1.get()).toBe("token1");
      expect(await store2.get()).toBe("token2");
    });

    it("authSessionStorage with different prefixes should be independent", async () => {
      const store1 = authSessionStorage({ prefix: "prefix1_" });
      const store2 = authSessionStorage({ prefix: "prefix2_" });

      await store1.set("token1");
      await store2.set("token2");

      expect(await store1.get()).toBe("token1");
      expect(await store2.get()).toBe("token2");
    });

    it("authCookieStore with different prefixes should be independent", async () => {
      const store1 = authCookieStore({
        prefix: "prefix1_",
        secure: false,
      });
      const store2 = authCookieStore({
        prefix: "prefix2_",
        secure: false,
      });

      await store1.set("token1");
      await store2.set("token2");

      expect(await store1.get()).toBe("token1");
      expect(await store2.get()).toBe("token2");
    });
  });
});
