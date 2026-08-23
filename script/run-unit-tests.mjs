import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
const tunnelPageHelpers = loadTsModule("src/pages/admin/tunnels.helpers.ts");
const failoverV2DisplayHelpers = loadTsModule("src/pages/admin/failover-v2/failoverV2Display.helpers.ts");
const failoverV1DisplayHelpers = loadTsModule("src/pages/admin/failover/failoverV1Display.helpers.ts");

let chunkLoadRecovery = {};
try {
  chunkLoadRecovery = loadTsModule("src/lib/chunkLoadRecovery.ts");
} catch {
  // RED phase: assertions below fail until the helper exists.
}
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

test("server page polling remains bounded during long sessions", () => {
  const rpc2Source = fs.readFileSync(path.resolve(root, "src/lib/rpc2.ts"), "utf8");
  const nodeDetailsSource = fs.readFileSync(
    path.resolve(root, "src/contexts/NodeDetailsContext.tsx"),
    "utf8",
  );
  const serverPageSource = fs.readFileSync(path.resolve(root, "src/pages/admin/index.tsx"), "utf8");

  assert.match(rpc2Source, /options\.timeout \?\? this\.options\.requestTimeout/);
  assert.match(nodeDetailsSource, /inFlightRequestRef/);
  assert.match(nodeDetailsSource, /requestControllerRef\.current\?\.abort\(\)/);
  assert.match(serverPageSource, /NODE_DETAILS_REFRESH_INTERVAL_MS = 30_000/);
  assert.match(serverPageSource, /NODE_LIVE_REQUEST_TIMEOUT_MS = 10_000/);
  assert.match(serverPageSource, /document\.visibilityState === "visible"/);
  assert.match(serverPageSource, /liveScopeSignature/);
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
      active_sessions: 3,
      diagnostics: [
        {
          client_uuid: "edge-a",
          side: "ingress",
          status: "listen_bind_failed",
          error: "cannot bind listener 127.0.0.1:10088",
        },
        { client_uuid: "", status: "" },
      ],
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
  assert.equal(payload.rules[0].active_sessions, 3);
  assert.equal(payload.rules[0].diagnostics.length, 1);
  assert.equal(payload.rules[0].diagnostics[0].side, "ingress");
  assert.equal(payload.rules[0].diagnostics[0].status, "listen_bind_failed");
});

test("tunnel page helpers summarize overview and endpoints", () => {
  const rules = [
    {
      id: 1,
      enabled: true,
      status: "ok",
      ingress_ready: true,
      egress_ready: true,
      active_sessions: 2,
    },
    {
      id: 2,
      enabled: true,
      status: "partial",
      ingress_ready: true,
      egress_ready: false,
      active_sessions: 0,
    },
  ];
  const groups = [
    { name: "edge", client_count: 2, control_connected_count: 1, data_ready_count: 1, last_error: "" },
    { name: "empty", client_count: 1, control_connected_count: 0, data_ready_count: 0, last_error: "" },
  ];

  assert.equal(JSON.stringify(tunnelPageHelpers.getTunnelOverviewMetrics(rules, groups)), JSON.stringify({
    totalRules: 2,
    healthyRules: 1,
    activeSessions: 2,
    totalGroups: 2,
    readyGroups: 1,
  }));
  assert.equal(tunnelPageHelpers.formatTunnelEndpoint("127.0.0.1", 3389), "127.0.0.1:3389");
  assert.equal(tunnelPageHelpers.formatTunnelEndpoint("2607:f358:1a:e::ab0:39b7", 3389), "[2607:f358:1a:e::ab0:39b7]:3389");
  assert.equal(tunnelPageHelpers.formatTunnelEndpoint("", 0), "-");
  assert.equal(tunnelPageHelpers.getTunnelStatusTone("ok"), "green");
  assert.equal(tunnelPageHelpers.getTunnelStatusTone("partial"), "amber");
  assert.equal(tunnelPageHelpers.getTunnelStatusLabel({
    status: "relay_unavailable",
    diagnostics: [{
      client_uuid: "edge-a",
      side: "ingress",
      status: "listen_bind_failed",
      error: "cannot bind listener 0.0.0.0:10088",
    }],
    last_error: "",
  }), "监听端口不可用");
  assert.equal(tunnelPageHelpers.getTunnelStatusLabel({
    status: "invalid_target",
    diagnostics: [{
      client_uuid: "rdp-a",
      side: "egress",
      status: "invalid_target",
      error: "target host and port are required",
    }],
    last_error: "",
  }), "目标地址无效");
  const preview = tunnelPageHelpers.getTunnelDiagnosticPreview({
    diagnostics: [
      {
        client_uuid: "edge-a",
        side: "ingress",
        status: "listen_bind_failed",
        error: "cannot bind listener 127.0.0.1:10088",
      },
      {
        client_uuid: "rdp-a",
        side: "egress",
        status: "invalid_target",
        error: "target host and port are required",
      },
      {
        client_uuid: "node-c",
        side: "ingress",
        status: "unsupported_os",
        error: "tunnel forwarding is only supported on Linux",
      },
    ],
    last_error: "",
  });
  assert.equal(JSON.stringify(preview.lines), JSON.stringify(["入口: 监听端口不可用", "出口: 目标地址无效"]));
  assert.equal(preview.extraCount, 1);
  assert.equal(tunnelPageHelpers.getTunnelDiagnosticLabel("unsupported_os"), "非 Linux Agent");
  assert.equal(tunnelPageHelpers.getTunnelDiagnosticLabel("listener_start_failed"), "监听启动失败");
  assert.equal(tunnelPageHelpers.getTunnelDiagnosticLabel("listener_stopped"), "监听已停止");
  assert.equal(tunnelPageHelpers.getTunnelDiagnosticLabel("listener_runtime_error"), "监听运行异常");
  const runtimePreview = tunnelPageHelpers.getTunnelDiagnosticPreview({
    diagnostics: [
      {
        client_uuid: "edge-a",
        side: "ingress",
        status: "listener_runtime_error",
        error: "accept failed: socket closed",
      },
    ],
    last_error: "",
  });
  assert.equal(JSON.stringify(runtimePreview.lines), JSON.stringify(["入口: 监听运行异常"]));
  assert.equal(tunnelPageHelpers.getTunnelDiagnosticLabel("custom_status"), "custom_status");
});

