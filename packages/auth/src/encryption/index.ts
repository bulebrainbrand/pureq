import type { AuthEncryption, AuthEncryptionOptions } from "../shared";

const MIN_SECRET_BYTES = 32;
const DEFAULT_PBKDF2_ITERATIONS = 100_000;

function encodeBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  const bufferCtor = (globalThis as { Buffer?: { from(value: Uint8Array): { toString(encoding: string): string } } }).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString("base64");
  }

  throw new Error("pureq/auth: base64 encoder is unavailable in this runtime");
}

function decodeBase64(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  const bufferCtor = (globalThis as { Buffer?: { from(value: string, encoding: string): { values(): Iterable<number> } } }).Buffer;
  if (bufferCtor) {
    return Uint8Array.from(bufferCtor.from(base64, "base64").values());
  }

  throw new Error("pureq/auth: base64 decoder is unavailable in this runtime");
}

/**
 * FEAT-H7: AES-256-GCM encryption using Web Crypto API.
 * Zero dependencies. Works in browsers, Node.js, Cloudflare Workers, Deno.
 */
export function createAuthEncryption(secret: string, options: AuthEncryptionOptions = {}): AuthEncryption {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const secretBytes = encoder.encode(secret);
  if (secretBytes.byteLength < MIN_SECRET_BYTES) {
    throw new Error("pureq/auth: encryption secret must be at least 32 bytes (256-bit)");
  }

  const iterations = options.pbkdf2Iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  if (!Number.isInteger(iterations) || iterations < DEFAULT_PBKDF2_ITERATIONS) {
    throw new Error("pureq/auth: pbkdf2Iterations must be an integer >= 100000");
  }

  let cachedKey: CryptoKey | null = null;

  const deriveKey = async (): Promise<CryptoKey> => {
    if (cachedKey) {
      return cachedKey;
    }

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    cachedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("pureq-auth-encryption-v1"),
        iterations,
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

      return encodeBase64(combined);
    },

    async decrypt<T = unknown>(token: string): Promise<T> {
      const key = await deriveKey();
      const combined = decodeBase64(token);
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
