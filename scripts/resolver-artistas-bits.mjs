/* Ferramenta de manutenção: resolve nomes exatos; não é executada pelo jogo. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
const file=resolve('jogos/bits/artistas.js'),context={window:{}};
vm.createContext(context);vm.runInContext(await readFile(file,'utf8'),context);
const groups=context.window.HUBA_BITS_ARTISTAS,found=new Map(),missing=[],changes=[];
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
for(const artists of Object.values(groups))for(const artist of artists){
 if(artist.id&&!process.argv.includes('--refresh'))continue;
 if(found.has(norm(artist.name))){artist.id=found.get(norm(artist.name));continue}
 let data;
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch('https://api.deezer.com/search/artist?limit=100&q='+encodeURIComponent(artist.name),{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);data=await r.json();if(data.error)throw Error(data.error.message);break}catch(e){if(attempt===2)console.error(artist.name+': '+e.message);await new Promise(r=>setTimeout(r,1000*2**attempt))}
 }
 const match=data?.data?.filter(a=>norm(a.name)===norm(artist.name)).sort((a,b)=>(b.nb_fan||0)-(a.nb_fan||0))[0];
 if(match){if(artist.id!==match.id)changes.push({name:artist.name,previous:artist.id,id:match.id,fans:match.nb_fan});artist.id=match.id;found.set(norm(artist.name),match.id)}else missing.push({name:artist.name,candidates:data?.data?.slice(0,4).map(a=>({id:a.id,name:a.name}))});
 await new Promise(r=>setTimeout(r,300));
}
await writeFile(file,'/* Artistas exclusivos do Bits. IDs identificam o artista correto no Deezer. */\nwindow.HUBA_BITS_ARTISTAS = '+JSON.stringify(groups,null,2)+';\n');
console.log(JSON.stringify({counts:Object.fromEntries(Object.entries(groups).map(([g,a])=>[g,a.filter(x=>x.id).length])),missing,changes},null,2));
if(missing.length)process.exitCode=1;
