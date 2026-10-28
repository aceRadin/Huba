const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const vm=require('node:vm');
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');

test('streak geral, migração do Musical e dias consecutivos',async()=>{
 const values=new Map(),clock={time:new Date(2026,9,28,12).getTime()};
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock.time]))}}
 const context={window:{},Date:ClockDate,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},document:{documentElement:{removeAttribute(){},setAttribute(){}},readyState:'loading',addEventListener(){},dispatchEvent(){}},Event:class{}};
 values.set('playhub:musicle:streak:v1',JSON.stringify({last:'2026-10-28',count:2,best:3}));
 values.set('playhub:musicle-hard:streak:v1',JSON.stringify({last:'2026-10-28',count:5,best:7}));
 vm.createContext(context);vm.runInContext(await fs.readFile(path.join(root,'js/comum.js'),'utf8'),context);
 const h=context.window.HUBA;
 assert.equal(h.currentStreak('musicle'),5);h.recordPlayedGame('word');h.recordPlayedGame('bits');h.recordPlayedGame('musicle');assert.equal(h.currentStreak('huba'),1);assert.equal(h.currentStreak('musicle'),5);
 clock.time+=86400000;h.recordPlayedGame('musicle');assert.equal(h.currentStreak('huba'),2);assert.equal(h.currentStreak('musicle'),6);
 clock.time+=86400000*2;h.recordPlayedGame('streakal');assert.equal(h.currentStreak('huba'),1);
});

