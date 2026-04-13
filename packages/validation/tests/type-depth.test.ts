import { describe, expectTypeOf, it } from "vitest";
import type { DeniedDrop } from "../src/stringify/types";

describe("type-level depth guards", () => {
  it("caps deep recursive omitted-field modeling", () => {
    type DeepNode = {
      a: {
        b: {
          c: {
            d: {
              e: {
                f: {
                  g: {
                    h: string;
                  };
                };
              };
            };
          };
        };
      };
    };

    expectTypeOf<DeniedDrop<DeepNode>>().toEqualTypeOf<{
      a?: {
        b?: {
          c?: {
            d?: {
              e?: {
                f?: {
                  g?: {
                    h?: string;
                  };
                };
              };
            };
          };
        };
      };
    }>();
  });
});