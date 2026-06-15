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
    URL,
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
const installScriptSource = loadTsModule("src/lib/installScriptSource.ts");
const tunnelHelpers = loadTsModule("src/lib/tunnels.helpers.ts");

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

test("node live helpers keep missing snapshots syncing before live data loads", () => {
  const counts = nodeLiveHelpers.getNodeLiveCounts(["node-a", "node-b"], {}, false);

  assert.equal(JSON.stringify(counts), JSON.stringify({ online: 0, offline: 0, unknown: 2 }));
  assert.equal(nodeLiveHelpers.isNodeOffline(undefined, false), false);
  assert.equal(nodeLiveHelpers.getNodeLiveStatusKind(undefined, false), "syncing");
});

test("node live helpers treat missing snapshots as offline after live data loads", () => {
  const counts = nodeLiveHelpers.getNodeLiveCounts(["node-a", "node-b"], {}, true);

  assert.equal(JSON.stringify(counts), JSON.stringify({ online: 0, offline: 2, unknown: 0 }));
  assert.equal(nodeLiveHelpers.isNodeOffline(undefined, true), true);
  assert.equal(nodeLiveHelpers.getNodeLiveStatusKind(undefined, true), "offline");
});

test("node table defaults to 50 rows per page", () => {
  assert.equal(nodeLiveHelpers.NODE_TABLE_DEFAULT_PAGE_SIZE, 50);
});

test("install script source uses rust default for linux agent flavor", () => {
  assert.equal(
    installScriptSource.buildAgentInstallScriptURLForFlavor(undefined, "install.sh", "rust"),
    "https://raw.githubusercontent.com/keli-123456/kelicloud-agent-rs/refs/heads/main/install.sh",
  );
  assert.equal(
    installScriptSource.buildAgentInstallScriptURLForFlavor("https://cdn.example.com/go-agent/", "install.sh", "rust"),
    "https://raw.githubusercontent.com/keli-123456/kelicloud-agent-rs/refs/heads/main/install.sh",
  );
});

test("install script source keeps go-compatible wrapper behavior", () => {
  assert.equal(
    installScriptSource.buildAgentInstallScriptURL(undefined, "install.sh"),
    "https://raw.githubusercontent.com/keli-123456/kelicloud-agent/refs/heads/main/install.sh",
  );
  assert.equal(
    installScriptSource.buildAgentInstallScriptURLForFlavor("https://github.com/example/agent/tree/dev/scripts", "install.ps1", "go"),
    "https://raw.githubusercontent.com/example/agent/refs/heads/dev/scripts/install.ps1",
  );
});

test("tunnel helpers normalize groups and tunnel rules", () => {
  const payload = tunnelHelpers.normalizeTunnelRulesResponse({
    groups: [
      {
        name: " edge ",
        client_count: 2,
        control_connected_count: 1,
        data_ready_count: 1,
        last_error: "",
      },
      { name: "", client_count: 9 },
    ],
    rules: [{
      id: 7,
      name: "RDP",
      enabled: true,
      protocol: "udp",
      ingress_group: "edge",
      listen_address: "",
      listen_port: 10088,
      egress_group: "rdp",
      target_host: "127.0.0.1",
      target_port: 3389,
      max_concurrent_sessions: 0,
      status: "",
      ingress_ready: true,
      egress_ready: false,
      ingress_ready_count: 1,
      egress_ready_count: 0,
    }],
  });

  assert.equal(JSON.stringify(payload.groups), JSON.stringify([{
    name: "edge",
    client_count: 2,
    control_connected_count: 1,
    data_ready_count: 1,
    last_error: "",
  }]));
  assert.equal(payload.rules.length, 1);
  assert.equal(payload.rules[0].protocol, "tcp");
  assert.equal(payload.rules[0].listen_address, "0.0.0.0");
  assert.equal(payload.rules[0].source_allowlist, "0.0.0.0/0");
  assert.equal(payload.rules[0].max_concurrent_sessions, 32);
  assert.equal(payload.rules[0].status, "ok");
  assert.equal(payload.rules[0].ingress_ready, true);
  assert.equal(payload.rules[0].egress_ready, false);
  assert.equal(payload.rules[0].ingress_ready_count, 1);
  assert.equal(payload.rules[0].egress_ready_count, 0);
});

test("tunnel forwarding page is routed and visible in the admin menu", () => {
  const routesSource = fs.readFileSync(path.resolve(root, "src/routes.ts"), "utf8");
  const tunnelsPageSource = fs.readFileSync(path.resolve(root, "src/pages/admin/tunnels.tsx"), "utf8");
  const menuConfig = JSON.parse(fs.readFileSync(path.resolve(root, "src/config/menuConfig.json"), "utf8"));
  const zhCN = JSON.parse(fs.readFileSync(path.resolve(root, "src/i18n/locales/zh_CN.json"), "utf8"));

  assert.match(routesSource, /path:\s*"tunnels"/);
  assert.match(routesSource, /pages\/admin\/tunnels/);

  const menuItems = menuConfig.menu || [];
  assert.ok(menuItems.some((item) => item.path === "/admin/tunnels" && item.labelKey === "tunnels.title"));
  assert.equal(zhCN.tunnels.title, "隧道转发");
  assert.match(tunnelsPageSource, /GroupReadinessStrip/);
  assert.match(tunnelsPageSource, /ingress_ready_count/);
  assert.match(tunnelsPageSource, /egress_ready_count/);
  assert.equal(zhCN.tunnels.readiness, "就绪");
});

test("legacy node action install command uses rust source for linux only", () => {
  const source = fs.readFileSync(
    path.resolve(root, "src/components/admin/NodeTable/NodeFunction.tsx"),
    "utf8",
  );

  assert.match(source, /buildAgentInstallScriptURLForFlavor/);
  assert.match(source, /buildAgentInstallScriptURLForFlavor\([^)]*"install\.sh"[^)]*"rust"[^)]*\)/s);
  assert.match(source, /selectedPlatform !== "linux" && installOptions\.disableAutoUpdate/);
  assert.match(source, /selectedPlatform !== "linux" && installOptions\.serviceName/);
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