test("failover v1 treats retained no-DNS script failures as warnings", () => {
  const execution = {
    status: "failed",
    script_status: "failed",
    dns_status: "skipped",
    dns_provider: "",
    new_instance_ref: { provider: "linode", instance_id: 103361420 },
    candidates: [{ selected: true }],
    error_message: "script exited with code 1: \u001b[33mImportant notice\u001b[0m; healthy new instance retained because DNS switching is disabled",
  };

  assert.equal(failoverV1DisplayHelpers.isRetainedScriptWarningExecution(execution), true);
  assert.equal(
    failoverV1DisplayHelpers.getRetainedScriptFailureMessage(execution),
    "script exited with code 1: Important notice",
  );
  assert.equal(failoverV1DisplayHelpers.shouldShowRetryDNSGuidance(execution), false);
});

test("failover v1 recognizes new retained-script cleanup classifications", () => {
  const execution = {
    status: "success",
    script_status: "failed",
    dns_status: "skipped",
    cleanup_result: {
      classification: "script_failed_instance_retained",
      error_message: "script exited with code 1",
    },
  };

  assert.equal(failoverV1DisplayHelpers.isRetainedScriptWarningExecution(execution), true);
  assert.equal(failoverV1DisplayHelpers.shouldShowRetryDNSGuidance(execution), false);
  assert.equal(failoverV1DisplayHelpers.shouldShowRetryDNSGuidance({ dns_provider: "aliyun", dns_status: "failed" }), true);
});

test("failover v2 member status prioritizes blocked probe over last success", () => {
  const member = {
    failure_threshold: 2,
    probe: {
      status: "blocked_suspected",
      consecutive_failures: 2,
      stale: false,
    },
  };
  const execution = { id: 82183, status: "success" };

  assert.equal(failoverV2DisplayHelpers.getFailoverV2ProbeAlertStatus(member), "blocked_suspected");
  assert.equal(failoverV2DisplayHelpers.getFailoverV2MemberTaskStatusSource(member, execution), "probe");
});

test("failover v2 member status keeps last execution when probe is ok", () => {
  const member = {
    failure_threshold: 2,
    probe: {
      status: "ok",
      consecutive_failures: 0,
      stale: false,
    },
  };
  const execution = { id: 82182, status: "success" };

  assert.equal(failoverV2DisplayHelpers.getFailoverV2ProbeAlertStatus(member), null);
  assert.equal(failoverV2DisplayHelpers.getFailoverV2MemberTaskStatusSource(member, execution), "execution");
});

