const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
test('cinco HUDs do Bits preservam partida, controles, idioma e escolha salva em desktop e celular',{timeout:60000},async t=>{
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1280,height:1000}});t.after(()=>context.close());
 const errors=[];
 await context.addInitScript(()=>{localStorage.setItem('huba:mode:v1','training');window.testAudio=[];window.Audio=class extends EventTarget{
   constructor(){super();this.currentTime=0;this.duration=30;this.starts=[];testAudio.push(this)}pause(){}load(){}play(){this.starts.push(this.currentTime);return Promise.resolve()}removeAttribute(){this.src=''}
 }});
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.route('**/jogos/bits/artistas.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.HUBA_BITS_ARTISTAS={rock:[{id:1,name:"Artist"}],pop:[{id:2,name:"Pop"}],rap:[{id:3,name:"Rap"}]};'}));
 await context.route('https://api.deezer.com/**',r=>{const u=new URL(r.request().url()),id=Number(/\/artist\/(\d+)/.exec(u.pathname)[1]);return r.fulfill({contentType:'application/javascript',body:u.searchParams.get('callback')+'('+JSON.stringify({data:Array.from({length:15},(_,i)=>({id:id*100+i,title:'Faixa '+i,artist:{id,name:'Artist'},preview:'https://audio.test/'+(id*100+i)}))})+');'})});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'jogos/bits/index.html')).href);
 assert.equal(await page.locator('.bits-top .bits-hud-menu').count(),1,'seletor acompanha os outros controles');
 await page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await page.waitForSelector('#guessInput:visible');
 assert.equal(await page.locator('.bits-game-head .bits-hud-menu').count(),1);
 const originalSrc=await page.evaluate(()=>testAudio[0].src),layouts={};
 const output=path.join(tmpdir(),'huba-bits-huds');await fs.mkdir(output,{recursive:true});
 async function select(hud){await page.locator('.bits-hud-menu>summary').click();await page.locator('[data-bits-hud-choice="'+hud+'"]').click();assert.equal(await page.locator('html').getAttribute('data-bits-hud'),hud)}
 for(const hud of ['focus','studio','arcade','terminal','panel']){
   await page.locator('#guessInput').fill('Faixa');await page.getByRole('option').first().click();
   const guess=await page.locator('#guessInput').inputValue();await select(hud);
   assert.equal(await page.locator('#guessInput').inputValue(),guess);assert.equal(await page.locator('#submitGuess').isEnabled(),true);
   assert.equal(await page.evaluate(()=>testAudio[0].src),originalSrc,'não sorteia nem recarrega áudio');
   assert.equal(await page.locator('#history').textContent(),'');
   await page.locator('#playAudio').click();await page.locator('#playAudio').click();assert.deepEqual(await page.evaluate(()=>testAudio[0].starts.slice(-2)),[0,0]);
   await page.locator('#volumeAudio').fill('45');assert.equal(await page.locator('#volumeLabel').textContent(),'45%');
   await page.locator('#muteAudio').click();await page.locator('#muteAudio').click();
   layouts[hud]=await page.locator('.bits-play-card').evaluate(el=>({display:getComputedStyle(el).display,width:Math.round(el.getBoundingClientRect().width),radius:getComputedStyle(el).borderTopLeftRadius}));
   await page.screenshot({path:path.join(output,hud+'-desktop.png'),fullPage:true});
   await page.setViewportSize({width:375,height:900});
   await page.locator('#guessInput').fill('Faixa');assert.ok(await page.getByRole('option').count()>0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'sem rolagem horizontal no '+hud);
   const guessBox=await page.locator('#guessArea').boundingBox(),player=await page.locator('.bits-player').boundingBox();
   assert.ok(guessBox.x>=0&&guessBox.x+guessBox.width<=376);assert.ok(player.x>=0&&player.x+player.width<=376);
   await page.locator('.bits-hud-menu>summary').click();const dropdown=await page.locator('.bits-hud-options').boundingBox();assert.ok(dropdown.x>=0&&dropdown.x+dropdown.width<=375);
   await page.keyboard.press('Escape');assert.equal(await page.locator('.bits-hud-menu').getAttribute('open'),null);
   await page.screenshot({path:path.join(output,hud+'-mobile.png'),fullPage:true});
   await page.setViewportSize({width:1280,height:1000});
 }
 assert.equal(new Set(Object.values(layouts).map(v=>JSON.stringify(v))).size,5,'layouts têm estruturas visuais diferentes');
 await page.evaluate(()=>HUBA_I18N.setLanguage('en'));await page.locator('.bits-hud-menu>summary').click();
 assert.equal(await page.locator('[data-bits-hud-choice="focus"]').textContent(),'Focus');assert.equal(await page.locator('[data-bits-hud-choice="panel"]').textContent(),'Dashboard');await page.keyboard.press('Escape');
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');await select('panel');
 await page.locator('#skipGuess').click();assert.equal(await page.locator('.bits-history-line').count(),1);
 await select('terminal');assert.equal(await page.locator('.bits-history-line').count(),1,'troca mantém as tentativas');
 await page.reload();assert.equal(await page.locator('html').getAttribute('data-bits-hud'),'terminal');
 await page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await page.waitForSelector('#guessInput:visible');
 // Confirma uma resposta de verdade depois de escolher a aparência.
 const id=await page.evaluate(()=>Number(testAudio[0].src.split('/').pop())%100);
 await page.locator('#guessInput').fill('Faixa '+id);await page.getByRole('option',{name:'Artist - Faixa '+id,exact:true}).click();await select('studio');await page.locator('#submitGuess').click();
 assert.equal(await page.locator('#finish').isVisible(),true);assert.equal(await page.locator('#guessArea').isVisible(),false);
 for(const hud of ['focus','arcade','terminal','panel','original']){await select(hud);assert.equal(await page.locator('#finish').isVisible(),true);assert.equal(await page.locator('#guessArea').isVisible(),false)}
 assert.deepEqual(errors,[]);console.log('HUD SCREENSHOTS '+output);
});
