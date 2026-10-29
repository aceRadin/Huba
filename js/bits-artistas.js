/* Catálogo por artista: arquivos preparados no Pages, Deezer direto no código local. */
(function(){
'use strict';
var prepared=window.HUBA_BITS_PREPARADO||{enabled:false};
var base=new URL('../dados/bits-artistas/',document.currentScript.src),downloads={};
window.HUBA_BITS_PAGES=window.HUBA_BITS_PAGES||{};
function loadGenre(genre){
 if(!downloads[genre])downloads[genre]=new Promise(function(resolve,reject){
   var script=document.createElement('script'),timer=setTimeout(function(){finish(Error('O catálogo demorou para carregar. Tente novamente.'))},15000);
   function finish(error){clearTimeout(timer);script.remove();if(error){delete downloads[genre];reject(error)}else resolve()}
   script.onload=function(){var page=window.HUBA_BITS_PAGES[genre];finish(page&&page.version===prepared.version?null:Error('Catálogo inválido. Atualize a página.'))};
   script.onerror=function(){finish(Error('Não foi possível baixar o catálogo. Tente novamente.'))};
   script.src=new URL(prepared.files[genre],base).href;document.head.appendChild(script);
 });
 return downloads[genre];
}
function dayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function create(options){
 var groups=window.HUBA_BITS_ARTISTAS||{},sources=[],seen=new Set(),top=[];
 ['rock','pop','rap'].forEach(function(genre){
  (groups[genre]||[]).forEach(function(artist){sources.push(genre+': artist-top:'+artist.id)});
 });
 // Intercala gêneros no Top; a união é deduplicada por ID de artista e de faixa.
 var length=Math.max.apply(null,['rock','pop','rap'].map(function(g){return (groups[g]||[]).length}));
 for(var i=0;i<length;i++)['rock','pop','rap'].forEach(function(g){var artist=(groups[g]||[])[i];if(artist&&!seen.has(artist.id)){seen.add(artist.id);top.push('artist-top:'+artist.id)}});
 sources.push('top: '+top.join(', '));
 var profiles={},active=null,stamp=null,ticket=0;
 function preparedPage(url){
   var parsed=new URL(url),id=/\/artist\/(\d+)\/top/.exec(parsed.pathname)[1];
   for(var genre of ['rock','pop','rap']){
     var group=window.HUBA_BITS_PAGES[genre];
     if(group&&group.version===prepared.version&&group.artists[id])return Promise.resolve({data:group.artists[id].slice(0,Number(parsed.searchParams.get('limit')))});
   }
   return Promise.reject(Error('Artista ausente no catálogo preparado.'));
 }
 function profile(daily){
   var today=dayKey(),limit=daily?5:15;
   if(stamp!==today){
     if(active)active.pause();active=null;profiles={};stamp=today;
     try{for(var n=sessionStorage.length-1;n>=0;n--){var key=sessionStorage.key(n);if(key.indexOf('huba:bits:artist-page:bits-5:')===0&&key.indexOf('huba:bits:artist-page:bits-5:'+today+'|')!==0)sessionStorage.removeItem(key)}}catch(e){}
   }
   if(!profiles[limit]){
     var loader=HUBADeezer.create({sources:sources.map(function(line){return line.replace(/artist-top:(\d+)/g,'artist-top:$1:'+limit)}),pageProvider:prepared.enabled?preparedPage:null,pagePersistence:daily?'bits-5:'+today:null,onUpdate:function(s){if(active===loader)options.onUpdate(s)}});
     profiles[limit]=loader;
   }
   return profiles[limit];
 }
 return {
   select:async function(g,min,daily){
     var run=++ticket;if(active)active.pause();active=null;
     if(prepared.enabled){
       if(daily&&prepared.date!==dayKey())throw Error('O catálogo diário está sendo atualizado. Tente novamente em alguns minutos e atualize a página.');
       await Promise.all((g==='top'?['rock','pop','rap']:[g]).map(loadGenre));
     }
     if(run!==ticket){var e=Error('Carregamento cancelado');e.name='AbortError';throw e}
     var loader=profile(daily);active=loader;return loader.select(g,min,daily);
   },
   state:function(g){return (active||profile(HUBA.isDaily)).state(g)},
   paint:function(el,s){(active||profile(HUBA.isDaily)).paint(el,s)},
   pause:function(){ticket++;if(active)active.pause();active=null},
   genres:function(){return ['top','pop','rock','rap']}
 };
}
window.HUBA_BITS_CATALOGO={create:create,dayKey:dayKey};
})();
