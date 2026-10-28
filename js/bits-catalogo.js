/* Catálogo estático americano. Nunca consulta rankings no navegador. */
(function(){
'use strict';
function dayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function create(options){
 var cache={},states={},generation=0;
 function state(g){return states[g]||(states[g]={genre:g,songs:[],complete:false,running:false,error:null})}
 function select(g,min,daily){
  var token=++generation,s=state(g),date=dayKey(),file=daily?date:'latest';s.running=true;s.error=null;options.onUpdate(s);
  if(!cache[file])cache[file]=fetch('../../dados/bits-us/'+file+'.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw Error(daily?'O catálogo americano de hoje ainda não foi publicado. Tente mais tarde.':'O catálogo americano ainda não foi publicado.');return r.json()}).then(function(data){
   if(data.schema!==1||data.country!=='US'||!data.genres||(daily&&data.date!==date))throw Error('Catálogo americano inválido');
   ['pop','rock','rap'].forEach(function(k){if(!Array.isArray(data.genres[k])||!data.genres[k].length)throw Error('Catálogo incompleto')});return data;
  }).catch(function(e){delete cache[file];throw e});
  return cache[file].then(function(data){
   if(token!==generation){var e=Error('Cancelado');e.name='AbortError';throw e}
   var seen=new Set(),songs=[];
   (g==='top'?['pop','rock','rap']:[g]).forEach(function(k){data.genres[k].forEach(function(t){
    if(!t.id||typeof t.title!=='string'||typeof t.artist!=='string')throw Error('Faixa inválida');
    var title=t.title.replace(/\s*[\(\[][^\)\]]*[\)\]]/g,'').trim()||t.title,label=t.artist+' - '+title,key=HUBA.norm(label);
    if(seen.has('id:'+t.id)||seen.has(key))return;seen.add('id:'+t.id);seen.add(key);
    songs.push({id:String(t.id),title:title,artist:t.artist,label:label,genre:g,url:null});
   })});
   s.songs=songs;s.complete=true;s.running=false;s.date=data.date;options.onUpdate(s);return s;
  }).catch(function(e){if(token===generation){s.running=false;s.error=e;options.onUpdate(s)}throw e});
 }
 return {select:select,state:state,pause:function(){generation++},genres:function(){return ['top','pop','rock','rap']},paint:function(el,s){el.textContent=s.songs.length+' músicas · catálogo EUA'+(s.date?' '+s.date:'')+(s.error?' · indisponível':s.running?' · carregando…':s.complete?' · concluído':'')}};
}
window.HUBA_BITS_CATALOGO={create:create,dayKey:dayKey};
})();