test("admin workbenches keep audited density and selection safeguards", () => {
  const failoverV1Source = fs.readFileSync(
    path.resolve(root, "src/pages/admin/failover/FailoverV1Page.tsx"),
    "utf8",
  );
  const failoverV2Source = fs.readFileSync(
    path.resolve(root, "src/pages/admin/failover-v2/FailoverV2Page.tsx"),
    "utf8",
  );
  const nodeTableSource = fs.readFileSync(
    path.resolve(root, "src/components/admin/NodeTable.tsx"),
    "utf8",
  );
  const serverPageSource = fs.readFileSync(
    path.resolve(root, "src/pages/admin/index.tsx"),
    "utf8",
  );
  const tunnelsSource = fs.readFileSync(
    path.resolve(root, "src/pages/admin/tunnels.tsx"),
    "utf8",
  );

  assert.doesNotMatch(failoverV1Source, /without crowding|keeping the main task dialog compact|右侧只保留/);
  assert.match(failoverV1Source, /executionBadgeLabel/);
  assert.match(failoverV2Source, /FAILOVER_V2_SELECTED_SERVICE_STORAGE_KEY/);
  assert.match(failoverV2Source, /service_latest_execution/);
  assert.match(nodeTableSource, /size-8 shrink-0 sm:size-5/);
  assert.match(serverPageSource, /h-8 w-8 shrink-0 rounded-md sm:h-4 sm:w-4/);
  assert.match(tunnelsSource, /const hasRules = metrics\.totalRules > 0/);
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

test("linux rust install and upgrade commands enable tunnel data", () => {
  const legacyInstallSource = fs.readFileSync(
    path.resolve(root, "src/components/admin/NodeTable/NodeFunction.tsx"),
    "utf8",
  );
  const commandDialogSource = fs.readFileSync(
    path.resolve(root, "src/components/admin/node-details/GenerateCommandDialog.tsx"),
    "utf8",
  );
  const groupUpgradeSource = fs.readFileSync(
    path.resolve(root, "src/components/admin/node-details/GroupUpgradeDialog.tsx"),
    "utf8",
  );

  assert.match(legacyInstallSource, /args\.push\("--enable-tunnel-data"\)/);
  assert.match(commandDialogSource, /args\.push\("--enable-tunnel-data"\)/);
  assert.match(groupUpgradeSource, /shellArgsList\.push\("--enable-tunnel-data"\)/);
});

let passed = 0;
test("chunk recovery recognizes browser dynamic import failures only", () => {
  assert.equal(
    chunkLoadRecovery.isDynamicImportFailure?.(
      new Error("Failed to fetch dynamically imported module: https://example.test/chunk.js"),
    ),
    true,
  );
  assert.equal(
    chunkLoadRecovery.isDynamicImportFailure?.("Importing a module script failed."),
    true,
  );
  assert.equal(
    chunkLoadRecovery.isDynamicImportFailure?.(new Error("error loading dynamically imported module")),
    true,
  );
  assert.equal(chunkLoadRecovery.isDynamicImportFailure?.(new Error("render failed")), false);
});

test("chunk recovery claims only one reload per page and build", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const error = new Error("Failed to fetch dynamically imported module: /assets/chunk.js");

  assert.equal(chunkLoadRecovery.claimChunkLoadRecovery?.(error, "/admin/failover", "build-a", storage), true);
  assert.equal(chunkLoadRecovery.claimChunkLoadRecovery?.(error, "/admin/failover", "build-a", storage), false);
  assert.equal(chunkLoadRecovery.claimChunkLoadRecovery?.(error, "/admin/failover", "build-b", storage), true);
  chunkLoadRecovery.clearChunkLoadRecoveryMarker?.(storage);
  assert.equal(chunkLoadRecovery.claimChunkLoadRecovery?.(error, "/admin/failover", "build-b", storage), true);
});

function createRecoveryTestContext(overrides = {}) {
  const values = new Map();
  const calls = [];
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  return {
    calls,
    dependencies: {
      getHref: () => "/admin/failover",
      getBuildId: () => "build-a",
      getSessionStorage: () => storage,
      updateServiceWorkers: async () => {
        calls.push("worker-update");
      },
      deleteCaches: async () => {
        calls.push("cache-delete");
      },
      waitForTimeout: () => new Promise(() => {}),
      reload: () => {
        calls.push("reload");
      },
      ...overrides,
    },
  };
}

test("chunk recovery deletes caches and reloads when a worker update stalls", async () => {
  const context = createRecoveryTestContext({
    updateServiceWorkers: () => new Promise(() => {}),
    waitForTimeout: async () => {
      context.calls.push("timeout");
    },
  });

  const recovered = await chunkLoadRecovery.recoverChunkLoadFailure(
    new Error("Failed to fetch dynamically imported module: /assets/chunk.js"),
    context.dependencies,
  );

  assert.equal(recovered, true);
  assert.ok(context.calls.includes("cache-delete"));
  assert.ok(context.calls.indexOf("cache-delete") < context.calls.indexOf("reload"));
  assert.equal(context.calls.at(-1), "reload");
});

test("chunk recovery reloads when browser cache operations fail", async () => {
  const context = createRecoveryTestContext({
    updateServiceWorkers: async () => {
      context.calls.push("worker-update");
      throw new Error("worker update failed");
    },
    deleteCaches: async () => {
      context.calls.push("cache-delete");
      throw new Error("cache delete failed");
    },
  });

  const recovered = await chunkLoadRecovery.recoverChunkLoadFailure(
    new Error("Importing a module script failed."),
    context.dependencies,
  );

  assert.equal(recovered, true);
  assert.equal(JSON.stringify(context.calls), JSON.stringify(["cache-delete", "worker-update", "reload"]));
});

test("chunk recovery keeps the manual error UI when session storage is blocked", async () => {
  const context = createRecoveryTestContext({
    getSessionStorage: () => {
      throw new Error("storage blocked");
    },
  });

  const recovered = await chunkLoadRecovery.recoverChunkLoadFailure(
    new Error("Importing a module script failed."),
    context.dependencies,
  );

  assert.equal(recovered, false);
  assert.equal(JSON.stringify(context.calls), JSON.stringify([]));
});

test("healthy recovery cleanup tolerates blocked session storage", () => {
  assert.doesNotThrow(() => {
    chunkLoadRecovery.clearChunkLoadRecoveryMarkerFrom(() => {
      throw new Error("storage blocked");
    });
  });
});

test("chunk recovery marker resets only after suspended route content mounts", () => {
  const mainSource = fs.readFileSync(path.resolve(root, "src/main.tsx"), "utf8");

  assert.doesNotMatch(mainSource, /setTimeout[\s\S]{0,200}clearChunkLoadRecoveryMarker/);
  const routingIndex = mainSource.indexOf("{routing}");
  const resetIndex = mainSource.indexOf("<ChunkLoadRecoveryMarkerReset />");
  assert.ok(routingIndex >= 0);
  assert.ok(resetIndex > routingIndex);
});

test("production build verifies the generated service worker", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(root, "package.json"), "utf8"));
  const verifierSource = fs.readFileSync(path.resolve(root, "script/verify-pwa-build.mjs"), "utf8");

  assert.match(packageJson.scripts.build, /verify:pwa/);
  assert.match(verifierSource, /dist[\\/]sw\.js/);
  assert.match(verifierSource, /index\\\.html/);
  assert.match(verifierSource, /NavigationRoute/);
});
test("PWA verifier rejects Workbox index entries with quoted or bare URL keys", () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "kelicloud-pwa-"));
  const serviceWorkerPath = path.join(tempDirectory, "sw.js");
  const verifierPath = path.resolve(root, "script/verify-pwa-build.mjs");

  try {
    for (const source of [
      'self.__WB_MANIFEST=[{url:"index.html",revision:"build"}]',
      'self.__WB_MANIFEST=[{"url":"index.html","revision":"build"}]',
    ]) {
      fs.writeFileSync(serviceWorkerPath, source);
      const result = spawnSync(process.execPath, [verifierPath, serviceWorkerPath], { encoding: "utf8" });
      assert.notEqual(result.status, 0, source);
    }

    fs.writeFileSync(serviceWorkerPath, 'self.__WB_MANIFEST=[{url:"assets/chunk.js",revision:null}]');
    const safeResult = spawnSync(process.execPath, [verifierPath, serviceWorkerPath], { encoding: "utf8" });
    assert.equal(safeResult.status, 0, safeResult.stderr);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
test("PWA generation excludes HTML and disables navigation fallback", () => {
  const viteConfigSource = fs.readFileSync(path.resolve(root, "vite.config.ts"), "utf8");

  assert.doesNotMatch(viteConfigSource, /globPatterns:\s*\[[^\]]*html/);
  assert.match(viteConfigSource, /navigateFallback:\s*null/);
  assert.doesNotMatch(viteConfigSource, /navigateFallbackDenylist/);
});

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
