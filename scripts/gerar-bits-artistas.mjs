/* Executado no Actions. Nenhuma chave ou backend é necessário no navegador. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

export const dayKey=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function generate({root=process.cwd(),date=dayKey(),fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Data inválida');
 const context={window:{}};vm.createContext(context);
 vm.runInContext(await readFile(resolve(root,'jogos/bits/artistas.js'),'utf8'),context);
 const groups=context.window.HUBA_BITS_ARTISTAS,genres=['rock','pop','rap'];
 if(!groups||genres.some(g=>!Array.isArray(groups[g])||!groups[g].length||groups[g].some(a=>!Number.isSafeInteger(a.id)||a.id<=0)))throw Error('Configuração de artistas inválida');
 const configHash=hash(groups),cache=resolve(root,'.cache/bits-artistas'),folder=resolve(root,'dados/bits-artistas');
 let catalog;
 try{
   const saved=JSON.parse(await readFile(resolve(cache,'snapshot.json'),'utf8'));
   if(saved.schema===1&&saved.date===date&&saved.configHash===configHash)catalog=saved;
 }catch(e){if(e.code!=='ENOENT')throw e}
 if(!catalog){
   const artists={};
   for(const artist of Object.values(groups).flat()){
     if(artists[artist.id])continue;
     let response;
     for(let attempt=0;;attempt++){
       await sleep(attempt?2000*2**(attempt-1):300);
       try{
         const r=await fetcher('https://api.deezer.com/artist/'+artist.id+'/top?limit=15',{signal:AbortSignal.timeout(20000)});
         if(!r.ok)throw Error('HTTP '+r.status);
         response=await r.json();
         if(response.error||!Array.isArray(response.data))throw Error(response.error?.message||'Resposta inválida');
         break;
       }catch(e){if(attempt>=3)throw Error(artist.name+': '+e.message)}
     }
     // Mantém a posição original do ranking, inclusive entradas inválidas, para
     // que o Diário filtre somente o Top 5 e não complete com faixas posteriores.
     artists[artist.id]=response.data.slice(0,15).map(t=>t&&({id:t.id,title:t.title,artist:t.artist&&{id:t.artist.id,name:t.artist.name},preview:t.preview,album:{cover_medium:t.album?.cover_medium}}));
   }
   catalog={schema:1,date,configHash,generatedAt:new Date().toISOString(),artists};
 }
 for(const genre of genres){
   const valid=groups[genre].some(a=>catalog.artists[a.id]?.slice(0,5).some(t=>t?.id&&t.title&&t.artist?.id===a.id&&t.artist.name&&/^https:\/\/[^\s]+$/i.test(t.preview||'')));
   if(!valid)throw Error(genre+': nenhuma faixa válida no Top 5; publicação interrompida');
 }
 // Um arquivo por gênero: abrir Rock não baixa as listas de Pop e Rap.
 const version=hash(catalog).slice(0,20),files={};
 await mkdir(folder,{recursive:true});
 for(const genre of genres){
   files[genre]=genre+'-'+version+'.js';
   const artists=Object.fromEntries(groups[genre].map(a=>[a.id,catalog.artists[a.id]]));
   await writeFile(resolve(folder,files[genre]),'window.HUBA_BITS_PAGES=window.HUBA_BITS_PAGES||{};window.HUBA_BITS_PAGES['+JSON.stringify(genre)+']='+JSON.stringify({version,artists})+';\n');
 }
 await writeFile(resolve(folder,'config.js'),'window.HUBA_BITS_PREPARADO='+JSON.stringify({enabled:true,schema:1,date,version,files,groups})+';\n');
 await mkdir(cache,{recursive:true});
 await writeFile(resolve(cache,'snapshot.json'),JSON.stringify(catalog));
 return {date,version,artists:Object.keys(catalog.artists).length,files};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 generate({date:process.env.HUBA_BITS_DATE||dayKey()}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1});
}