test('PT/EN em todas as telas, sem reiniciar partidas e streak por derrota',{timeout:90000},async t=>{
 const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;const file=path.join(root,name.endsWith('/')?name+'index.html':name);res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8','json':'application/json'})[file.split('.').pop()]||'application/octet-stream');res.end(await fs.readFile(file))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});
 t.after(async()=>{await browser.close();await new Promise(r=>server.close(r))});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.route('**/playlists.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.HUBA_MUSICAS={fontes:['rock: playlist:1']};"}));
 await context.addInitScript(()=>{window.testAudio=[];window.Audio=class extends EventTarget{constructor(){super();this.currentTime=0;this.duration=30;this.paused=true;this.starts=[];window.testAudio.push(this)}set src(v){this._src=v;if(v)setTimeout(()=>{this.onloadedmetadata?.();this.dispatchEvent(new Event('loadedmetadata'))},0)}get src(){return this._src||''}load(){}pause(){this.paused=true}play(){this.paused=false;this.starts.push(this.currentTime);this.onplaying?.();return Promise.resolve()}removeAttribute(){this.src=''}getAttribute(){return this.src}}});
 const tracks=Array.from({length:25},(_,i)=>({id:i+1,title:i===0?'Rosa':'Faixa '+(i+1),artist:{name:'Artista '+(i+1)},preview:'https://audio.test/'+(i+1)}));
 await context.route('https://api.deezer.com/**',r=>{const url=new URL(r.request().url());const id=/\/track\/(\d+)/.exec(url.pathname)?.[1];return r.fulfill({contentType:'application/javascript',body:url.searchParams.get('callback')+'('+JSON.stringify(id?tracks[Number(id)-1]:{data:tracks})+');'})});
 await context.route('**/dados/bits-us/*.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({schema:1,country:'US',date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),genres:Object.fromEntries(['pop','rock','rap'].map(g=>[g,tracks.map(s=>({id:s.id,title:s.title,artist:s.artist.name}))]))})}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function language(value){await page.locator('[data-site-lang="'+value+'"]').click();await page.waitForFunction(v=>document.documentElement.lang===(v==='en'?'en':'pt-BR'),value)}
 async function audit(){return page.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode()){const el=n.parentElement;if(!el||!el.getClientRects().length||el.closest('script,style,.huba-language,#wLang,.w-tile,.musical-option-title,.musical-option-artist,.bits-choice,.bits-history-line,#finishSong'))continue;const text=n.nodeValue.trim();if(/[ãçõ]|Diário|Aleatório|tentativas|Carregando|Próxima/.test(text))out.push(text)}return out})}
 await page.goto(base);await language('en');assert.equal(await page.locator('#globalStreak').textContent(),'0');
 assert.equal(await page.locator('.landing-top .huba-language').count(),1);
 await page.setViewportSize({width:1280,height:900});
 const centers=await page.locator('.landing-top').evaluate(header=>Array.from(header.children).map(el=>{const r=el.getBoundingClientRect();return r.y+r.height/2}));
 assert.ok(Math.max(...centers)-Math.min(...centers)<2,'nome, streak e idioma alinhados no computador');
 for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 assert.equal(await page.locator('.gcard').filter({hasText:'Musical'}).locator('.gstreak').count(),1);
 assert.equal(await page.locator('.gcard').filter({hasText:'Streakal'}).locator('small').count(),1);
 for(const game of ['bits','musicle','streakal','wording']){
  await page.goto(base+'/jogos/'+game+'/');assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('h2').filter({hasText:/^Daily$/}).count(),1);
  await language('pt');assert.equal(await page.locator('h2').filter({hasText:/^Diário$/}).count(),1);await language('en');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(await audit(),[],game+': texto não traduzido');
 }
 // Wording: físico e virtual, espaço e troca de idioma não apagam a linha.
 await page.locator('#wLang [data-lang="en"]').click();await page.locator('#wTilesRandom button').first().click();
 await page.locator('#wTitle').click();await page.keyboard.type('ab');await page.keyboard.press('Space');
 const input=await page.locator('#wBoards .w-row').first().textContent();await language('pt');await language('en');assert.equal(await page.locator('#wBoards .w-row').first().textContent(),input);
 assert.deepEqual(await audit(),[],'Wording: instruções em inglês');
 await page.locator('#wTitle').click();for(let i=0;i<8;i++)await page.keyboard.press('Backspace');
 const words=JSON.parse(await fs.readFile(path.join(root,'dados/words.json'),'utf8'));const word=Array.isArray(words)?words[0]:words.en.words[0];
 for(let i=0;i<6&&!(await page.locator('#wResult').isVisible());i++){await page.keyboard.type(word);await page.keyboard.press('Enter')}
 assert.equal(await page.locator('#wResult').isVisible(),true);assert.equal(await page.evaluate(()=>HUBA.currentStreak('huba')),1);
 assert.deepEqual(await audit(),[],'Wording: resultado em inglês');
 await page.goto(base+'/jogos/bits/');await page.locator('#randomTiles button').filter({hasText:'Pop'}).click();await page.waitForSelector('#guessInput:visible');
 for(let i=0;i<6;i++)await page.locator('#skipGuess').click();assert.equal(await page.locator('#finishTitle').textContent(),'No guesses left');assert.equal(await page.evaluate(()=>HUBA.currentStreak('huba')),1);
 assert.deepEqual(await audit(),[],'Bits: resultado em inglês');
 await page.goto(base+'/jogos/streakal/');await page.locator('#tilesRandom button').first().click();await page.waitForFunction(()=>testAudio[0].src);
 const id=await page.evaluate(()=>/\/(\d+)$/.exec(testAudio[0].src)[1]);await page.locator('#opts button').filter({hasNot:page.locator('[unused]')}).evaluateAll((buttons,id)=>buttons.find(b=>!b.getAttribute('aria-label').startsWith('Artista '+id+' - ')).click(),id);
 await page.waitForSelector('#result:visible');assert.equal(await page.evaluate(()=>HUBA.currentStreak('huba')),1);
 for(const mode of ['#clipHard','#clipCasual']){
  await page.goto(base+'/jogos/musicle/');await page.locator(mode).click();await page.locator('#tilesRandom button').first().click();await page.waitForSelector('#opts button');
  await page.locator('#playBtn').click();await page.locator('#playBtn').click();assert.equal(await page.locator('#playBtn').textContent(),'Play clip');
  for(let i=0;i<5;i++){await page.locator('#opts button').first().click();await page.locator('#nextBtn').click()}
  assert.equal(await page.evaluate(()=>HUBA.currentStreak('musicle')),1);assert.equal(await page.evaluate(()=>HUBA.currentStreak('huba')),1);
  assert.deepEqual(await audit(),[],'Musical: resultado em inglês');
 }
 await page.goto(base);assert.equal(await page.locator('#globalStreak').textContent(),'1');assert.equal(await page.locator('.gcard').filter({hasText:'Musical'}).locator('.gstreak strong').textContent(),'1');
 assert.equal(await page.locator('.huba-support-coffee').getAttribute('href'),'https://buymeacoffee.com/aceradin');
 assert.deepEqual(errors,[]);
});
