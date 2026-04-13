import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const target = process.argv[2] ?? "src";
const throwPattern = /\bthrow\b/;
const supportedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

const files = [];

const walk = (dirPath) => {
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!supportedExtensions.has(extname(fullPath))) {
      continue;
    }

    files.push(fullPath);
  }
};

walk(target);

const violations = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (throwPattern.test(line)) {
      violations.push(`${file}:${index + 1}: contains forbidden throw usage`);
    }
  });
}

if (violations.length > 0) {
  console.error("No-throw check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`No-throw check passed for ${files.length} files in ${target}`);