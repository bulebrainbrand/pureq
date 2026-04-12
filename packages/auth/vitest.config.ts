import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@pureq/pureq": resolve(__dirname, "../pureq/src/index.ts"),
      "@pureq/pureq/*": resolve(__dirname, "../pureq/src/*"),
    },
  },
  test: {
    environment: "node",
  },
});
