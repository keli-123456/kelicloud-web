#!/usr/bin/env node
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(ROOT_DIR, "src/i18n/locales");
const SOURCE_LOCALE = process.env.I18N_SOURCE || "zh_CN";
const MAX_SAMPLES = Number.parseInt(process.env.I18N_AUDIT_SAMPLES || "20", 10);
const STRICT = process.argv.includes("--strict");

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj || {})) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (isObject(value)) {
      flatten(value, nextKey, out);
      continue;
    }
    out[nextKey] = value;
  }
  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function walkFiles(targetPath, extensions, output = []) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (extensions.has(path.extname(targetPath))) {
      output.push(targetPath);
    }
    return output;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    if (entry.name === "i18n" && path.basename(targetPath) === "src") {
      continue;
    }
    walkFiles(path.join(targetPath, entry.name), extensions, output);
  }
  return output;
}

function formatSampleList(items, mapper = (item) => item) {
  return items.slice(0, MAX_SAMPLES).map((item) => `  - ${mapper(item)}`);
}

function summarizeByPrefix(keys) {
  const counts = new Map();
  for (const key of keys) {
    const prefix = key.split(".")[0];
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([prefix, count]) => `${prefix}:${count}`)
    .join(", ");
}

function collectTranslationKeys(files) {
  const keys = new Set();
  const pattern = /\b(?:t|i18next\.t)\(\s*["'`]([^"'`]+)["'`]/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1]?.trim();
      if (key && !key.includes("${")) {
        keys.add(key);
      }
    }
  }

  return [...keys].sort();
}

function collectHardcodedCjkCandidates(files) {
  const candidates = [];
  const literalPatterns = [
    /"[^"\n]*[一-龥][^"\n]*"/,
    /'[^'\n]*[一-龥][^'\n]*'/,
    /`[^`\n]*[一-龥][^`\n]*`/,
    />[^<>{}]*[一-龥][^<>{}]*</,
  ];

  for (const filePath of files) {
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const codeLine = line.replace(/\/\/.*$/, "");
      if (!/[一-龥]/.test(codeLine)) {
        return;
      }

      const trimmed = codeLine.trim();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("{/*")
      ) {
        return;
      }

      const context = [
        lines[index - 2] || "",
        lines[index - 1] || "",
        line,
        lines[index + 1] || "",
        lines[index + 2] || "",
      ].join("\n");

      if (
        /\b(?:t|translate)\s*\(/.test(context) ||
        /defaultValue\s*:/.test(context) ||
        /console\.(?:log|warn|error|debug)/.test(context)
      ) {
        return;
      }

      if (literalPatterns.some((pattern) => pattern.test(codeLine))) {
        candidates.push({
          filePath,
          lineNumber: index + 1,
          line: trimmed,
        });
      }
    });
  }

  return candidates;
}

const localeFiles = fs.readdirSync(LOCALES_DIR)
  .filter((fileName) => fileName.endsWith(".json"))
  .sort();
const sourceFileName = `${SOURCE_LOCALE}.json`;

if (!localeFiles.includes(sourceFileName)) {
  console.error(`Source locale ${sourceFileName} not found in ${LOCALES_DIR}`);
  process.exit(1);
}

const localeMaps = Object.fromEntries(
  localeFiles.map((fileName) => [fileName, flatten(readJson(path.join(LOCALES_DIR, fileName)))]),
);
const sourceKeys = Object.keys(localeMaps[sourceFileName]).sort();

console.log("Locale coverage");
for (const fileName of localeFiles) {
  const localeMap = localeMaps[fileName];
  const missing = sourceKeys.filter((key) => !(key in localeMap) || String(localeMap[key]).trim() === "");
  const extra = Object.keys(localeMap).filter((key) => !(key in localeMaps[sourceFileName]));
  const coverage = `${sourceKeys.length - missing.length}/${sourceKeys.length}`;
  const prefixSummary = missing.length ? ` (${summarizeByPrefix(missing)})` : "";

  console.log(`- ${fileName}: ${coverage} keys, missing ${missing.length}, extra ${extra.length}${prefixSummary}`);
  if (missing.length > 0) {
    for (const line of formatSampleList(missing)) {
      console.log(line);
    }
  }
}

const sourceFiles = walkFiles(path.join(ROOT_DIR, "src"), new Set([".ts", ".tsx"]));
const usedKeys = collectTranslationKeys(sourceFiles);
const missingSourceKeys = usedKeys.filter((key) => !(key in localeMaps[sourceFileName]));

console.log("");
console.log(`Source locale keys referenced in code but missing from ${sourceFileName}: ${missingSourceKeys.length}`);
for (const line of formatSampleList(missingSourceKeys)) {
  console.log(line);
}

const hardcodedFiles = [
  ...walkFiles(path.join(ROOT_DIR, "src/pages"), new Set([".tsx"])),
  ...walkFiles(path.join(ROOT_DIR, "src/components"), new Set([".tsx"])),
  path.join(ROOT_DIR, "src/utils/renderProviders.tsx"),
];
const hardcodedCandidates = collectHardcodedCjkCandidates(hardcodedFiles);

console.log("");
console.log(`Hardcoded CJK literals in UI files: ${hardcodedCandidates.length}`);
for (const line of formatSampleList(
  hardcodedCandidates,
  (item) => `${path.relative(ROOT_DIR, item.filePath)}:${item.lineNumber} ${item.line}`,
)) {
  console.log(line);
}

if (STRICT) {
  const hasLocaleGap = localeFiles.some((fileName) => {
    if (fileName === sourceFileName) {
      return false;
    }
    const localeMap = localeMaps[fileName];
    return sourceKeys.some((key) => !(key in localeMap) || String(localeMap[key]).trim() === "");
  });

  if (hasLocaleGap || missingSourceKeys.length > 0 || hardcodedCandidates.length > 0) {
    process.exit(1);
  }
}
