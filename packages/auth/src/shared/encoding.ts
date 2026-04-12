export function base64Encode(input: string): string {
  if (typeof btoa === "function") {
    return btoa(input);
  }

  throw new Error("pureq: base64 encoding is not supported in this environment");
}

export function base64Decode(input: string): string {
  if (typeof atob === "function") {
    return atob(input);
  }

  throw new Error("pureq: base64 decoding is not supported in this environment");
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return base64Encode(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = base64Decode(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
