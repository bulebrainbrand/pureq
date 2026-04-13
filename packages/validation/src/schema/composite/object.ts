import { forbiddenKeyError, invalidTypeError } from "../../errors/validation-error.js";
import { decodeJsonPointer, encodeJsonPointer, normalizePathToJsonPointer } from "../../policy/json-pointer.js";
import {
  DEFAULT_VALIDATION_POLICY,
  cloneValidationPolicy,
  mergeValidationPolicy,
  normalizeValidationPolicy,
} from "../../policy/merge.js";
import type { ValidationPolicy } from "../../policy/types.js";
import { err, isErr, ok } from "../../result/result.js";
import type { Infer, ParseResult, PolicySchema } from "../base.js";

type ObjectShape = Record<string, PolicySchema<unknown>>;

type InferShape<TShape extends ObjectShape> = {
  [K in keyof TShape]: Infer<TShape[K]>;
};

const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const describeValueType = (input: unknown): string => {
  if (input === null) {
    return "null";
  }
  if (Array.isArray(input)) {
    return "array";
  }
  return typeof input;
};

export class ObjectSchema<TShape extends ObjectShape> implements PolicySchema<InferShape<TShape>> {
  declare readonly type: InferShape<TShape>;

  private readonly shape: TShape;
  readonly metadata: ValidationPolicy;

  constructor(shape: TShape, metadata: ValidationPolicy = DEFAULT_VALIDATION_POLICY) {
    this.shape = shape;
    this.metadata = normalizeValidationPolicy(metadata);
  }

  policy(metadata: ValidationPolicy): ObjectSchema<TShape> {
    return new ObjectSchema(this.shape, mergeValidationPolicy(this.metadata, metadata));
  }

  parse(input: unknown, path = "/"): ParseResult<InferShape<TShape>> {
    const pointerPath = normalizePathToJsonPointer(path);

    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return err(
        invalidTypeError({
          path: pointerPath,
          expected: "object",
          received: describeValueType(input),
        }),
      );
    }

    const output: Record<string, unknown> = Object.create(null);
    const policyMap: Record<string, ValidationPolicy> = {
      [pointerPath]: cloneValidationPolicy(this.metadata),
    };

    const source = input as Record<string, unknown>;
    const parentTokens = decodeJsonPointer(pointerPath);

    const entries = Object.entries(this.shape) as [keyof TShape & string, TShape[keyof TShape]][];

    for (const [key, schema] of entries) {
      if (FORBIDDEN_OBJECT_KEYS.has(key)) {
        return err(
          forbiddenKeyError({
            path: encodeJsonPointer([...parentTokens, key]),
            key,
          }),
        );
      }

      const childPath = encodeJsonPointer([...parentTokens, key]);
      const parsed = schema.parse(source[key], childPath);

      if (isErr(parsed)) {
        return parsed;
      }

      output[key] = parsed.value.data;
      Object.assign(policyMap, parsed.value.policyMap);
    }

    return ok({
      data: output as InferShape<TShape>,
      policyMap,
      metadata: cloneValidationPolicy(this.metadata),
    });
  }
}
