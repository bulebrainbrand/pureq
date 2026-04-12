import type { AuthEncryption } from "../shared";

/**
 * FEAT-H7: AES-256-GCM encryption using Web Crypto API.
 * Zero dependencies. Works in browsers, Node.js, Cloudflare Workers, Deno.
 */
export function createAuthEncryption(secret: string): AuthEncryption {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let cachedKey: CryptoKey | null = null;

  const deriveKey = async (): Promise<CryptoKey> => {
    if (cachedKey) {
      return cachedKey;
    }

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    cachedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("pureq-auth-encryption-v1"),
        iterations: 100_000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    return cachedKey;
  };

  return {
    async encrypt(payload: unknown): Promise<string> {
      const key = await deriveKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = encoder.encode(JSON.stringify(payload));

      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        plaintext
      );

      const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);

      return btoa(String.fromCharCode(...combined));
    },

    async decrypt<T = unknown>(token: string): Promise<T> {
      const key = await deriveKey();
      const combined = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );

      return JSON.parse(decoder.decode(plaintext)) as T;
    },
  };
}

export type { AuthEncryption } from "../shared";
