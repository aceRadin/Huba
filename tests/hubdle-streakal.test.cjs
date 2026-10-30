const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
test('Hubdle em PT/EN mantém dados antigos; Streakal limita a dez e só reseta debuff com escolha voluntária',{timeout:30000},async t=>{
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});t.after(()=>browser.close());
 const context=await browser.newContext();t.after(()=>context.close());
 await context.addInitScript(()=>{
   localStorage.setItem('huba:mode:v1','training');
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   localStorage.setItem('playhub:huba:streak:v1',JSON.stringify({count:7,last:today}));
   localStorage.setItem('huba:streakal:records:v1',JSON.stringify({rock:50}));
   Math.random=()=>0;
   window.testAudio=[];window.Audio=class extends EventTarget{
     constructor(){super();this.currentTime=0;this.duration=30;this.src='';testAudio.push(this)}
     load(){setTimeout(()=>{this.onloadedmetadata?.();this.dispatchEvent(new Event('loadedmetadata'))},0)}pause(){}play(){return Promise.resolve()}removeAttribute(){this.src=''}getAttribute(n){return n==='src'?this.src:null}
   };
 });
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.route('**/playlists.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.HUBA_MUSICAS={fontes:["rock: playlist:1"]};'}));
 await context.route('https://api.deezer.com/**',r=>{
   const u=new URL(r.request().url()),id=/\/track\/(\d+)/.exec(u.pathname)?.[1];
   const song=id=>({id,title:'Song '+id,artist:{id:1,name:'Artist'},preview:'https://audio.test/'+id});
   return r.fulfill({contentType:'application/javascript',body:u.searchParams.get('callback')+'('+JSON.stringify(id?song(Number(id)):{data:Array.from({length:30},(_,i)=>song(i+1))})+');'});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const file of ['index.html','jogos/bits/index.html','jogos/musicle/index.html','jogos/wording/index.html','jogos/streakal/index.html']){
   await page.goto(pathToFileURL(path.join(root,file)).href);
   assert.ok((await page.title()).startsWith('Hubdle'));
   for(const lang of ['pt','en']){
     await page.evaluate(lang=>HUBA_I18N.setLanguage(lang),lang);
     assert.ok(!/\bHUBA\b/.test(await page.locator('body').innerText()),'marca antiga não aparece em '+file+' '+lang);
     assert.equal(await page.locator('.huba-support-coffee').getAttribute('href'),'https://buymeacoffee.com/aceradin');
   }
   if(file==='index.html')assert.equal(await page.locator('#globalStreak').textContent(),'7');
 }
 await page.evaluate(()=>HUBA_I18N.setLanguage('pt'));
 assert.match(await page.locator('#tilesDaily').textContent(),/Recorde: 50/);
 await page.locator('#tilesDaily button').first().click();await page.waitForSelector('#opts button');
 async function correct(){
   await page.waitForFunction(()=>/^https:\/\/audio.test\/\d+$/.test(testAudio[0].src));
   const id=await page.evaluate(()=>testAudio[0].src.split('/').pop());
   await page.locator('#opts button[aria-label="Artist - Song '+id+'"]').click();
 }
 for(let n=1;n<=3;n++){
   await correct();assert.equal(await page.locator('#upgradePanel').isVisible(),true);await page.locator('#shorterClip').click();
 }
 assert.equal(await page.locator('#opts button').count(),3,'terceira redução sorteia opção automática');
 assert.match(await page.locator('#qhint').textContent(),/Punição ativada! Chance de 9%/);
 await correct();
 const afterPenalty=await page.locator('#shorterClip').textContent();
 assert.match(afterPenalty,/11,25% menor/,'redução continua acumulada após a penalidade');assert.match(afterPenalty,/12% de chance/,'risco continua para a quarta redução');
 await page.locator('#shorterClip').click();assert.equal(await page.locator('#opts button').count(),4);
 await correct();await page.locator('#extraOption').click();assert.equal(await page.locator('#opts button').count(),5);
 await correct();
 const reset=await page.locator('#shorterClip').textContent();assert.match(reset,/Trecho 5% menor/);assert.doesNotMatch(reset,/chance/,'escolha voluntária reinicia o debuff');
 for(let count=6;count<=10;count++){
   await page.locator('#extraOption').click();assert.equal(await page.locator('#opts button').count(),count);await correct();
 }
 assert.equal(await page.locator('#upgradePanel').isVisible(),false);assert.match(await page.locator('#limitStatus').textContent(),/Máximo de 10 alternativas/);
 for(let n=0;n<12;n++){assert.equal(await page.locator('#opts button').count(),10);await correct()}
 await page.evaluate(()=>HUBA_I18N.setLanguage('en'));assert.match(await page.locator('#limitStatus').textContent(),/Maximum of 10 choices/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('huba:streakal:records:v1')).rock),50,'recorde anterior continua salvo');
 assert.deepEqual(errors,[]);
});
