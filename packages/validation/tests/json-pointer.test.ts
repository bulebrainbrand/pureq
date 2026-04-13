import { describe, expect, it } from "vitest";
import {
  decodeJsonPointer,
  encodeJsonPointer,
  normalizePathToJsonPointer,
} from "../src/policy/json-pointer";
import { v } from "../src/schema/factory";

describe("json pointer", () => {
  it("encodes RFC6901 escaping for tilde and slash", () => {
    const pointer = encodeJsonPointer(["profile", "a/b", "x~y"]);
    expect(pointer).toBe("/profile/a~1b/x~0y");
  });

  it("decodes RFC6901 escaped tokens", () => {
    const tokens = decodeJsonPointer("/profile/a~1b/x~0y");
    expect(tokens).toEqual(["profile", "a/b", "x~y"]);
  });

  it("keeps round-trip encode decode lossless", () => {
    const source = ["user", "emails", "0", "primary~key/with/slash"];
    const pointer = encodeJsonPointer(source);
    expect(decodeJsonPointer(pointer)).toEqual(source);
  });

  it("normalizes dot and bracket path forms to JSON Pointer", () => {
    expect(normalizePathToJsonPointer("user.profile[0].email")).toBe("/user/profile/0/email");
    expect(normalizePathToJsonPointer("$.items['a/b']")).toBe("/items/a~1b");
  });

  it("primitive parse never emits JSONPath-like keys", () => {
    const schema = v.string().policy({ pii: true });
    const result = schema.parse("x", "user.profile[0].email");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value.policyMap)).toEqual(["/user/profile/0/email"]);
    }
  });

  it("error paths are normalized to JSON Pointer", () => {
    const schema = v.number();
    const result = schema.parse("not-a-number", "$.payload.count");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.path).toBe("/payload/count");
    }
  });
});