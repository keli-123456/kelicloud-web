const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const out = path.resolve(root, '../credential-priority-checks');
fs.mkdirSync(out, { recursive: true });
const zh = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/locales/zh_CN.json')));
const env = data => ({ status: 'success', data });
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(dist, '.' + p);
  if (p.startsWith('/api/') || !file.startsWith(dist + path.sep)) { res.writeHead(404); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (path.extname(p)) { res.writeHead(404); return res.end(); }
    file = path.join(dist, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
const task = { id: 1, name: 'Credential regression', enabled: true, candidate_count: 3,
  cooldown_seconds: 0, dns_provider: '', dns_entry_id: '', plans: [{ id: 1, task_id: 1,
    name: 'Plan 1', enabled: true, priority: 1, provider: 'linode', action_type: 'provision_instance',
    provider_entry_id: 'active', provider_entry_group: 'Pool 1',
    payload: { region: 'ap-northeast', type: 'g6-standard-2', image: 'linode/debian12', enable_ipv6: true },
  }] };
const visible = locator => locator.waitFor({ state: 'visible', timeout: 15000 });
let browser, page;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
    for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, locale: 'zh-CN', serviceWorkers: 'block' });
      await context.addInitScript(theme => {
        localStorage.setItem('i18nextLng', 'zh-CN');
        localStorage.setItem('appearance', JSON.stringify(theme));
      }, theme);
      let active = 'b1', reads = 0, submitted;
      const errors = [], writes = [];
      // Every API request is mocked; this test cannot create cloud instances.
      await context.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url()), p = url.pathname;
        if (url.origin !== base) return route.abort();
        if (!p.startsWith('/api/')) return route.continue();
        if (req.method() !== 'GET' && p !== '/api/rpc2') {
          writes.push(p);
          assert.equal(p, '/api/admin/failover/tasks/1');
          submitted = req.postDataJSON();
          return route.fulfill({ status: 422, json: { message: 'Fixture stopped before save' } });
        }
        let data = env([]);
        if (p === '/api/me') data = { logged_in: true, role: 'admin', uuid: 'audit', username: 'Audit' };
        if (p === '/api/public') data = env({ sitename: 'kelicloud', private_site: false });
        if (p.includes('/settings')) data = env({ eula_accepted: true, script_domain: 'https://panel.example.test' });
        if (p === '/api/admin/client/list') data = [];
        if (p === '/api/admin/failover/tasks') data = env([task]);
        if (p === '/api/admin/failover/tasks/1') data = env(task);
        if (p === '/api/admin/cloud/linode/tokens') {
          reads++;
          data = env({ configured: true, active_token_id: active, tokens: [
            { id: 'a1', name: 'a', group: 'Pool 1' }, { id: 'b1', name: 'b', group: 'Pool 1' },
            { id: 'a2', name: 'a', group: 'Pool 2' }, { id: 'b2', name: 'b', group: 'Pool 2' },
          ].map(token => ({ ...token, is_active: token.id === active })) });
        }
        if (p === '/api/rpc2') {
          const q = req.postDataJSON(), reply = call => ({ jsonrpc: '2.0', id: call.id, result: {} });
          data = Array.isArray(q) ? q.map(reply) : reply(q);
        }
        return route.fulfill({ json: data });
      });
      page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/admin/failover', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: zh.common.more_actions, exact: true }).first().click();
      await page.getByRole('menuitem', { name: zh.common.edit, exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: zh.common.edit, exact: true }).first().click();
      const group = dialog.locator('#v1-plan-group'), entry = dialog.locator('#v1-plan-entry');
      await visible(entry);
      assert.equal(await entry.innerText(), zh.failover.editor.provider_entry_active_named.replace('{{name}}', 'b'));
      await group.click();
      await page.getByRole('option', { name: 'Pool 2', exact: true }).click();
      assert.equal(await entry.innerText(), zh.failover.editor.provider_entry_active);
      await entry.click();
      assert.deepEqual(await page.getByRole('option').allTextContents(), [zh.failover.editor.provider_entry_active, 'a', 'b']);
      await page.getByRole('option', { name: 'a', exact: true }).click();
      assert.equal(await entry.innerText(), 'a');
      active = 'b2';
      const previousReads = reads;
      await dialog.getByRole('button', { name: zh.form_feedback.refresh_credentials, exact: true }).click();
      await page.waitForLoadState('networkidle');
      assert.ok(reads > previousReads);
      assert.equal(await entry.innerText(), 'a', 'Refreshing credentials must preserve explicit preference');
      await entry.click();
      await visible(page.getByRole('option', { name: zh.failover.editor.provider_entry_active_named.replace('{{name}}', 'b'), exact: true }));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(out, `v1-credentials-${width}-${theme}.png`), animations: 'disabled' });
      await page.getByRole('option', { name: 'a', exact: true }).click();
      await dialog.getByRole('button', { name: zh.common.done, exact: true }).click();
      await dialog.getByRole('button', { name: zh.common.save, exact: true }).click();
      await visible(dialog.getByRole('alert').filter({ hasText: 'Fixture stopped before save' }).first());
      assert.equal(submitted.plans[0].provider_entry_id, 'a2');
      assert.equal(submitted.plans[0].provider_entry_group, 'Pool 2');
      assert.deepEqual(errors, []);
      assert.deepEqual(writes, ['/api/admin/failover/tasks/1']);
      console.log(`PASS V1 credential preference ${width}-${theme}`);
      await context.close();
    }
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
