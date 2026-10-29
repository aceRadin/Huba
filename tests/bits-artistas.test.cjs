const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HUBA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
async function artists(){const context={window:{}};vm.createContext(context);vm.runInContext(await fs.readFile(path.join(root,'jogos/bits/artistas.js'),'utf8'),context);return context.window.HUBA_BITS_ARTISTAS}
test('lista completa e IDs dos artistas conhecidos, sem homônimos',async()=>{
 const groups=await artists();assert.equal(groups.rock.length,36);assert.equal(groups.pop.length,50);assert.equal(groups.rap.length,40);
 for(const list of Object.values(groups)){assert.ok(list.every(a=>Number.isSafeInteger(a.id)&&a.id>0&&a.name));assert.equal(new Set(list.map(a=>a.id)).size,list.length)}
 const all=Object.values(groups).flat();assert.equal(new Set(all.map(a=>a.id)).size,125);
 for(const [name,id] of [['Ghost',8506054],['Europe',1903],['Survivor',39],['ROSÉ',126335112],['Queen',412],['BTS',6982223],['JID',8409650]])assert.equal(all.find(a=>a.name===name).id,id);
 assert.equal(groups.pop.find(a=>a.name==='Doja Cat').id,groups.rap.find(a=>a.name==='Doja Cat').id);
});
test('Bits por artistas funciona via file://, limita a quinze e não busca catálogo americano',{timeout:20000},async()=>{
 const groups=await artists(),rock=new Set(groups.rock.map(a=>String(a.id)));
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});
 try{
  const context=await browser.newContext();
  await context.addInitScript(()=>{localStorage.setItem('huba:mode:v1','training');window.testAudio=[];window.Audio=class extends EventTarget{constructor(){super();this.currentTime=0;this.duration=30;testAudio.push(this)}pause(){}load(){this.onloadedmetadata?.();this.dispatchEvent(new Event('loadedmetadata'))}play(){return Promise.resolve()}removeAttribute(){this.src=''}}});
  await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  const requests=[],errors=[];
  await context.route('https://api.deezer.com/**',r=>{const u=new URL(r.request().url());requests.push(u.href);const artist=/\/artist\/(\d+)\/top/.exec(u.pathname)?.[1];assert.ok(artist,'consulta direta ao Top do artista');assert.equal(u.searchParams.get('limit'),'15');const data=Array.from({length:20},(_,i)=>({id:Number(artist)*100+i,title:'Faixa '+(Number(artist)*100+i),artist:{id:i===1?0:Number(artist),name:i===1?'Unlisted Artist':'Artist '+artist},preview:'https://audio.test/'+(Number(artist)*100+i)}));return r.fulfill({contentType:'application/javascript',body:u.searchParams.get('callback')+'('+JSON.stringify({data,next:'https://api.deezer.com/artist/'+artist+'/top?index=15&limit=15'})+');'})});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const files=[];page.on('request',r=>{if(r.url().includes('/bits-us/')||r.url().includes('/chart/'))files.push(r.url())});
  await page.goto(pathToFileURL(path.join(root,'jogos/bits/index.html')).href);assert.equal(requests.length,0);
  await page.locator('#dailyTiles button').filter({hasText:'Rock'}).click();await page.waitForSelector('#guessInput:visible');
  assert.ok(requests.every(u=>rock.has(/\/artist\/(\d+)/.exec(u)[1])));
  const id=await page.evaluate(()=>Number(testAudio[0].src.split('/').pop()));
  await page.locator('#guessInput').fill('Unlisted Artist');assert.equal(await page.locator('#suggestions button').count(),0,'não inclui artista fora da lista');
  await page.locator('#guessInput').fill('Faixa '+id);await page.getByRole('option',{name:'Artist '+Math.floor(id/100)+' - Faixa '+id,exact:true}).click();await page.locator('#submitGuess').click();
  assert.equal(await page.locator('#finish').isVisible(),true);
  assert.equal(requests.filter(u=>u.includes('index=15')).length,0,'não percorre páginas para além do Top 15');
  assert.deepEqual(files,[]);assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});

test('Diário usa cinco, Treino quinze e cache diário sobrevive ao reload sem misturar modos',{timeout:20000},async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.HUBA_CHROME?{executablePath:process.env.HUBA_CHROME}:{})});
 try{
  const context=await browser.newContext(),requests=[];
  await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  await context.route('https://api.deezer.com/**',async r=>{
   const url=new URL(r.request().url()),id=Number(/\/artist\/(\d+)\/top/.exec(url.pathname)[1]),limit=Number(url.searchParams.get('limit'));requests.push({id,limit});
   await new Promise(resolve=>setTimeout(resolve,80));
   const data=Array.from({length:20},(_,i)=>({id:id*100+i,title:'Faixa '+(id*100+i),artist:{id,name:'Artist '+id},preview:'https://audio.test/'+(id*100+i)}));
   await r.fulfill({contentType:'application/javascript',body:url.searchParams.get('callback')+'('+JSON.stringify({data})+');'});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function setup(){await page.evaluate(()=>{window.HUBA_BITS_ARTISTAS={rock:[{id:1,name:'A'},{id:2,name:'B'}],pop:[{id:3,name:'C'}],rap:[{id:4,name:'D'}]};window.profileTest=HUBA_BITS_CATALOGO.create({onUpdate(){}})})}
  await page.goto(pathToFileURL(path.join(root,'jogos/bits/index.html')).href);await setup();
  const cold=await page.evaluate(async()=>{const t=performance.now(),s=await profileTest.select('rock',1,true);return {ms:Math.round(performance.now()-t),count:s.songs.length}});
  assert.equal(cold.count,10);assert.equal(requests.length,2);assert.ok(requests.every(r=>r.limit===5));
  await page.evaluate(async()=>{profileTest.pause();await profileTest.select('rock',31,false)});
  assert.equal(requests.length,4);assert.ok(requests.slice(2).every(r=>r.limit===15));assert.equal(await page.evaluate(()=>profileTest.state('rock').songs.length),30);
  await page.reload();await setup();
  const warm=await page.evaluate(async()=>{const t=performance.now(),s=await profileTest.select('rock',1,true);return {ms:Math.round(performance.now()-t),count:s.songs.length}});
  assert.equal(warm.count,10);assert.equal(requests.length,4,'recarregar não repete os pedidos do diário nem aproveita as 15 do treino');
  await page.evaluate(async()=>{sessionStorage.setItem('unrelated','keep');const Original=Date;window.Date=class extends Original{constructor(...args){super(...(args.length?args:[Original.now()+86400000]))}};await profileTest.select('rock',1,true)});
  assert.equal(requests.length,6,'novo dia consulta novamente as cinco melhores');assert.equal(await page.evaluate(()=>sessionStorage.getItem('unrelated')),'keep');
  console.log('CACHE DIÁRIO '+JSON.stringify({cold,warm,reloadRequests:0}));assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
