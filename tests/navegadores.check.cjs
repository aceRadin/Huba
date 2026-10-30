/* Teste de integração nos três motores; API simulada, áudio WAV real. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const playwright=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
for(const engine of ['chromium','firefox','webkit'])test('fluxos essenciais em '+engine,{timeout:90000},async t=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p.startsWith('/audio/')){res.setHeader('Content-Type','audio/wav');res.end(wav);return}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/html');res.end(await fs.readFile(path.join(root,p)))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>{server.closeAllConnections();server.close()});
 const browser=await playwright[engine].launch({headless:true,...(engine==='chromium'&&process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 // WebKit on Windows does not route native media through Playwright's HTTPS mock.
 const audioBase='http://127.0.0.1:'+server.address().port+'/audio/';
 await context.addInitScript(base=>{const Native=Audio,src=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');window.testAudio=[];window.Audio=function(){const a=new Native();Object.defineProperty(a,'src',{get(){return src.get.call(a)},set(v){src.set.call(a,v.replace('https://audio.test/',base))}});testAudio.push(a);return a}},audioBase);
 await context.route('**/playlists.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.HUBA_MUSICAS={fontes:['rock: playlist:1']}"}));
 await context.route('**/artistas.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.HUBA_BITS_ARTISTAS={rock:[{id:1,name:'Artist'}],pop:[{id:1,name:'Artist'}],rap:[{id:1,name:'Artist'}]}"}));
 const base='http://127.0.0.1:'+server.address().port;
 const song=id=>({id,title:'Song '+id,artist:{id:1,name:'Artist'},preview:'https://audio.test/'+id});
 await context.route('https://api.deezer.com/**',r=>{const u=new URL(r.request().url()),id=/\/track\/(\d+)/.exec(u.pathname)?.[1];return r.fulfill({contentType:'application/javascript',body:u.searchParams.get('callback')+'('+JSON.stringify(id?song(Number(id)):{data:Array.from({length:25},(_,i)=>song(i+1))})+')'})});
 const wav=Buffer.alloc(44+30*8000*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 await context.route('https://audio.test/**',r=>{
   const range=/bytes=(\d+)-(\d*)/.exec(r.request().headers().range||'');
   if(!range)return r.fulfill({contentType:'audio/wav',headers:{'Accept-Ranges':'bytes'},body:wav});
   const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),wav.length-1):wav.length-1;
   return r.fulfill({status:206,contentType:'audio/wav',headers:{'Content-Range':'bytes '+start+'-'+end+'/'+wav.length,'Accept-Ranges':'bytes'},body:wav.subarray(start,end+1)});
 });
 page.setDefaultTimeout(12000);
 for(const game of ['musicle','streakal','bits','wording']){
   console.log(engine+': '+game);
   await page.goto(base+'/jogos/'+game+'/index.html');
   await page.evaluate(()=>HUBA_I18N.setLanguage('pt'));
   await page.locator(game==='bits'?'#dailyTiles button':game==='wording'?'#wTilesDaily button':'#tilesDaily button').first().click();
   if(game==='wording'){
     await page.waitForSelector('.w-tile.act');await page.locator('#wTitle').click();await page.keyboard.type('abcde');
     assert.equal(await page.locator('.w-tile.act').allTextContents().then(a=>a.join('')),'abcde');
     assert.match(await page.locator('.w-tile.act').first().getAttribute('aria-label'),/Posição 1/);
   }else{
     await page.waitForFunction(()=>testAudio[0].readyState>=1).catch(async e=>{console.log(await page.evaluate(()=>({source:testAudio[0].src,ready:testAudio[0].readyState,error:testAudio[0].error&&{code:testAudio[0].error.code,message:testAudio[0].error.message},hint:document.querySelector('#qhint')?.textContent})));throw e});
     await page.locator(game==='bits'?'#playAudio':'#playBtn').click();
     await page.waitForFunction(()=>testAudio[0].currentTime>0);
     if(game==='bits'){await page.locator('#guessInput').fill('Song');await page.locator('#suggestions button').first().click();await page.locator('#submitGuess').click();assert.equal(await page.locator('#history>div').count(),1)}
     else{await page.locator('#opts button').first().click();assert.ok((await page.locator('#qhint').textContent()).length>0)}
   }
   await page.evaluate(()=>HUBA_I18N.setLanguage('en'));assert.equal(await page.locator('html').getAttribute('lang'),'en');
   await page.locator('.bits-hud-menu>summary').click();await page.locator('[data-bits-hud-choice="focus"]').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'sem overflow em '+game);
 }
 assert.deepEqual(errors,[]);
});
