const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const repo = path.resolve(__dirname, '..');
const out = path.resolve(repo, '../builds/ux-readiness-20260918');
fs.mkdirSync(out, { recursive: true });
const zh = JSON.parse(fs.readFileSync(path.join(repo, 'src/i18n/locales/zh_CN.json')));
const checks = [], errors = [], requests = [], writes = [], held = [];
let account = 'a', role = 'admin', features = [], sessionStatus = 200;
let holdPattern, failPattern, chunkMode = '', chunkFailures = 0, htmlLoads = 0;
let base, browser, context, page;
let allowExec = false;
let conditionStatus = 'ok', conditionHistoryCount = 20, conditionReads = 0;
const env = data => ({ status: 'success', data });
const nodes = owner => Array.from({ length: 100 }, (_, i) => ({
  uuid: `${owner}-node-${i}`, name: `${owner.toUpperCase()}-NODE-${i}`, ipv4: `192.0.2.${i+1}`,
  group: 'Audit', region: 'JP', version: '0.2.7', cpu_cores: 4, mem_total: 8589934592,
  disk_total: 85899345920, os: 'Debian', arch: 'amd64',
}));
const execution = owner => ({ id: 1, task_id: 1, service_id: 1, member_id: 1, status: 'running',
  started_at: new Date().toISOString(), steps: [], candidates: [] });
