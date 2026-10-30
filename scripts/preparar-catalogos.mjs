/* Publica uma agenda imutável: hoje e dois dias futuros já ficam disponíveis. */
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {generate as bits,dayKey} from './gerar-bits-artistas.mjs';
import {generate as playlists} from './gerar-playlists.mjs';
export function offsetDay(date,n){return new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10)}
export async function prepare({root=process.cwd(),date=dayKey(),generateBits=bits,generatePlaylists=playlists,publicURL=process.env.HUBA_SITE_URL,fetcher=fetch}={}){
 const archive=resolve(root,'.cache/publicacao');await mkdir(archive,{recursive:true});
 let saved={bits:{},playlists:{}};
 try{saved=JSON.parse(await readFile(resolve(archive,'agenda.json'),'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const definitions=[['bits','bits-artistas','HUBA_BITS_PREPARADO',generateBits],['playlists','playlists','HUBA_PLAYLISTS_PREPARADO',generatePlaylists]];
 // O cache do Actions pode ser removido. Recupere a agenda já publicada antes
 // de sortear outra lista para um dia que os jogadores já começaram.
 if(publicURL)for(const [key,folder] of definitions){
   if(Object.keys(saved[key]).length)continue;
   const response=await fetcher(new URL('dados/'+folder+'/config.js?restore='+Date.now(),publicURL),{signal:AbortSignal.timeout(20000)});
   if(response.status===404)continue; // Primeira publicação.
   if(!response.ok)throw Error('Não foi possível recuperar a agenda publicada: '+response.status);
   const text=await response.text();
   const config=JSON.parse(text.slice(text.indexOf('=')+1).trim().replace(/;$/,''));
   if(!config.enabled)continue;
   const days=config.days||{[config.date]:config},backup=resolve(archive,folder),files=new Set();
   await mkdir(backup,{recursive:true});
   for(const [day,entry] of Object.entries(days)){
     if(day<offsetDay(date,-7))continue;
     for(const file of Object.values(entry.files)){
       if(!/^[\w-]+\.js$/.test(file))throw Error('Nome de catálogo inválido');
       if(files.has(file))continue;
       const r=await fetcher(new URL('dados/'+folder+'/'+file,publicURL),{signal:AbortSignal.timeout(20000)});
       if(!r.ok)throw Error('Arquivo da agenda publicada indisponível: '+file);
       await writeFile(resolve(backup,file),await r.text());files.add(file);
     }
     saved[key][day]=entry;
   }
 }
 for(const [key,folder,globalName,generate] of definitions){
   const missing=[0,1,2].map(n=>offsetDay(date,n)).filter(d=>!saved[key][d]);
   const sourceFolder=resolve(root,'dados',folder),backup=resolve(archive,folder);
   await mkdir(sourceFolder,{recursive:true});await mkdir(backup,{recursive:true});
   if(missing.length){
     // Uma coleta serve a todos os novos dias; a semente de cada jogo usa sua data.
     await generate({root,date:missing[missing.length-1]});
     const ctx={window:{}};vm.runInNewContext(await readFile(resolve(sourceFolder,'config.js'),'utf8'),ctx);
     const config=ctx.window[globalName];
     if(!config?.enabled||!config.files||!Object.keys(config.files).length)throw Error('Catálogo preparado inválido: '+key);
     for(const file of Object.values(config.files))await copyFile(resolve(sourceFolder,file),resolve(backup,file));
     for(const day of missing)saved[key][day]={...config,date:day};
   }
   // Manifestações de sete dias anteriores permanecem publicadas para abas antigas.
   for(const day of Object.keys(saved[key]))if(day<offsetDay(date,-7))delete saved[key][day];
   for(const config of Object.values(saved[key]))for(const file of Object.values(config.files))await copyFile(resolve(backup,file),resolve(sourceFolder,file));
   const current=saved[key][date];
   await writeFile(resolve(sourceFolder,'config.js'),'window.'+globalName+'='+JSON.stringify({...current,days:saved[key]})+';\n');
 }
 await writeFile(resolve(archive,'agenda.json'),JSON.stringify(saved));
 const health={schema:1,preparedAt:new Date().toISOString(),date,readyThrough:offsetDay(date,2),bitsVersion:saved.bits[date].version,playlistsVersion:saved.playlists[date].version};
 await writeFile(resolve(root,'dados/saude.json'),JSON.stringify(health,null,2)+'\n');
 return health;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)prepare().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1});
