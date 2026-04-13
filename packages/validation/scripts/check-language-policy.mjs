import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const docsRoot = process.argv[2] ?? "docs";
const srcRoot = process.argv[3] ?? "src";

const docExtensions = new Set([".md", ".mdx", ".txt"]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const nonEnglishPattern = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf\uff66-\uff9f]/;
const commentPattern = /^\s*(\/\/|\/\*|\*|\*\/)/;

const collectFiles = (root, extensions) => {
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

      if (!extensions.has(extname(fullPath))) {
        continue;
      }

      files.push(fullPath);
    }
  };

  walk(root);
  return files;
};

const violations = [];

for (const docFile of collectFiles(docsRoot, docExtensions)) {
  const content = readFileSync(docFile, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (nonEnglishPattern.test(line)) {
      violations.push(`${docFile}:${index + 1}: non-English text detected in docs`);
    }
  });
}

for (const sourceFile of collectFiles(srcRoot, sourceExtensions)) {
  const content = readFileSync(sourceFile, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!commentPattern.test(line)) {
      return;
    }

    if (nonEnglishPattern.test(line)) {
      violations.push(`${sourceFile}:${index + 1}: non-English text detected in source comment`);
    }
  });
}

if (violations.length > 0) {
  console.error("Language policy check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Language policy check passed for docs and source comments");