function fixture(p, request, owner = account) {
  if (p === '/api/me') return { logged_in: owner !== 'anonymous', role, username: owner.toUpperCase(), uuid: owner, allowed_features: features };
  if (p === '/api/public') return env({ sitename: 'kelicloud', private_site: false });
  if (p.includes('/settings')) return env({ eula_accepted: true, failover_v2_scheduler_enabled: true });
  if (p === '/api/admin/client/list') return nodes(owner);
  if (/\/client\/[^/]+\/condition-script$/.test(p)) {
    conditionReads++;
    return env({ id: 1, client_uuid: owner+'-node-0', enabled: true, command_id: 1,
      trigger_statuses: ['blocked_suspected','degraded'], failure_threshold: 2, cooldown_seconds: 600,
      last_status: conditionStatus, consecutive_failures: conditionStatus === 'ok' ? 0 : 3 });
  }
  if (p.endsWith('/condition-script/triggers')) return env(Array.from({length:conditionHistoryCount},(_,i)=>({
    id:conditionHistoryCount-i, status:'submitted', connectivity_status:'blocked_suspected', failure_count:2,
    reason:i===0?'manual run':'cn_connectivity blocked_suspected (2 failures)',
    task_id:'condition-task-'+(conditionHistoryCount-i), created_at:'2026-10-29T00:00:00Z',
  })));
  if (p === '/api/rpc2') {
    const q = request.postDataJSON();
    const reply = item => ({ jsonrpc: '2.0', id: item.id, result: item.method === 'common:getNodesLatestStatus'
      ? Object.fromEntries((item.params?.uuids || nodes(owner).map(n => n.uuid)).map(uuid => [uuid, {
        client: uuid, online: true, cpu: 25, ram: 2000000, disk: 3000000, time: new Date().toISOString(),
      }])) : {} });
    return Array.isArray(q) ? q.map(reply) : reply(q);
  }
  if (p === '/api/admin/clipboard') return env([{ id: 1, name: `${owner.toUpperCase()}-SCRIPT`, text: 'echo audit', remark: '', weight: 0 }]);
  if (p === '/api/admin/task/all') return env([{ task_id: `${owner.toUpperCase()}-TASK`, clients: [`${owner}-node-0`], results: [] }]);
  if (p.endsWith('/result')) return env([{ client: `${owner}-node-0`, result: `${owner.toUpperCase()}-OUTPUT`, exit_code: 0, finished_at: new Date().toISOString() }]);
  if (p === '/api/admin/failover/tasks') return env([{ id: 1, name: `${owner.toUpperCase()}-V1`, enabled: true, plans: [], latest_execution: execution(owner), current_address: '192.0.2.1' }]);
  if (p === '/api/admin/failover-v2/services') return env([{ id: 1, name: `${owner.toUpperCase()}-V2`, enabled: true, member_count: 1,
    members: [{ id: 1, name: 'Audit member', enabled: true, status: 'running', latest_execution: execution(owner) }],
    recent_executions: [execution(owner)], last_execution: execution(owner), enabled_member_count: 1, check_interval_seconds: 60 }]);
  if (p.endsWith('/executions')) return env([execution(owner)]);
  if (/\/executions\/\d+$/.test(p)) return env(execution(owner));
  if (p.includes('/providers/')) return env({ entries: [] });
  return env([]);
}
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
// Static build only: there is deliberately no proxy or production API target.
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.startsWith('/api/')) { res.writeHead(404); return res.end(); }
  let file = path.resolve(repo, 'dist', '.' + pathname);
  if (!file.startsWith(path.resolve(repo, 'dist') + path.sep)) file = '';
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (path.extname(pathname)) { res.writeHead(404); return res.end(); }
    file = path.join(repo, 'dist/index.html'); htmlLoads++;
  }
  if (chunkMode && /chunk-FailoverV2Page-[^/]+\.js$/.test(file) && (chunkMode === 'permanent' || chunkFailures === 0)) {
    chunkFailures++; res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
const visible = locator => locator.first().waitFor({ state: 'visible', timeout: 15000 });
const until = async fn => { for (let i=0;i<120;i++) { if(await fn()) return; await new Promise(r=>setTimeout(r,100)); } throw Error('Condition timeout'); };
const check = async (name, fn) => { await fn(); checks.push(name); console.log('PASS '+name); };
const count = pattern => requests.filter(r => pattern.test(r.key)).length;
const changeVisibility = async visible => page.evaluate(v => { window.__auditVisible=v; document.dispatchEvent(new Event('visibilitychange')); }, visible);
const go = async route => {
  if (page) await page.close();
  page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base+route, { waitUntil: 'networkidle' });
};
const memory = async () => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  const metrics = await cdp.send('Runtime.getHeapUsage');
  const dom = await cdp.send('Memory.getDOMCounters');
  await cdp.detach();
  return { ...metrics, ...dom };
};

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:'+server.address().port;
  try {
    browser = await chromium.launch({ headless: true, ...(process.platform==='win32' ? {channel:'msedge'} : {}) });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN', serviceWorkers: 'block' });
    await context.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'zh-CN');
      window.__auditVisible = true;
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__auditVisible ? 'visible' : 'hidden' });
    });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()), p = url.pathname;
      if (url.origin !== base) return route.abort();
      if (!p.startsWith('/api/')) return route.continue();
      const key = p === '/api/rpc2' ? p+':'+(req.postDataJSON().method || 'batch') : p;
      requests.push({ key, time: Date.now(), owner: account });
      if (req.method() !== 'GET' && p !== '/api/rpc2') {
        writes.push(p);
        assert.ok(allowExec && p === '/api/admin/task/exec', 'Unexpected mutation '+p);
        await new Promise(resolve=>held.push(resolve));
        return route.fulfill({ json:env({task_id:'delayed-task'}) }).catch(()=>{});
      }
      const owner = account, data = fixture(p,req,owner);
      if (holdPattern?.test(p)) await new Promise(resolve=>held.push(resolve));
      if (p === '/api/me' && sessionStatus !== 200) return route.fulfill({ status:sessionStatus, json:{message:'Session expired'} });
      if (failPattern?.test(p)) return route.fulfill({ status:503, json:{message:'AUDIT NETWORK FAILURE'} });
      return route.fulfill({ json:data }).catch(()=>{});
    });

    if(process.env.READINESS_VISUAL_ONLY === '1'){
      chunkMode='permanent';chunkFailures=0;
      await go('/admin/failover-v2');
      await visible(page.getByText(zh.release_recovery.load_failed,{exact:true}));
      await page.setViewportSize({width:390,height:844});
      for(const theme of ['light','dark']){
        await check('Module failure stays readable on mobile in '+theme+' mode',async()=>{
          if(theme==='dark') await page.getByRole('button',{name:zh.theme.toggle.replace('{{mode}}',zh.theme.dark),exact:true}).click();
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
          const message=page.getByText(zh.release_recovery.load_failed,{exact:true});
          const bounds=await message.boundingBox();
          assert.ok(bounds && bounds.x>=0 && bounds.x+bounds.width<=391);
          await visible(page.getByRole('button',{name:zh.release_recovery.reload,exact:true}));
          await page.screenshot({path:path.join(out,'chunk-error-mobile-'+theme+'.png')});
        });
      }
      assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
      fs.writeFileSync(path.join(out,'visual-results.json'),JSON.stringify({checks,errors,writes},null,2));
      console.log('PASS '+checks.length+' mobile module-failure checks');
      return;
    }

    await go('/admin/exec');
    await check('Administrator identity changes replace scripts, task state and server selection', async()=>{
      await visible(page.getByText('A-SCRIPT',{exact:true}));
      account='b'; await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await visible(page.getByText('B-SCRIPT',{exact:true}));
      assert.equal(await page.getByText('A-SCRIPT',{exact:true}).count(),0);
      assert.equal(await page.locator('body').innerText().then(t=>t.includes('A-NODE')),false);
    });
    await check('A delayed previous-account response cannot repopulate the new account', async()=>{
      holdPattern=/clipboard$/; account='a'; await page.evaluate(()=>window.dispatchEvent(new Event('focus'))); await until(()=>held.length>0);
      holdPattern=null; account='b'; await page.evaluate(()=>window.dispatchEvent(new Event('focus'))); await visible(page.getByText('B-SCRIPT',{exact:true}));
      held.splice(0).forEach(fn=>fn()); await page.waitForTimeout(300);
      assert.equal(await page.getByText('A-SCRIPT',{exact:true}).count(),0);
    });
    await check('Session expiry removes private page data', async()=>{
      sessionStatus=401; await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.getByText('B-SCRIPT',{exact:true}).waitFor({state:'hidden'});
      assert.equal(await page.getByText('A-SCRIPT',{exact:true}).count(),0);
      sessionStatus=200; account='a';
    });
    await go('/admin/exec');
    await check('A same-account session check preserves an unsaved script draft',async()=>{
      await page.getByRole('button',{name:zh.command_clipboard.new_command,exact:true}).click();
      const name=page.getByRole('dialog').locator('input').first(); await name.fill('PRESERVED-DRAFT');
      const n=count(/^\/api\/me$/);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await until(()=>count(/^\/api\/me$/)>n);await page.waitForTimeout(200);
      assert.equal(await name.inputValue(),'PRESERVED-DRAFT');
      await page.screenshot({path:path.join(out,'same-account-draft.png')});
    });
    await check('Unsaved drafts block version reload and route changes before a new chunk is requested',async()=>{
      assert.equal(await page.evaluate(()=>window.dispatchEvent(new Event('kelicloud:before-reload',{cancelable:true}))),false);
      chunkMode='permanent';chunkFailures=0;
      await page.locator('a[href="/admin/failover-v2"]').first().evaluate(e=>e.click());await visible(page.getByRole('alertdialog'));
      await page.getByRole('button',{name:zh.form_draft.keep_editing,exact:true}).click();await page.locator('[data-slot="alert-dialog-content"]').waitFor({state:'detached'});
      assert.equal(await page.getByRole('dialog').locator('input').first().inputValue(),'PRESERVED-DRAFT');
      assert.equal(chunkFailures,0);assert.ok(page.url().endsWith('/admin/exec'));chunkMode='';
    });
    await go('/admin/exec');
    await check('Permission downgrades reset the current page and stop private node reads',async()=>{
      const n=count(/client\/list$/);role='user';features=['clipboard'];await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.getByRole('button',{name:zh.exec.createTask || '创建任务',exact:true}).waitFor({state:'hidden'});
      await visible(page.getByText('A-SCRIPT',{exact:true}));await page.waitForTimeout(250);assert.equal(count(/client\/list$/),n);
      features=[];await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('A-SCRIPT',{exact:true}).waitFor({state:'hidden'});
      role='admin';features=[];
    });
    for(const leave of [true,false]){
      await go('/admin/exec');await page.clock.install();
      await page.getByRole('button',{name:'选择节点',exact:true}).click();await page.getByRole('dialog').getByRole('checkbox').first().click();await page.getByRole('dialog').getByRole('button',{name:'确认',exact:true}).click();
      await page.locator('textarea').first().fill('echo isolated-audit');
      await check(leave?'A late script submission response does not restart polling after leaving':'Submission timeout stays unconfirmed and never resubmits a command',async()=>{
        allowExec=true;const n=writes.length;await page.getByRole('button',{name:'创建任务',exact:true}).click();await until(()=>held.length>0);
        if(leave){
          await page.locator('a[href="/admin/failover"]').first().click();await visible(page.getByText('A-V1',{exact:true}));
          held.splice(0).forEach(fn=>fn());await page.clock.runFor(65_000);assert.equal(count(/delayed-task\/result$/),0);
        }else{
          await page.clock.runFor(31_000);await visible(page.getByText(zh.release_recovery.submit_unconfirmed,{exact:true}));
          held.splice(0).forEach(fn=>fn());await page.clock.runFor(60_000);assert.equal(count(/delayed-task\/result$/),0);
        }
        assert.equal(writes.length-n,1);allowExec=false;
      });
    }
    await go('/admin/failover-v2');
    await check('V2 slow automatic reads do not overlap and hidden tabs stop polling',async()=>{
      await visible(page.getByText('A-V2',{exact:true})); await page.clock.install();holdPattern=/services$/;
      await page.clock.runFor(6_000);await until(()=>held.length>0);const n=count(/services$/);
      await page.clock.runFor(14_000);assert.equal(count(/services$/),n);
      holdPattern=null;held.splice(0).forEach(fn=>fn());await page.waitForTimeout(150);await changeVisibility(false);
      const hidden=count(/services$/);await page.clock.runFor(90_000);assert.equal(count(/services$/),hidden);
      await changeVisibility(true);await page.clock.runFor(16_000);await until(()=>count(/services$/)>hidden);
    });
    await go('/admin/failover');
    await check('V1 slow automatic reads do not starve the displayed result',async()=>{
      await visible(page.getByText('A-V1',{exact:true})); await page.clock.install();holdPattern=/failover\/tasks$/;
      await page.clock.runFor(16_000);await until(()=>held.length>0);const n=count(/failover\/tasks$/);
      await page.clock.runFor(20_000);assert.equal(count(/failover\/tasks$/),n);
      holdPattern=null;held.splice(0).forEach(fn=>fn());await visible(page.getByText('A-V1',{exact:true}));
    });

    const soak=[];
    for(const route of ['/admin/client','/admin/failover','/admin/failover-v2']){
      await go(route);await page.clock.install();const before=await memory(), start=requests.length;
      // Thirty minutes of timer time, with async requests allowed to settle each tick.
      for(let i=0;i<180;i++){await page.clock.runFor(10_000);await page.waitForTimeout(5);}
      const after=await memory(), requestCount=requests.length-start;
      assert.ok(after.usedSize-before.usedSize<24*1024*1024,'Unbounded retained heap '+route);
      assert.ok(after.nodes-before.nodes<300,'Unbounded retained DOM '+route);
      assert.ok(requestCount>80 && requestCount<1000,'Unexpected polling count '+route+': '+requestCount);
      const row={route,virtualMinutes:30,requests:requestCount,before,after};soak.push(row);console.log('SOAK '+JSON.stringify(row));
      if(route==='/admin/client'){
        for(let i=0;i<180;i++){await page.clock.runFor(10_000);await page.waitForTimeout(5);}
        row.followup=await memory();
        assert.ok(row.followup.jsEventListeners-after.jsEventListeners<50,'Server listeners keep accumulating after warmup');
        assert.ok(row.followup.nodes-after.nodes<100,'Server DOM keeps accumulating after warmup');
        assert.ok(row.followup.usedSize-after.usedSize<8*1024*1024,'Server heap keeps accumulating after warmup');
        console.log('SERVER FOLLOWUP '+JSON.stringify(row.followup));
      }
    }
    checks.push('Thirty simulated minutes per main page keep retained heap, DOM and request counts bounded');

    await check('Repeated route transitions dispose the previous page pollers',async()=>{
      await go('/admin/client');await page.clock.install();
      const initial=await memory();
      for(let i=0;i<12;i++){
        for(const route of ['/admin/failover','/admin/failover-v2','/admin/client']){
          await page.locator(`a[href="${route}"]`).first().click();await page.waitForTimeout(200);
        }
      }
      const final=await memory();assert.ok(final.usedSize-initial.usedSize<24*1024*1024);assert.ok(final.nodes-initial.nodes<500);
      const n=count(/failover\/tasks$|services$/);await page.clock.runFor(60_000);assert.equal(count(/failover\/tasks$|services$/),n);
    });

    await check('A missing old route chunk recovers automatically once',async()=>{
      chunkMode='once';chunkFailures=0;const n=htmlLoads;
      await go('/admin/failover-v2');await visible(page.getByText('A-V2',{exact:true}));
      assert.equal(chunkFailures,1);assert.equal(htmlLoads-n,2);chunkMode='';
    });
    await check('A permanently missing nested chunk cannot cause a reload loop',async()=>{
      await context.clearCookies();chunkMode='permanent';chunkFailures=0;const n=htmlLoads;
      await go('/admin/failover-v2');await visible(page.getByText(zh.release_recovery.load_failed,{exact:true}));await page.waitForTimeout(2500);
      assert.equal(htmlLoads-n,2);assert.equal(chunkFailures,2);chunkMode='';
      await page.screenshot({path:path.join(out,'permanent-chunk-error.png')});
    });
    for (const theme of ['light','dark']) {
      for (const width of [1440,390]) {
        await check('Condition history and live state at '+width+'-'+theme,async()=>{
          conditionStatus='ok'; conditionHistoryCount=20;
          await go('/admin/client');
          await page.setViewportSize({width,height:width===390?844:1000});
          await page.evaluate(value=>localStorage.setItem('appearance',JSON.stringify(value)),theme);
          await page.reload({waitUntil:'networkidle'});
          await page.clock.install();
          await page.locator('tr').filter({hasText:'192.0.2.1'}).first().click({button:'right'});
          await page.getByRole('menuitem',{name:zh.admin.nodeTable.conditionScript.title,exact:true}).click();
          const dialog=page.getByRole('dialog'), records=dialog.locator('[data-condition-trigger]');
          const pager=dialog.getByRole('navigation',{name:zh.admin.nodeTable.conditionScript.history});
          const refresh=dialog.getByRole('button',{name:zh.common.refresh,exact:true});
          await until(async()=>await records.count()===5);
          assert.equal(await records.first().getAttribute('data-condition-trigger'),'20');
          await visible(records.first().getByText(zh.admin.nodeTable.conditionScript.manualTrigger,{exact:true}));
          assert.ok(await pager.getByRole('button',{name:zh.admin.pagination.previous}).isDisabled());
          await pager.getByRole('button',{name:zh.admin.pagination.next}).click();
          assert.equal(await records.first().getAttribute('data-condition-trigger'),'15');
          assert.equal(await records.first().getByText('Task: condition-task-15',{exact:true}).isVisible(),false);
          await records.first().locator('summary').click();
          await visible(records.first().getByText('Task: condition-task-15',{exact:true}));
          await records.first().locator('summary').click();
          const threshold=dialog.getByRole('spinbutton').first();
          await threshold.fill('9');
          conditionStatus='blocked_suspected'; await refresh.click();
          await visible(dialog.locator('[data-condition-state]').getByText(zh.admin.nodeTable.cnConnectivityBlocked,{exact:true}));
          assert.equal(await threshold.inputValue(),'9');
          assert.equal(await records.first().getAttribute('data-condition-trigger'),'15');
          conditionStatus='degraded';
          await until(async()=>await refresh.isEnabled());
          await page.clock.fastForward(16000);
          await visible(dialog.locator('[data-condition-state]').getByText(zh.admin.nodeTable.cnConnectivityDegraded,{exact:true}));
          assert.equal(await threshold.inputValue(),'9');
          assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
          await dialog.locator('[data-condition-state]').scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(out,'condition-script-'+width+'-'+theme+'.png')});
          conditionHistoryCount=2; await refresh.click();
          await until(async()=>await records.count()===2);
          assert.equal(await pager.count(),0);
          conditionHistoryCount=0; await refresh.click();
          await visible(dialog.getByText(zh.admin.nodeTable.conditionScript.emptyHistory,{exact:true}));
          await page.keyboard.press('Escape');
          await until(async()=>await page.getByRole('dialog').count()===0);
          const reads=conditionReads;
          await page.clock.fastForward(30000);
          assert.equal(conditionReads,reads,'Closed condition dialog kept polling');
        });
      }
    }
    const realtime = [];
    const realDuration = Number(process.env.READINESS_REAL_MS || 0);
    if(realDuration>0){
      await page.close();
      const openPages=[];
      for(const route of ['/admin/client','/admin/failover','/admin/failover-v2']){
        page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
        await page.goto(base+route,{waitUntil:'networkidle'});
        openPages.push({page,route,before:await memory()});
      }
      const started=Date.now(), requestStart=requests.length;
      while(Date.now()-started<realDuration){
        await new Promise(resolve=>setTimeout(resolve,Math.min(60_000,realDuration-(Date.now()-started))));
        console.log('REALTIME '+Math.round((Date.now()-started)/1000)+'s, '+(requests.length-requestStart)+' reads');
      }
      for(const item of openPages){
        page=item.page;const after=await memory();
        assert.ok(after.usedSize-item.before.usedSize<24*1024*1024);assert.ok(after.nodes-item.before.nodes<300);
        realtime.push({route:item.route,durationMs:Date.now()-started,before:item.before,after});
      }
      checks.push('Real elapsed-time multi-page soak keeps retained heap and DOM bounded');
    }
    assert.deepEqual(errors,[]);assert.deepEqual(writes,['/api/admin/task/exec','/api/admin/task/exec']);
    fs.writeFileSync(path.join(out,'release-results.json'),JSON.stringify({checks,errors,writes,soak,realtime},null,2));
    console.log('PASS '+checks.length+' production readiness checks');
  }catch(error){
    if(page){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText().catch(()=>''));}
    fs.writeFileSync(path.join(out,'failure-requests.json'),JSON.stringify({requests,checks,errors},null,2));
    console.error(error);process.exitCode=1;
  }finally{held.splice(0).forEach(fn=>fn());if(browser)await browser.close();server.closeAllConnections();server.close();}
})();
