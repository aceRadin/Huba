import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {generate,dayKey} from '../scripts/gerar-bits-artistas.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const groups={rock:[{id:1,name:'Rock A'},{id:2,name:'Rock B'}],pop:[{id:3,name:'Pop'}],rap:[{id:3,name:'Pop'},{id:4,name:'Rap'}]};
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'huba-artistas-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'jogos/bits'),{recursive:true});
 await writeFile(join(root,'jogos/bits/artistas.js'),'window.HUBA_BITS_ARTISTAS='+JSON.stringify(groups));
 let calls=0,fail=false;
 const fetcher=async url=>{
   calls++;if(fail)throw Error('Rede indisponível');
   assert.match(url,/\/artist\/\d+\/top\?limit=15$/);
   const id=Number(/\/artist\/(\d+)/.exec(url)[1]);
   const data=Array.from({length:20},(_,i)=>({id:id*100+i,title:'Faixa '+(id*100+i),artist:{id,name:'Artista '+id},preview:'https://audio.test/'+(id*100+i)}));
   // Inválida no Top 5: não deve buscar a sexta para preencher a lacuna.
   if(id===1)delete data[1].preview;
   return {ok:true,json:async()=>({data,next:'https://api.deezer.com/forbidden-next'})};
 };
 return {root,fetcher,sleep:async()=>{},calls:()=>calls,fail:()=>{fail=true}};
}
test('gera 15 por artista uma vez, mantém posições e preserva a lista do dia',async t=>{
 const f=await fixture(t),first=await generate(f);assert.equal(f.calls(),4);assert.equal(first.artists,4);
 const config=await readFile(join(f.root,'dados/bits-artistas/config.js'),'utf8');
 const body=await readFile(join(f.root,'dados/bits-artistas',first.files.rock),'utf8');
 const ctx={window:{}};vm.runInNewContext(body,ctx);
 assert.equal(ctx.window.HUBA_BITS_PAGES.rock.artists[1].length,15);
 assert.equal(ctx.window.HUBA_BITS_PAGES.rock.artists[1][1].preview,undefined);
 assert.equal(ctx.window.HUBA_BITS_PAGES.rock.artists[3],undefined);
 f.fail();const again=await generate(f);assert.equal(again.version,first.version);assert.equal(f.calls(),4);
 await assert.rejects(generate({...f,date:'2099-01-01'}),/Rede indisponível/);
 assert.equal(await readFile(join(f.root,'dados/bits-artistas/config.js'),'utf8'),config,'falha não sobrescreve a publicação válida');
});
test('navegador usa arquivos por gênero, 5/15 separados e diário consistente sem consultar artistas',{timeout:30000},async t=>{
 const f=await fixture(t),result=await generate(f);
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});t.after(()=>browser.close());
 async function open(latency=0,failRock=false){
   const context=await browser.newContext(),requests=[],api=[],errors=[];
   await context.addInitScript(()=>{window.testAudio=[];window.Audio=class extends EventTarget{constructor(){super();this.currentTime=0;testAudio.push(this)}pause(){}load(){}play(){return Promise.resolve()}removeAttribute(){}}});
   await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
   await context.route('https://api.deezer.com/**',r=>{api.push(r.request().url());return r.abort()});
   await context.route('**/jogos/bits/artistas.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.HUBA_BITS_ARTISTAS='+JSON.stringify(groups)}));
   await context.route('**/dados/bits-artistas/*.js',async r=>{
     const name=new URL(r.request().url()).pathname.split('/').pop();requests.push(name);
     await new Promise(resolve=>setTimeout(resolve,latency));
     if(failRock&&name===result.files.rock){failRock=false;return r.abort()}
     return r.fulfill({contentType:'application/javascript',body:await readFile(join(f.root,'dados/bits-artistas',name),'utf8')});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('jogos/bits/index.html')).href);
   return {context,page,requests,api,errors};
 }
 const a=await open(80);t.after(()=>a.context.close());assert.deepEqual(a.requests,['config.js']);
 const before=Date.now();await a.page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await a.page.waitForSelector('#guessInput:visible');
 const elapsed=Date.now()-before;
 assert.match(await a.page.locator('#gameCatalogCount').textContent(),/^9 músicas/);
 assert.deepEqual(a.requests,['config.js',result.files.rock]);assert.deepEqual(a.api,[]);
 // O alvo passa a ser salvo após o primeiro palpite.
 await a.page.locator('#skipGuess').click();
 const saved=await a.page.evaluate(()=>JSON.parse(localStorage.getItem('huba:bits:daily:v5:artists5:'+HUBA_BITS_CATALOGO.dayKey()+':rock')).id);
 await a.page.locator('#backGame').click();await a.page.evaluate(()=>HUBA.setMode('training'));
 await a.page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();
 await a.page.waitForFunction(()=>document.querySelector('#gameCatalogCount').textContent.includes('concluído'));
 assert.match(await a.page.locator('#gameCatalogCount').textContent(),/^29 músicas/);assert.equal(a.requests.length,2);
 await a.page.locator('#backGame').click();await a.page.evaluate(()=>HUBA.setMode('daily'));
 await a.page.locator('#dailyTiles button').filter({hasText:'Top'}).click();await a.page.waitForSelector('#guessInput:visible');
 assert.match(await a.page.locator('#gameCatalogCount').textContent(),/^19 músicas/);assert.equal(a.requests.length,4);assert.deepEqual(a.api,[]);
 const b=await open(5);t.after(()=>b.context.close());
 await b.page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await b.page.waitForSelector('#guessInput:visible');await b.page.locator('#skipGuess').click();
 assert.equal(await b.page.evaluate(()=>JSON.parse(localStorage.getItem('huba:bits:daily:v5:artists5:'+HUBA_BITS_CATALOGO.dayKey()+':rock')).id),saved);
 // Catálogo de ontem não sorteia uma lista diferente em silêncio.
 await b.page.evaluate(()=>{const Original=Date;window.Date=class extends Original{constructor(...args){super(...(args.length?args:[Original.now()+86400000]))}}});
 await b.page.locator('#backGame').click();await b.page.locator('#dailyTiles button').filter({hasText:'Pop'}).click();
 await b.page.waitForFunction(()=>document.querySelector('#loadStatus').textContent.includes('atualizado'));
 assert.equal(await b.page.locator('#bitsGame').isVisible(),false);assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
 const c=await open(20,true);t.after(()=>c.context.close());
 await c.page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();
 await c.page.waitForFunction(()=>document.querySelector('#loadStatus').textContent.includes('Não foi possível baixar'));
 assert.equal(await c.page.locator('#bitsGame').isVisible(),false);assert.deepEqual(c.api,[]);
 await c.page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await c.page.waitForSelector('#guessInput:visible');
 await c.context.route('https://api.deezer.com/track/*',r=>{const url=new URL(r.request().url());c.api.push(url.href);return r.fulfill({contentType:'application/javascript',body:url.searchParams.get('callback')+'('+JSON.stringify({preview:'https://audio.test/fresh'})+')'})});
 const originalSrc=await c.page.evaluate(()=>testAudio[0].src);
 await c.page.evaluate(()=>testAudio[0].dispatchEvent(new Event('error')));
 await c.page.waitForFunction(()=>testAudio[0].src==='https://audio.test/fresh');
 assert.ok(c.api[0].includes('/track/'+originalSrc.split('/').pop()),'recupera a mesma faixa por ID');
 assert.equal(await c.page.locator('#history').textContent(),'');assert.deepEqual(c.errors,[]);
 // Mudar de modo durante o download não abre a partida obsoleta.
 const d=await open(200);t.after(()=>d.context.close());
 await d.page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await d.page.evaluate(()=>HUBA.setMode('training'));
 await d.page.locator('#dailyTiles button').filter({hasText:'Pop'}).click();await d.page.waitForSelector('#guessInput:visible');
 assert.equal(await d.page.locator('#gameTitle').textContent(),'Bits · Pop');
 assert.match(await d.page.locator('#gameCatalogCount').textContent(),/^15 músicas/);assert.deepEqual(d.api,[]);assert.deepEqual(d.errors,[]);
 console.log('BITS PREPARADO '+JSON.stringify({rockMs:elapsed,filesForRock:1,artistRequests:a.api.length}));
});
