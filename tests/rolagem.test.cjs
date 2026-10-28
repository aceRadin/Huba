const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
test('rolagem natural sem reservas duplicadas e sem esconder conteúdo',{timeout:30000},async t=>{
 const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.join(root,name.endsWith('/')?name+'index.html':name);res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8','json':'application/json'})[file.split('.').pop()]||'application/octet-stream');res.end(await fs.readFile(file))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});
 t.after(async()=>{await browser.close();await new Promise(r=>server.close(r))});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 for(const game of ['streakal','wording']){
  await page.goto(base+'/jogos/'+game+'/');
  if(game==='wording')await page.waitForFunction(()=>!document.querySelector('#wTilesDaily button').disabled);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),900,game+': seleção sem rolagem desnecessária');
  await page.setViewportSize({width:390,height:500});
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const clearance=await page.evaluate(game=>{const tile=document.querySelector(game==='wording'?'#wTilesDaily button:last-child':'#tilesDaily button:last-child').getBoundingClientRect();const support=document.querySelector(game==='wording'?'.huba-support-dropdown':'.huba-support').getBoundingClientRect();return support.top-tile.bottom},game);
  assert.ok(clearance>=0,'última opção não fica atrás do apoio: '+game);
  await page.setViewportSize({width:1280,height:900});
 }
 await page.setViewportSize({width:1280,height:1080});
 await page.locator('#wTilesDaily button').first().click();
 await page.evaluate(()=>document.querySelector('.huba-support-dropdown').open=false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),1080,'partida que cabe não força barra');
 await page.setViewportSize({width:390,height:500});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),'tela pequena mantém rolagem necessária');
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 assert.ok(await page.locator('#wKb').evaluate(el=>el.getBoundingClientRect().bottom<innerHeight));
 assert.notEqual(await page.locator('body').evaluate(el=>getComputedStyle(el).overflowY),'hidden');
 assert.deepEqual(errors,[]);
});
