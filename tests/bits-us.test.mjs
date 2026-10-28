import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../scripts/gerar-bits-us.mjs';

test('bloqueia país incorreto sem publicar arquivos', async () => {
 const root=await mkdtemp(join(tmpdir(),'huba-us-'));
 await assert.rejects(generate({root,fetcher:async()=>({ok:true,json:async()=>({country_iso:'BR'})}),sleep:async()=>{}}),/esperado US/);
 await assert.rejects(readFile(join(root,'dados/bits-us/latest.json')),/ENOENT/);
});
test('gera somente metadados, verifica US e preserva catálogo diário existente', async () => {
 const root=await mkdtemp(join(tmpdir(),'huba-us-'));let calls=0;
 const fetcher=async url=>{calls++;return {ok:true,json:async()=>url.endsWith('infos')?{country_iso:'US'}:{data:Array.from({length:25},(_,i)=>({id:i+1,title:'Faixa '+i,artist:{name:'Artista'},preview:'https://audio.test/'+i}))}}};
 await generate({root,date:'2026-10-28',fetcher,sleep:async()=>{}});
 const text=await readFile(join(root,'dados/bits-us/2026-10-28.json'),'utf8');
 const data=JSON.parse(text);assert.equal(data.country,'US');assert.equal(data.genres.pop.length,25);assert.ok(!text.includes('preview'));assert.ok(!text.includes('audio.test'));
 assert.equal(await readFile(join(root,'dados/bits-us/latest.json'),'utf8'),text);
 const before=calls;assert.equal((await generate({root,date:'2026-10-28',fetcher})).preserved,true);assert.equal(calls,before);
});
test('falha durante coleta preserva o último catálogo válido',async()=>{
 const root=await mkdtemp(join(tmpdir(),'huba-us-'));let region='US';
 const fetcher=async url=>({ok:true,json:async()=>url.endsWith('infos')?{country_iso:region}:{data:Array.from({length:25},(_,i)=>({id:i+1,title:'Faixa',artist:{name:'Artista '+i},preview:'https://audio.test/'+i}))}});
 await generate({root,date:'2026-10-27',fetcher,sleep:async()=>{}});const before=await readFile(join(root,'dados/bits-us/latest.json'),'utf8');region='BR';
 await assert.rejects(generate({root,date:'2026-10-28',fetcher,sleep:async()=>{}}),/esperado US/);
 assert.equal(await readFile(join(root,'dados/bits-us/latest.json'),'utf8'),before);
});
