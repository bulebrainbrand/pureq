import { afterEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt, generateSecureId } from "../src/utils/crypto";

describe("crypto utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies prefix even when randomUUID is available", () => {
    const spy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("123e4567-e89b-12d3-a456-426614174000");

    const id = generateSecureId("pureq");

    expect(id).toBe("pureq-123e4567-e89b-12d3-a456-426614174000");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("round-trips encrypt/decrypt with AES-GCM key", async () => {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);
    const input = JSON.stringify({ userId: "u1", roles: ["admin"] });

    const encrypted = await encrypt(input, key);
    const decrypted = await decrypt(encrypted, key);

    expect(encrypted.includes(":")).toBe(true);
    expect(decrypted).toBe(input);
  });

  it("throws helpful error for invalid encrypted format", async () => {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);

    await expect(decrypt("not-valid", key)).rejects.toThrow("pureq: invalid encrypted data format");
  });
});
