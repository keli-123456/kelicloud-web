import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const require = createRequire(import.meta.url);

function loadTsModule(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: absolutePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      strict: true,
    },
  }).outputText;

  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    require,
    console,
    process,
    setTimeout,
    clearTimeout,
  }, { filename: absolutePath });
  return module.exports;
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

const execHelpers = loadTsModule("src/pages/admin/exec.helpers.ts");
const nodeLiveHelpers = loadTsModule("src/pages/admin/node-live.helpers.ts");

test("exec helpers normalize task summaries from API envelopes", () => {
  const tasks = execHelpers.extractTaskSummaries({
    status: "success",
    data: [{
      task_id: "task-1",
      command: "whoami",
      clients: ["client-a"],
      results: [{
        client: "client-a",
        result: "root",
        exit_code: 0,
        finished_at: "2026-06-11T00:00:00Z",
        created_at: "2026-06-11T00:00:00Z",
      }],
    }],
  });

  assert.equal(tasks.length, 1);
  assert.equal(JSON.stringify(execHelpers.getTaskCompletion(tasks[0])), JSON.stringify({ finished: 1, total: 1 }));
  assert.equal(execHelpers.getTaskTone(tasks[0]), "ok");
});

test("exec helpers keep editor metrics stable", () => {
  assert.equal(JSON.stringify(execHelpers.getLineNumbers("")), JSON.stringify([1]));
  assert.equal(JSON.stringify(execHelpers.getLineNumbers("a\nb\nc")), JSON.stringify([1, 2, 3]));
  assert.ok(execHelpers.getCommandEditorHeight(1) >= 96);
  assert.ok(execHelpers.getCommandEditorHeight(100) <= 260);
  assert.equal(execHelpers.getLineNumberColumnWidth(1000), "calc(4ch + 6px)");
});

test("exec helpers derive readable script names", () => {
  assert.equal(
    execHelpers.resolveScriptName({ name: "", text: "  whoami\npwd", remark: "", weight: "0" }, "fallback"),
    "whoami",
  );
  assert.equal(
    execHelpers.getCommandTitle({ name: "", text: "\n uptime ", remark: "", weight: 0 }, "fallback"),
    "uptime",
  );
});

test("node live helpers keep missing snapshots unknown instead of offline", () => {
  const counts = nodeLiveHelpers.getNodeLiveCounts(["node-a", "node-b"], {}, true);

  assert.equal(JSON.stringify(counts), JSON.stringify({ online: 0, offline: 0, unknown: 2 }));
  assert.equal(nodeLiveHelpers.isNodeOffline(undefined, true), false);
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

console.log(`${passed}/${tests.length} unit tests passed`);
