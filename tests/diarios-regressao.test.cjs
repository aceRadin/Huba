const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');

test('diários: meia-noite, reservas persistidas e retomada do Streakal',{timeout:90000},async t=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/html');res.end(await fs.readFile(path.join(root,p)))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});
 t.after(async()=>{await browser.close();await new Promise(r=>server.close(r))});
 const context=await browser.newContext({timezoneId:'Asia/Tokyo'}),base='http://127.0.0.1:'+server.address().port;
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.addInitScript(()=>{
   const NativeDate=Date;window.auditNow=new NativeDate('2026-10-29T23:59:00-03:00').getTime();
   window.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[window.auditNow]))}static now(){return window.auditNow}};
   window.Audio=class extends EventTarget{constructor(){super();this.currentTime=0;this.duration=30;this.paused=true}set src(v){this._src=v;if(v)setTimeout(()=>{this.onloadedmetadata?.();this.dispatchEvent(new Event('loadedmetadata'))},0)}get src(){return this._src||''}load(){}pause(){this.paused=true}play(){this.onplaying?.();return Promise.resolve()}removeAttribute(){this.src=''}getAttribute(){return this.src}};
 });
 await context.route('**/playlists.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.HUBA_MUSICAS={fontes:['rock: playlist:1']}"}));
 await context.route('**/artistas.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.HUBA_BITS_ARTISTAS={rock:[{id:1,name:'Artist'}],pop:[{id:1,name:'Artist'}],rap:[{id:1,name:'Artist'}]}"}));
 const tracks=Array.from({length:25},(_,i)=>({id:i+1,title:'Track '+i,artist:{id:1,name:'Artist '+i},preview:'https://audio.test/'+i}));
 await context.route('https://api.deezer.com/**',r=>{const u=new URL(r.request().url());return r.fulfill({contentType:'application/javascript',body:u.searchParams.get('callback')+'('+JSON.stringify({data:tracks,preview:'https://audio.test/fresh'})+')'})});
 const expose={musicle:'get:()=>cur,replaceFailedSong,showAudioFailure,answer,goHome,enterGenre',streakal:'get:()=>cur,answerQuestion,upgrade,goHome,enterGenre',wording:'get:()=>w,wKey,startWord',bits:'get:()=>active,showAudioFailure,replaceAudio,back,enterCategory,submit'};
 for(const [game,functions] of Object.entries(expose))await context.route('**/'+game+'.js*',async r=>{const code=await fs.readFile(path.join(root,'jogos',game,game+'.js'),'utf8'),i=code.lastIndexOf('})();');await r.fulfill({contentType:'application/javascript',body:code.slice(0,i)+'window.audit={'+functions+'};'+code.slice(i)})});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/jogos/musicle/index.html');assert.equal(await page.evaluate(()=>HUBA.dayKey()),'2026-10-29','mesmo dia em São Paulo mesmo acessando do Japão');
 await page.locator('#tilesDaily button').click();await page.waitForFunction(()=>audit.get()?.qs);
 const changed=await page.evaluate(()=>{audit.showAudioFailure();audit.replaceFailedSong();const q=audit.get().qs[0];audit.answer(q.a);return {id:audit.get().pool[q.a].id,start:q.start,opts:q.opts.map(i=>audit.get().pool[i].id)}});
 await page.reload();await page.locator('#tilesDaily button').click();await page.waitForFunction(()=>audit.get()?.qi===1);
 assert.deepEqual(await page.evaluate(()=>{const c=audit.get(),q=c.qs[0];return {id:c.pool[q.a].id,start:q.start,opts:q.opts.map(i=>c.pool[i].id)}}),changed);
 assert.equal(await page.evaluate(()=>audit.get().picks[0]===audit.get().qs[0].a),true);
 await page.evaluate(()=>{auditNow+=120000;audit.answer(audit.get().qs[1].a)});
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('musicle4:2026-10-30'))),false);

 await page.goto(base+'/jogos/streakal/index.html');await page.locator('#tilesDaily button').click();await page.waitForFunction(()=>audit.get()?.options.length);
 await page.evaluate(()=>{audit.answerQuestion(audit.get().answer);audit.upgrade('shorter');audit.answerQuestion(audit.get().answer)});
 const run=await page.evaluate(()=>{const c=audit.get();return {score:c.score,clip:c.clip,round:c.round,consecutive:c.consecutiveShorter,answer:c.answer,options:c.options,random:c.rng.getState()}});
 await page.reload();await page.locator('#tilesDaily button').click();await page.waitForSelector('#upgradePanel:visible');
 assert.deepEqual(await page.evaluate(()=>{const c=audit.get();return {score:c.score,clip:c.clip,round:c.round,consecutive:c.consecutiveShorter,answer:c.answer,options:c.options,random:c.rng.getState()}}),run);
 await page.evaluate(()=>audit.upgrade('extra'));assert.equal(await page.evaluate(()=>audit.get().consecutiveShorter),0);
 const expectedNext=await page.evaluate(()=>{const c=audit.get();return {answer:c.answer,options:c.options,round:c.round}});
 await page.reload();await page.locator('#tilesDaily button').click();await page.waitForFunction(()=>audit.get()?.options.length);
 assert.deepEqual(await page.evaluate(()=>{const c=audit.get();return {answer:c.answer,options:c.options,round:c.round}}),expectedNext);
 await page.evaluate(()=>{auditNow+=120000;audit.answerQuestion(audit.get().options.find(i=>i!==audit.get().answer))});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('huba:streakal:daily:2026-10-29:rock')).done),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('huba:streakal:daily:2026-10-30:rock')),null);

 await page.goto(base+'/jogos/bits/index.html');await page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await page.waitForSelector('#guessInput:visible');
 const reserve=await page.evaluate(()=>{audit.showAudioFailure();audit.replaceAudio();return audit.get().song.id});
 await page.reload();await page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await page.waitForSelector('#guessInput:visible');
 assert.equal(await page.evaluate(()=>audit.get().song.id),reserve);
 await page.evaluate(()=>{auditNow+=120000;audit.submit(true)});
 assert.equal(await page.evaluate(()=>localStorage.getItem('huba:bits:daily:v5:artists5:2026-10-30:rock')),null);
 // Uma nova sessão limpa reproduz a mesma primeira reserva.
 await page.evaluate(()=>localStorage.removeItem('huba:bits:daily:v5:artists5:2026-10-29:rock'));
 await page.reload();await page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await page.waitForSelector('#guessInput:visible');
 assert.equal(await page.evaluate(()=>{audit.showAudioFailure();audit.replaceAudio();return audit.get().song.id}),reserve);

 await page.goto(base+'/jogos/wording/index.html');await page.locator('#wTilesDaily button').first().click();
 await page.evaluate(()=>{const target=audit.get().targets[0].n;auditNow+=120000;for(const c of target)audit.wKey(c);audit.wKey('enter')});
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('word2:2026-10-30'))),false);
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('word2:2026-10-29'))),true);
 assert.deepEqual(errors,[]);
});
