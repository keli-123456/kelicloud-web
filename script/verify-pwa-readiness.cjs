const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const repo = path.resolve(__dirname, '..');
const out = path.resolve(repo, '../builds/ux-readiness-20260918');
fs.mkdirSync(out, { recursive: true });
const checks = [], writes = [];
let owner = 'a', browser, base;
const env = data => ({status:'success',data});
const server = http.createServer(async(req,res)=>{
  const p = new URL(req.url,'http://localhost').pathname;
  if(p.startsWith('/api/')){
    let payload=env([]);
    if(req.method!=='GET' && p!=='/api/rpc2'){writes.push(p);res.writeHead(405);return res.end();}
    if(p==='/api/me')payload={logged_in:true,role:'admin',uuid:owner,username:owner.toUpperCase()};
    if(p==='/api/public')payload=env({sitename:'Audit',private_site:false});
    if(p.includes('/settings'))payload=env({eula_accepted:true});
    if(p==='/api/admin/client/list')payload=[];
    if(p==='/api/admin/clipboard')payload=env([{id:1,name:owner.toUpperCase()+'-SCRIPT',text:'echo audit',weight:0}]);
    if(p==='/api/rpc2'){
      let body='';for await(const data of req)body+=data;
      const q=JSON.parse(body),reply=item=>({jsonrpc:'2.0',id:item.id,result:{}});
      payload=Array.isArray(q)?q.map(reply):reply(q);
    }
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(payload));
  }
  let file=path.resolve(repo,'dist','.'+decodeURIComponent(p));
  if(!file.startsWith(path.resolve(repo,'dist')+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){
    if(path.extname(p)){res.writeHead(404);return res.end();}
    file=path.join(repo,'dist/index.html');
  }
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
  try{
    browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
    const context=await browser.newContext({serviceWorkers:'allow'});
    await context.addInitScript(()=>{
      localStorage.setItem('i18nextLng','zh-CN');
      if(!localStorage.getItem('komari-sw-recovery'))localStorage.setItem('komari-sw-recovery','2026-09-account-cache-policy-2');
    });
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    const page=await context.newPage();await page.goto(base+'/admin/exec',{waitUntil:'networkidle'});
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),true);
    await page.getByText('A-SCRIPT',{exact:true}).waitFor();
    owner='b';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.getByText('B-SCRIPT',{exact:true}).waitFor();
    assert.equal(await page.getByText('A-SCRIPT',{exact:true}).count(),0);
    checks.push('An actual active service worker does not retain the previous account response');
    const cachedURLs=await page.evaluate(async()=>{
      const urls=[];for(const key of await caches.keys())for(const req of await(await caches.open(key)).keys())urls.push(req.url);return urls;
    });
    assert.ok(!cachedURLs.some(url=>new URL(url).pathname.startsWith('/api/')));
    await context.setOffline(true);
    assert.equal(await page.evaluate(()=>fetch('/api/admin/clipboard').then(()=>true,()=>false)),false);
    checks.push('Offline API reads fail instead of replaying a cached private response');
    await context.setOffline(false);
    await page.evaluate(async()=>{
      await(await caches.open('api-cache')).put('/api/admin/clipboard',new Response('PRIVATE-OLD-ACCOUNT'));
      localStorage.setItem('komari-sw-recovery','2026-05-commercial-user-policy-1');
    });
    assert.equal(await page.evaluate(async()=>(await caches.keys()).includes('api-cache')),true);
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(async()=>!(await caches.keys()).includes('api-cache'));
    checks.push('Upgrading the cache policy removes the legacy private API cache');
    assert.deepEqual(writes,[]);
    fs.writeFileSync(path.join(out,'pwa-results.json'),JSON.stringify({checks,writes,cachedAssetCount:cachedURLs.length},null,2));
    console.log('PASS '+checks.length+' actual service-worker checks');
  }catch(e){console.error(e);process.exitCode=1;}
  finally{if(browser)await browser.close();server.closeAllConnections();server.close();}
})();
