/**
 * Generates a cryptographically strong random ID.
 * Prefers crypto.randomUUID, falls back to crypto.getRandomValues,
 * and only uses Math.random as a last resort for environments
 * without any Web Crypto API support.
 */
export function generateSecureId(prefix?: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    const value = crypto.randomUUID();
    return prefix ? `${prefix}-${value}` : value;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return prefix ? `${prefix}-${hex}` : hex;
  }

  // Last resort fallback for legacy environments without Web Crypto API.
  // This is NOT cryptographically secure.
  return `${prefix ?? "id"}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const bufferCtor = (globalThis as { Buffer?: { from(value: Uint8Array): { toString(encoding: string): string } } }).Buffer;
  if (typeof btoa !== "function" && bufferCtor) {
    return bufferCtor.from(bytes).toString("base64");
  }

  if (typeof btoa !== "function") {
    throw new Error("pureq: base64 encoder is unavailable in this runtime");
  }

  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof atob === "function") {
    const raw = atob(value);
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  }

  const bufferCtor = (globalThis as { Buffer?: { from(value: string, encoding: string): { values(): Iterable<number> } } }).Buffer;
  if (bufferCtor) {
    return Uint8Array.from(bufferCtor.from(value, "base64").values());
  }

  throw new Error("pureq: base64 decoder is unavailable in this runtime");
}

/**
 * Encrypts a string using AES-GCM with a provided CryptoKey.
 * Returns a base64 string containing [iv:base64]:[ciphertext:base64].
 */
export async function encrypt(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const ivBase64 = uint8ArrayToBase64(iv);
  const cipherBase64 = uint8ArrayToBase64(new Uint8Array(ciphertext));

  return `${ivBase64}:${cipherBase64}`;
}

/**
 * Decrypts a base64 string (formatted as iv:ciphertext) using AES-GCM and a CryptoKey.
 */
export async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
  const [ivBase64, cipherBase64] = encryptedData.split(":");
  if (!ivBase64 || !cipherBase64) {
    throw new Error("pureq: invalid encrypted data format");
  }

  try {
    const iv = new Uint8Array(base64ToBytes(ivBase64));
    const ciphertext = new Uint8Array(base64ToBytes(cipherBase64));

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("pureq: invalid encrypted payload (base64 decode failed)");
  }
}
