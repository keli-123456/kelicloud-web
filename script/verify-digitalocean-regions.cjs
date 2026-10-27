const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const out = path.resolve(root, "../digitalocean-checks");
fs.mkdirSync(out, { recursive: true });
const zh = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/zh_CN.json")));
const env = data => ({ status: "success", data });
const errors = [], writes = [];
const visible = locator => locator.waitFor({ state: "visible", timeout: 15000 });
const until = async fn => {
  for (let i = 0; i < 120; i++) {
    if (await fn()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error("Condition timeout");
};
let page, context, browser, base;
const shot = name => page.screenshot({ path: path.join(out, name + ".png"), animations: "disabled" });
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
const go = async route => {
  page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + route, { waitUntil: "networkidle" });
};
const mime = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".html": "text/html", ".png": "image/png", ".svg": "image/svg+xml" };
// The server serves only build files. All API calls are isolated fixtures.
const dist = path.join(root, "dist");
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let file = path.resolve(dist, "." + p);
  if (p.startsWith("/api/") || !file.startsWith(dist + path.sep)) { res.writeHead(404); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (path.extname(p)) { res.writeHead(404); return res.end(); }
    file = path.join(dist, "index.html");
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = "http://127.0.0.1:" + server.address().port;
  try {
    browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
    for (const theme of ["light", "dark"]) {
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const mode = viewport.width + "-" + theme;
        context = await browser.newContext({ viewport, locale: "zh-CN", serviceWorkers: "block" });
        await context.addInitScript(theme => {
          localStorage.setItem("i18nextLng", "zh-CN");
          localStorage.setItem("appearance", JSON.stringify(theme));
        }, theme);
        await context.route("**/*", async route => {
          const req = route.request(), url = new URL(req.url()), p = url.pathname;
          if (url.origin !== base) return route.abort();
          if (!p.startsWith("/api/")) return route.continue();
          if (req.method() !== "GET" && p !== "/api/rpc2") {
            writes.push(p);
            return route.fulfill({ status: 405, json: { message: "Unexpected fixture write" } });
          }
          let data = env([]);
          if (p === "/api/me") data = { logged_in: true, role: "admin", uuid: "audit", username: "Local audit" };
          if (p === "/api/public") data = env({ sitename: "kelicloud", private_site: false });
          if (p.includes("/settings")) data = env({ eula_accepted: true, script_domain: "https://panel.example.test" });
          if (p === "/api/admin/client/list") data = [];
          if (p === "/api/admin/cloud/digitalocean/tokens") data = env({ configured: true, active_token_id: "audit", tokens: [{ id: "audit", name: "Fixture credential", group: "Audit", is_active: true }] });
          if (p === "/api/rpc2") {
            const q = req.postDataJSON(), reply = call => ({ jsonrpc: "2.0", id: call.id, result: {} });
            data = Array.isArray(q) ? q.map(reply) : reply(q);
          }
          return route.fulfill({ json: data });
        });
          await go("/admin/failover");
          let releaseOldRequest, oldResponseFinished = false, emptySizes = false, catalogFails = false;
          let captured;
          const reads = [];
          const catalogPattern = "**/api/admin/failover/plans/catalog?**";
          await page.route(catalogPattern, async route => {
            const query = new URL(route.request().url()).searchParams;
            const region = query.get("region") || "";
            reads.push(region);
            if (catalogFails) return route.fulfill({ status: 503, json: { message: "Fixture catalog unavailable" } });
            if (region === "sfo3") await new Promise(resolve => { releaseOldRequest = resolve; });
            const opt = value => ({ value, label: value, hint: "" });
            await route.fulfill({ json: env({
              provider: "digitalocean", action_type: "provision_instance", region,
              regions: [opt("sgp1"), opt("sfo3")],
              sizes: region && !emptySizes ? [opt(region + "-size")] : [],
              images: region ? [opt(region + "-image")] : [],
            }) });
            if (region === "sfo3") oldResponseFinished = true;
          });
          await page.route("**/api/admin/failover/tasks", async route => {
            if (route.request().method() === "GET") return route.fulfill({ json: env([]) });
            captured = route.request().postDataJSON();
            return route.fulfill({ status: 422, json: { message: "Fixture stopped before save" } });
          });
          await page.getByRole("button", { name: zh.failover.create, exact: true }).click();
          const dialog = page.getByRole("dialog");
          await dialog.locator("#failover-name").fill("Regional regression");
          const monitoring = dialog.getByText(zh.failover.editor.show_task_advanced, { exact: true }).locator("..").locator("..");
          await monitoring.getByRole("button", { name: zh.form_feedback.expand, exact: true }).click();
          const stale = dialog.locator("#failover-stale");
          if (!await stale.isVisible()) {
            await dialog.getByRole("button", { name: new RegExp(zh.failover.editor.monitoring_core) }).click();
          }
          await visible(stale);
          assert.equal(await stale.getAttribute("min"), "60");
          assert.equal(await stale.inputValue(), "300");
          await stale.fill("10");
          await stale.press("Tab");
          assert.equal(await stale.inputValue(), "60");
          await stale.fill("600");
          await stale.press("Tab");
          assert.equal(await stale.inputValue(), "600");
          await stale.fill("");
          await stale.press("Tab");
          assert.equal(await stale.inputValue(), "300");
          await stale.fill("10");
          await stale.press("Tab");
          await shot("stale-window-" + mode);
          await monitoring.getByRole("button", { name: zh.form_feedback.collapse, exact: true }).click();
          await dialog.getByRole("button", { name: zh.common.edit, exact: true }).first().click();
          const field = key => dialog.locator(`[data-validation-field="plan.${key}"]`);
          await field("provider").getByRole("combobox").click();
          await page.getByRole("option", { name: "DigitalOcean", exact: true }).click();
          await visible(field("region").getByRole("combobox"));
          assert.ok(reads.includes(""), "Available regions should load automatically");
          const chooseRegion = async region => {
            await field("region").getByRole("combobox").click();
            assert.equal(await page.getByRole("option").filter({ hasText: "sfo2" }).count(), 0, "Unavailable static regions must not be reinserted");
            await page.getByRole("option").filter({ hasText: region }).click();
          };
          const chooseDetails = async () => {
            for (const key of ["size", "image"]) {
              await field(key).getByRole("combobox").click();
              await page.getByRole("button", { name: "sgp1-" + key, exact: true }).click();
            }
          };
          await chooseRegion("sgp1");
          await visible(field("size").getByRole("combobox"));
          await chooseDetails();
          await chooseRegion("sfo3");
          await until(() => Boolean(releaseOldRequest));
          await chooseRegion("sgp1");
          await visible(field("size").getByRole("combobox"));
          assert.equal(await field("size").getByRole("combobox").innerText(), zh.failover.editor.size_placeholder);
          assert.equal(await field("image").getByRole("combobox").innerText(), zh.failover.editor.image_placeholder);
          releaseOldRequest();
          await until(() => oldResponseFinished);
          await page.waitForLoadState("networkidle");
          await field("size").getByRole("combobox").click();
          await visible(page.getByRole("button", { name: "sgp1-size", exact: true }));
          assert.equal(await page.getByRole("button", { name: "sfo3-size", exact: true }).count(), 0);
          await page.getByRole("button", { name: "sgp1-size", exact: true }).click();
          await field("image").getByRole("combobox").click();
          await page.getByRole("button", { name: "sgp1-image", exact: true }).click();
          await noOverflow();
          await shot("digitalocean-regions-" + mode);
          await dialog.getByRole("button", { name: zh.common.done, exact: true }).click();
          await dialog.getByRole("button", { name: zh.common.create, exact: true }).click();
          await until(() => Boolean(captured));
          assert.equal(captured.plans[0].payload.region, "sgp1");
          assert.equal(captured.plans[0].payload.size, "sgp1-size");
          assert.equal(captured.plans[0].payload.image, "sgp1-image");
          assert.equal(captured.stale_after_seconds, 60, "Unsafe stale window must not reach the save endpoint");
          captured = null;
          emptySizes = true;
          await dialog.getByRole("button", { name: zh.common.create, exact: true }).click();
          await visible(field("size").getByText(/sgp1-size.*sgp1/));
          assert.equal(captured, null, "Invalid regional size must not reach the save endpoint");
          await visible(dialog.getByText(zh.failover.editor.digitalocean_no_sizes, { exact: true }));
          catalogFails = true;
          await dialog.getByRole("button", { name: zh.failover.editor.refresh_digitalocean_options, exact: true }).click();
          await visible(dialog.getByText(/Fixture catalog unavailable/));
          assert.equal(await field("size").getByRole("combobox").count(), 0, "Failed catalog reads must not restore static options");
          await shot("digitalocean-catalog-error-" + mode);
        console.log("PASS DigitalOcean region regression " + mode);
        await context.close();
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
  } catch (error) {
    if (page) await shot("failure").catch(() => {});
    throw error;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

