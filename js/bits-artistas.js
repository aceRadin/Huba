/* Catálogo do Bits por artista, sem fetch local e sem catálogo americano. */
(function(){
'use strict';
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
 var profiles={},active=null,stamp=null;
 function profile(daily){
   var today=dayKey(),limit=daily?5:15;
   if(stamp!==today){
     if(active)active.pause();active=null;profiles={};stamp=today;
     try{for(var n=sessionStorage.length-1;n>=0;n--){var key=sessionStorage.key(n);if(key.indexOf('huba:bits:artist-page:bits-5:')===0&&key.indexOf('huba:bits:artist-page:bits-5:'+today+'|')!==0)sessionStorage.removeItem(key)}}catch(e){}
   }
   if(!profiles[limit]){
     var loader=HUBADeezer.create({sources:sources.map(function(line){return line.replace(/artist-top:(\d+)/g,'artist-top:$1:'+limit)}),pagePersistence:daily?'bits-5:'+today:null,onUpdate:function(s){if(active===loader)options.onUpdate(s)}});
     profiles[limit]=loader;
   }
   return profiles[limit];
 }
 return {
   select:function(g,min,daily){var loader=profile(daily);if(active&&active!==loader)active.pause();active=loader;return loader.select(g,min,daily)},
   state:function(g){return (active||profile(HUBA.isDaily)).state(g)},
   paint:function(el,s){(active||profile(HUBA.isDaily)).paint(el,s)},
   pause:function(){if(active)active.pause();active=null},
   genres:function(){return ['top','pop','rock','rap']}
 };
}
window.HUBA_BITS_CATALOGO={create:create,dayKey:dayKey};
})();
