import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {generate} from '../scripts/gerar-playlists.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const sources=['rock: playlist:10, playlist:11','pop: playlist:20','power metal: playlist:10'];
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
function song(id){return {id,title:'Faixa '+id,artist:{name:'Artista '+id},preview:'https://audio.huba.test/audio/'+id,album:{cover_medium:'https://covers.test/'+id}}}
function response(url){
 const u=new URL(url),id=/\/playlist\/(\d+)/.exec(u.pathname)?.[1];
 if(!id)throw Error('URL inesperada: '+url);
 const start=id==='10'?1:id==='11'?141:1001;
 const all=Array.from({length:160},(_,i)=>song(start+i));all.push(song(start),{id:9999,title:'Sem prévia',artist:{name:'Teste'}});
 const index=Number(u.searchParams.get('index')||0),limit=Number(u.searchParams.get('limit'));
 const data={data:all.slice(index,index+limit)};
 if(index+limit<all.length)data.next='https://api.deezer.com/playlist/'+id+'/tracks?index='+(index+limit)+'&limit='+limit;
 return data;
}
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'huba-playlists-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const text='window.HUBA_MUSICAS={fontes:'+JSON.stringify(sources)+'};';await writeFile(join(root,'playlists.js'),text);
 const requests=[],waits=[];let fail=false;
 const fetcher=async url=>{requests.push(url);if(fail)throw Error('Falha de rede');return {ok:true,json:async()=>response(url)}};
 return {root,fetcher,sleep:async ms=>{waits.push(ms)},requests,waits,fail:()=>{fail=true},text};
}
test('prepara todas as páginas, reutiliza playlists e mantém catálogo idêntico ao carregador anterior',async t=>{
 const f=await fixture(t),result=await generate(f);assert.deepEqual(result.counts,{rock:300,pop:160,'power metal':160});assert.equal(f.requests.length,6);
 assert.equal(await readFile(join(f.root,'playlists.js'),'utf8'),f.text,'preserva o arquivo compartilhado');
 const context={window:{},HUBA:{norm},URL,AbortController};vm.createContext(context);
 vm.runInContext(await readFile(resolve('js/deezer.js'),'utf8'),context);
 const live=context.window.HUBADeezer.create({sources,artistLimit:8,pageProvider:async url=>response(url)});
 for(const genre of ['rock','pop','power metal']){
   const old=await live.select(genre,1,true);
   vm.runInContext(await readFile(join(f.root,'dados/playlists',result.files[genre]),'utf8'),context);
   const tracks=context.window.HUBA_PLAYLISTS_PAGES[genre].tracks;
   const prepared=context.window.HUBADeezer.create({sources,artistLimit:8,catalogProvider:async()=>tracks});
   const state=await prepared.select(genre,1,true);
   assert.equal(JSON.stringify(state.songs),JSON.stringify(old.songs),'mesma ordem, IDs, rótulos e prévias em '+genre);
 }
 f.fail();assert.equal((await generate(f)).version,result.version);assert.equal(f.requests.length,6,'republicar no mesmo dia não consulta playlists');
 const before=await readFile(join(f.root,'dados/playlists/config.js'),'utf8');
 await assert.rejects(generate({...f,date:'2099-01-01'}),/Falha de rede/);
 assert.equal(await readFile(join(f.root,'dados/playlists/config.js'),'utf8'),before);
 assert.deepEqual(f.waits.slice(-4),[300,2000,4000,8000]);
});
test('paginação repetida ou fora do Deezer bloqueia a publicação sem catálogo parcial',async t=>{
 for(const next of ['https://other.test/tracks','https://api.deezer.com/playlist/10/tracks?limit=100']){
   const f=await fixture(t);await assert.rejects(generate({...f,fetcher:async()=>({ok:true,json:async()=>({data:[song(1)],next})})}),/não autorizada|Paginação repetida/);
   await assert.rejects(readFile(join(f.root,'dados/playlists/config.js')),/ENOENT/);
 }
});
test('Musical e Streakal usam só o arquivo escolhido, com alternativas, diários, falhas e áudio preservados',{timeout:60000},async t=>{
 const f=await fixture(t),result=await generate(f);
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});t.after(()=>browser.close());
 async function open(game,latency=20,failFirst=false){
   const context=await browser.newContext(),files=[],api=[],errors=[];
   await context.addInitScript(()=>{window.testAudio=[];window.Audio=class extends EventTarget{
     constructor(){super();this.currentTime=0;this.duration=30;this.paused=true;this.src='';this.starts=[];testAudio.push(this)}
     load(){setTimeout(()=>{this.onloadedmetadata?.();this.dispatchEvent(new Event('loadedmetadata'))},0)}
     pause(){this.paused=true}play(){this.paused=false;this.starts.push(this.currentTime);return Promise.resolve()}removeAttribute(){this.src=''}getAttribute(name){return name==='src'?this.src:null}
   }});
   await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
   await context.route('**/playlists.js*',r=>r.fulfill({contentType:'application/javascript',body:f.text}));
   await context.route('**/dados/playlists/*.js',async r=>{
     const name=new URL(r.request().url()).pathname.split('/').pop();files.push(name);
     await new Promise(resolve=>setTimeout(resolve,latency));
     if(failFirst&&name!== 'config.js'){failFirst=false;return r.abort()}
     return r.fulfill({contentType:'application/javascript',body:await readFile(join(f.root,'dados/playlists',name),'utf8')});
   });
   await context.route('https://api.deezer.com/**',r=>{
     const url=new URL(r.request().url());api.push(url.href);const id=/\/track\/(\d+)/.exec(url.pathname)?.[1];
     if(!id)return r.abort();
     return r.fulfill({contentType:'application/javascript',body:url.searchParams.get('callback')+'('+JSON.stringify({...song(Number(id)),preview:'https://audio.huba.test/fresh/'+id})+')'});
   });
   const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('jogos/'+game+'/index.html')).href);
   return {context,page,files,api,errors};
 }
 async function choose(p,genre='Rock'){await p.locator('#tilesDaily button').filter({hasText:genre}).click();await p.waitForSelector('#play:visible')}
 async function target(p){return p.evaluate(()=>/\/(\d+)$/.exec(testAudio[0].src)[1])}
 for(const game of ['musicle','streakal']){
   const a=await open(game,80);t.after(()=>a.context.close());assert.deepEqual(a.files,['config.js']);
   if(game==='musicle'){await a.page.locator('.huba-difficulty > summary').click();await a.page.locator('#clipHard').click()}
   const before=Date.now();await choose(a.page);const ms=Date.now()-before;
   assert.deepEqual(a.files,['config.js',result.files.rock]);assert.ok(a.api.every(u=>u.includes('/track/')));
   assert.match(await a.page.locator('#gameCatalogCount').textContent(),/^300 músicas/);
   const first=await target(a.page);
   const b=await open(game,1);t.after(()=>b.context.close());if(game==='musicle'){await b.page.locator('.huba-difficulty > summary').click();await b.page.locator('#clipHard').click()}await choose(b.page);
   assert.equal(await target(b.page),first,'mesmo alvo com outra latência');
   if(game==='musicle'){
     for(let i=0;i<5;i++){
       assert.equal(await a.page.locator('#opts button').count(),5);
       const id=await target(a.page);await a.page.locator('#opts button[aria-label="Artista '+id+' - Faixa '+id+'"]').click();
       await a.page.locator('#nextBtn').click();
     }
     assert.equal(await a.page.locator('#result').isVisible(),true);
   }else{
     for(let i=0;i<40;i++){
       await a.page.waitForFunction(()=>testAudio[0].src.includes('/fresh/'));
       const id=await target(a.page);await a.page.locator('#opts button[aria-label="Artista '+id+' - Faixa '+id+'"]').click();
       if(await a.page.locator('#upgradePanel').isVisible())await a.page.locator(i<13?'#extraOption':'#shorterClip').click();
       assert.ok(await a.page.locator('#opts button').count()<=15);
     }
     assert.match(await a.page.locator('#qcount').textContent(),/Sequência: 40/);
     await a.page.waitForFunction(()=>testAudio[0].src.includes('/fresh/'));
     const score=await a.page.locator('#qcount').textContent();
     await a.page.evaluate(()=>testAudio[0].dispatchEvent(new Event('error')));
     await a.page.waitForFunction(()=>document.querySelector('#qhint').textContent.includes('Prévia atualizada'));
     assert.equal(await a.page.locator('#qcount').textContent(),score);
   }
   assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
   const c=await open(game,20,true);t.after(()=>c.context.close());await c.page.locator('#tilesDaily button').filter({hasText:'Rock'}).click();
   await c.page.waitForFunction(()=>document.querySelector('#dzStatus').textContent.includes('Não foi possível baixar'));
   assert.equal(await c.page.locator('#play').isVisible(),false);await choose(c.page);
   // Trocar de modo/gênero durante o download descarta a seleção anterior.
   const d=await open(game,200);t.after(()=>d.context.close());await d.page.locator('#tilesDaily button').filter({hasText:'Rock'}).click();await d.page.evaluate(()=>HUBA.setMode('training'));await choose(d.page,'Pop');
   assert.match(await d.page.locator('#gameCatalogCount').textContent(),/^160 músicas/);assert.match(await d.page.locator('#playTitle').textContent(),/Pop/);
   await d.page.locator('#backBtn').click();
   await d.page.evaluate(()=>{const Original=Date;window.Date=class extends Original{constructor(...args){super(...(args.length?args:[Original.now()+86400000]))}};HUBA.setMode('daily')});
   await d.page.locator('#tilesDaily button').filter({hasText:'Rock'}).click();await d.page.waitForFunction(()=>document.querySelector('#dzStatus').textContent.includes('atualizado'));
   assert.equal(await d.page.locator('#play').isVisible(),false);assert.deepEqual(d.errors,[]);
   console.log('PLAYLIST PREPARADA '+JSON.stringify({game,ms,catalogFiles:1,playlistRequests:a.api.filter(u=>u.includes('/playlist/')).length}));
 }
});
