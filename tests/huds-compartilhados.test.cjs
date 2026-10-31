const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const http=require('node:http');
const {tmpdir}=require('node:os');
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
test('HUD compartilhado nos quatro jogos, Bits alinhado e Wording com letras preservadas',{timeout:60000},async t=>{
 // Preferências entre páginas devem usar a mesma origem HTTP, como no Pages.
 // O isolamento de localStorage em file:// varia entre navegadores/plataformas.
 const server=http.createServer(async(req,res)=>{try{
   const name=new URL(req.url,'http://localhost').pathname;
   const file=path.join(root,name);
   res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8','json':'application/json'})[path.extname(file).slice(1)]||'application/octet-stream');
   res.end(await fs.readFile(file));
 }catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 t.after(()=>{server.closeAllConnections();server.close()});
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1280,height:1000}});t.after(()=>context.close());
 await context.addInitScript(()=>{
   localStorage.setItem('huba:mode:v1','training');if(!localStorage.getItem('huba:hud:v1'))localStorage.setItem('huba:bits:hud:v1','focus');
   window.testAudio=[];window.Audio=class extends EventTarget{
     constructor(){super();this.currentTime=0;this.duration=30;this.src='';this.paused=true;testAudio.push(this)}
     load(){setTimeout(()=>{this.onloadedmetadata?.();this.dispatchEvent(new Event('loadedmetadata'))},0)}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}removeAttribute(){this.src=''}getAttribute(n){return n==='src'?this.src:null}
   };
 });
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.route('**/playlists.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.HUBA_MUSICAS={fontes:["rock: playlist:1"]};'}));
 await context.route('**/jogos/bits/artistas.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.HUBA_BITS_ARTISTAS={rock:[{id:1,name:"Artist"}],pop:[{id:2,name:"Pop"}],rap:[{id:3,name:"Rap"}]};'}));
 await context.route('https://api.deezer.com/**',r=>{
   const u=new URL(r.request().url()),track=/\/track\/(\d+)/.exec(u.pathname)?.[1];
   function song(id){return {id,title:'Faixa '+id,artist:{id:1,name:'Artist'},preview:'https://audio.test/'+id}}
   const data=track?song(Number(track)):{data:Array.from({length:20},(_,i)=>song(i+1))};
   return r.fulfill({contentType:'application/javascript',body:u.searchParams.get('callback')+'('+JSON.stringify(data)+');'});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const output=path.join(tmpdir(),'huba-shared-huds');await fs.mkdir(output,{recursive:true});
 async function select(hud){await page.locator('.bits-hud-menu>summary').click();await page.locator('[data-bits-hud-choice="'+hud+'"]').click()}
 async function checkMusicCounter(){
   const delta=await page.evaluate(()=>{const a=document.querySelector('#play>.panel').getBoundingClientRect(),b=document.querySelector('#gameCatalogCount').getBoundingClientRect();return Math.max(Math.abs(a.left-b.left),Math.abs(a.right-b.right))});
   assert.ok(delta<1,'contador acompanha as duas bordas do quadro');
 }
 await page.goto(base+'/index.html');assert.equal(await page.locator('html').getAttribute('data-hud'),'focus','preserva seleção antiga do Bits');await select('panel');
 for(const game of ['bits','musicle','streakal','wording']){
   await page.goto(base+'/jogos/'+game+'/index.html');assert.equal(await page.locator('html').getAttribute('data-hud'),'panel');
   if(game==='musicle'||game==='streakal'){
     for(const width of [1280,320]){
       await page.setViewportSize({width,height:1000});
       const alignment=await page.evaluate(()=>{const p=document.querySelector('#summary'),a=document.querySelector('#home .game-column').getBoundingClientRect(),b=p.getBoundingClientRect();return {position:getComputedStyle(p).position,delta:Math.max(Math.abs(a.left-b.left),Math.abs(a.right-b.right)),below:b.top>=a.bottom}});
       assert.equal(alignment.position,'static');assert.ok(alignment.delta<1&&alignment.below,'aviso abaixo e alinhado ao quadro de seleção');
     }
     await page.setViewportSize({width:1280,height:1000});
   }
   const tiles=game==='bits'?'#dailyTiles':game==='wording'?'#wTilesDaily':'#tilesDaily';await page.locator(tiles+' button').first().waitFor({state:'visible'});
   if(game==='wording')await page.waitForFunction(()=>!document.querySelector('#wTilesDaily button').disabled);
   await page.locator(tiles+' button').first().click();await page.locator(game==='bits'?'#bitsGame':game==='wording'?'#wgame':'#play').waitFor({state:'visible'});
   if(game==='musicle'||game==='streakal')assert.equal(await page.locator('#summary').isVisible(),false,'sem aviso de seleção flutuando sobre a partida');
   if(game==='wording'){await page.locator('#wTitle').click();await page.keyboard.type('ab')}
   const layouts=[];
   for(const hud of ['focus','studio','arcade','terminal','panel']){
     await select(hud);assert.equal(await page.locator('html').getAttribute('data-hud'),hud);
     const card=game==='bits'?'.bits-play-card':game==='wording'?'.w-board':'#play>.panel';
     layouts.push(await page.locator(card).first().evaluate(el=>{const s=getComputedStyle(el);return [s.borderRadius,s.backgroundColor,s.borderTopWidth,s.padding,s.fontFamily,s.boxShadow].join('|')}));
     if(game==='wording')assert.equal((await page.locator('#wBoards').textContent()).replace(/\s/g,'').toUpperCase(),'AB');
     if(game==='bits'){
       assert.equal(await page.locator('#catalogCount').count(),0);
       const alignment=await page.evaluate(()=>{const a=document.querySelector('.bits-play-card').getBoundingClientRect(),b=document.querySelector('#gameCatalogCount').getBoundingClientRect(),back=document.querySelector('#backGame').getBoundingClientRect();return {delta:Math.abs(a.right-b.right),back:back.width}});
       assert.ok(alignment.delta<1,'contador acompanha '+hud);assert.ok(alignment.back<130,'Voltar não estica');
     }
     if(game==='musicle'||game==='streakal')await checkMusicCounter();
     await page.screenshot({path:path.join(output,game+'-'+hud+'-desktop.png'),fullPage:true});
     await page.setViewportSize({width:320,height:900});
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),game+' '+hud+': sem rolagem horizontal');
     if(game==='musicle'||game==='streakal')assert.ok(await page.locator('.bar').evaluate(el=>el.getBoundingClientRect().height<=26),'barra de áudio mantém altura compacta');
     if(game==='musicle'||game==='streakal')await checkMusicCounter();
     await page.locator('.bits-hud-menu>summary').click();const menu=await page.locator('.bits-hud-options').boundingBox();assert.ok(menu.x>=0&&menu.x+menu.width<=320);await page.keyboard.press('Escape');
     await page.screenshot({path:path.join(output,game+'-'+hud+'-mobile.png'),fullPage:true});
     await page.setViewportSize({width:1280,height:1000});
   }
   assert.equal(new Set(layouts).size,5,'estilos distintos em '+game);
   if(game==='musicle'||game==='streakal'){await select('original');await checkMusicCounter();await select('panel')}
   if(game==='wording'){
     await page.locator('#wGameStats').click();assert.equal(await page.locator('#wStats').evaluate(el=>el.open),true);await page.locator('#wStatsClose').click();
     await page.locator('#wBack').click();
     for(const n of [1,2]){
       await page.locator('#wTilesDaily button').nth(n).click();assert.equal(await page.locator('.w-board').count(),n===1?2:4);
       for(const hud of ['studio','panel']){await select(hud);await page.setViewportSize({width:320,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.setViewportSize({width:1280,height:1000})}
       await page.locator('#wBack').click();
     }
   }else{
     await page.locator(game==='bits'?'#skipGuess':'#opts button').first().click();
     if(game==='streakal'&&await page.locator('#upgradePanel').isVisible())await page.locator('#extraOption').click();
   }
 }
 await page.reload();assert.equal(await page.locator('html').getAttribute('data-hud'),'panel');assert.deepEqual(errors,[]);console.log('SHARED HUD SCREENSHOTS '+output);
});
