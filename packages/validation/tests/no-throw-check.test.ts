import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, "..");
const scriptPath = resolve(packageRoot, "scripts/check-no-throw.mjs");

describe("no-throw checker", () => {
  it("passes for src directory", () => {
    const output = execFileSync("node", [scriptPath, "src"], {
      cwd: packageRoot,
      encoding: "utf8",
    });

    expect(output).toContain("No-throw check passed");
  });

  it("fails when throw appears in fixture", () => {
    let caught = "";

    try {
      execFileSync("node", [scriptPath, "tests/fixtures/no-throw"], {
        cwd: packageRoot,
        encoding: "utf8",
      });
    } catch (error) {
      caught = String(error);
    }

    expect(caught).toContain("No-throw check failed");
    expect(caught).toContain("contains forbidden throw usage");
  });
});