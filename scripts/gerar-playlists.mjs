/* Reutiliza o carregador dos jogos para preservar paginação, filtros e ordem. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {dayKey} from './gerar-bits-artistas.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const codeRoot=fileURLToPath(new URL('..',import.meta.url));
export async function generate({root=process.cwd(),date=dayKey(),fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Data inválida');
 const code=await readFile(resolve(codeRoot,'js/deezer.js'),'utf8');
 const context={URL,AbortController,Map,Set,console,window:{},HUBA:{norm:s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}};
 vm.createContext(context);vm.runInContext(await readFile(resolve(root,'playlists.js'),'utf8'),context);
 const sources=context.window.HUBA_MUSICAS?.fontes;
 if(!Array.isArray(sources)||!sources.length)throw Error('Nenhuma fonte configurada em playlists.js');
 vm.runInContext(code,context);
 const configHash=hash({sources,code,artistLimit:8}),cache=resolve(root,'.cache/playlists'),folder=resolve(root,'dados/playlists');
 let catalog;
 try{
   const saved=JSON.parse(await readFile(resolve(cache,'snapshot.json'),'utf8'));
   if(saved.schema===1&&saved.date===date&&saved.configHash===configHash)catalog=saved;
 }catch(e){if(e.code!=='ENOENT')throw e}
 if(!catalog){
   const pages=new Map();
   async function pageProvider(url){
     const parsed=new URL(url);
     if(parsed.hostname!=='api.deezer.com'||parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port)throw Error('Página do Deezer não autorizada');
     if(pages.has(url))return pages.get(url);
     for(let attempt=0;;attempt++){
       await sleep(attempt?2000*2**(attempt-1):300);
       try{
         const response=await fetcher(url,{signal:AbortSignal.timeout(20000)});
         if(!response.ok)throw Error('HTTP '+response.status);
         const data=await response.json();
         if(data.error||!Array.isArray(data.data))throw Error(data.error?.message||'Resposta de músicas inválida');
         pages.set(url,data);return data;
       }catch(e){if(attempt>=3)throw e}
     }
   }
   const loader=context.window.HUBADeezer.create({sources,artistLimit:8,pageProvider});
   const genres={};
   if(!loader.genres().length)throw Error('Nenhum gênero configurado');
   for(const genre of loader.genres()){
     const state=await loader.select(genre,1,true);
     if(!state.complete||!state.songs.length)throw Error('Catálogo vazio ou incompleto: '+genre);
     genres[genre]=state.songs.map(s=>({id:s.id,title:s.title,artist:{name:s.artist},preview:s.url,album:{cover_medium:s.cover}}));
   }
   catalog={schema:1,date,configHash,generatedAt:new Date().toISOString(),genres};
 }
 const version=hash(catalog).slice(0,20),files={},counts={};
 await mkdir(folder,{recursive:true});
 for(const [genre,tracks] of Object.entries(catalog.genres)){
   files[genre]=hash(genre).slice(0,12)+'-'+version+'.js';counts[genre]=tracks.length;
   await writeFile(resolve(folder,files[genre]),'window.HUBA_PLAYLISTS_PAGES=window.HUBA_PLAYLISTS_PAGES||{};window.HUBA_PLAYLISTS_PAGES['+JSON.stringify(genre)+']='+JSON.stringify({version,tracks})+';\n');
 }
 await writeFile(resolve(folder,'config.js'),'window.HUBA_PLAYLISTS_PREPARADO='+JSON.stringify({enabled:true,schema:1,date,version,files})+';\n');
 await mkdir(cache,{recursive:true});await writeFile(resolve(cache,'snapshot.json'),JSON.stringify(catalog));
 return {date,version,counts,files};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 generate({date:process.env.HUBA_PLAYLISTS_DATE||dayKey()}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1});
}
