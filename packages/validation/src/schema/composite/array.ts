import { invalidTypeError } from "../../errors/validation-error.js";
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

const describeValueType = (input: unknown): string => {
  if (input === null) {
    return "null";
  }
  if (Array.isArray(input)) {
    return "array";
  }
  return typeof input;
};

export class ArraySchema<TItemSchema extends PolicySchema<unknown>>
  implements PolicySchema<Infer<TItemSchema>[]>
{
  declare readonly type: Infer<TItemSchema>[];

  private readonly itemSchema: TItemSchema;
  readonly metadata: ValidationPolicy;

  constructor(itemSchema: TItemSchema, metadata: ValidationPolicy = DEFAULT_VALIDATION_POLICY) {
    this.itemSchema = itemSchema;
    this.metadata = normalizeValidationPolicy(metadata);
  }

  policy(metadata: ValidationPolicy): ArraySchema<TItemSchema> {
    return new ArraySchema(this.itemSchema, mergeValidationPolicy(this.metadata, metadata));
  }

  parse(input: unknown, path = "/"): ParseResult<Infer<TItemSchema>[]> {
    const pointerPath = normalizePathToJsonPointer(path);

    if (!Array.isArray(input)) {
      return err(
        invalidTypeError({
          path: pointerPath,
          expected: "array",
          received: describeValueType(input),
        }),
      );
    }

    const values: Infer<TItemSchema>[] = [];
    const policyMap: Record<string, ValidationPolicy> = {
      [pointerPath]: cloneValidationPolicy(this.metadata),
    };

    const parentTokens = decodeJsonPointer(pointerPath);

    for (let index = 0; index < input.length; index += 1) {
      const childPath = encodeJsonPointer([...parentTokens, String(index)]);
      const parsed = this.itemSchema.parse(input[index], childPath);

      if (isErr(parsed)) {
        return parsed;
      }

      values.push(parsed.value.data as Infer<TItemSchema>);
      Object.assign(policyMap, parsed.value.policyMap);
    }

    return ok({
      data: values,
      policyMap,
      metadata: cloneValidationPolicy(this.metadata),
    });
  }
}
