import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";

const rootDir = fileURLToPath(new URL("../src", import.meta.url));
const allowedExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".md"]);
const suspiciousPatterns = [
  /Ã./g,
  /Â./g,
  /â€./g,
  /�/g,
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (allowedExts.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await walk(rootDir);
const findings = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const pattern of suspiciousPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      const line = content.slice(0, match.index).split("\n").length;
      findings.push({
        file: file.replace(`${rootDir}\\`, "src\\"),
        line,
        sample: content.split("\n")[line - 1]?.trim() ?? "",
      });
      break;
    }
  }
}

if (findings.length > 0) {
  console.error("Mojibake detected:");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.sample}`);
  }
  process.exit(1);
}

console.log("No mojibake detected.");
