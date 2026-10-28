const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const vm=require('node:vm');
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
test('cópia local contém exatamente as mesmas listas dos JSON',async()=>{
 const context={window:{}};vm.createContext(context);vm.runInContext(await fs.readFile(path.join(root,'dados/wording-listas.js'),'utf8'),context);
 for(const name of ['palavra.json','words.json'])assert.equal(JSON.stringify(context.window.HUBA_WORD_LISTS[name]),JSON.stringify(JSON.parse(await fs.readFile(path.join(root,'dados',name),'utf8'))));
});
test('Wording funciona abrindo index.html diretamente, sem fetch nem upload',async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});
 try{
  const page=await browser.newPage(),errors=[],jsonRequests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\.json(?:\?|$)/.test(r.url()))jsonRequests.push(r.url())});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.goto(pathToFileURL(path.join(root,'jogos/wording/index.html')).href);
  await page.waitForFunction(()=>document.querySelectorAll('#wTilesDaily button').length===3&&!document.querySelector('#wTilesDaily button').disabled);
  assert.equal(await page.locator('#wLoadJson,#wResetJson,input[type=file]').count(),0);
  for(const lang of ['pt','en']){
   await page.locator('.huba-locale>summary').click();
   await page.locator('[data-site-lang="'+lang+'"]').click();
   for(let i=0;i<3;i++){
    await page.locator('#wTilesDaily button').nth(i).click();assert.equal(await page.locator('.w-board').count(),[1,2,4][i]);
    await page.locator('#wTitle').click();await page.keyboard.type('ab');await page.keyboard.press('Space');await page.keyboard.press('Backspace');
    await page.locator('#wBack').click();
   }
  }
  await page.evaluate(()=>HUBA.setMode('training'));await page.locator('#wTilesDaily button').first().click();
  const words=JSON.parse(await fs.readFile(path.join(root,'dados/words.json'),'utf8'));const word=Array.isArray(words)?words[0]:words.en.words[0];
  await page.locator('#wTitle').click();for(let i=0;i<6&&!(await page.locator('#wResult').isVisible());i++){await page.keyboard.type(word);await page.keyboard.press('Enter')}
  assert.equal(await page.locator('#wResult').isVisible(),true);assert.equal(await page.locator('#wSrc').textContent(),'');assert.deepEqual(jsonRequests,[]);assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
