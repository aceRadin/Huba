/* Mesmo catálogo preparado para Musical e Streakal, baixado só ao escolher gênero. */
(function(){
'use strict';
var base=new URL('../dados/playlists/',document.currentScript.src);
window.HUBA_PLAYLISTS_PAGES=window.HUBA_PLAYLISTS_PAGES||{};
function abortError(){var e=Error('Carregamento cancelado');e.name='AbortError';return e}
function create(options){
 var config=window.HUBA_PLAYLISTS_PREPARADO;
 if(config&&!config.enabled)return HUBADeezer.create(options);
 var manifest=config,loaders={},active=null;
 function loaderFor(config){
 if(loaders[config.version])return loaders[config.version];
 var cache={};
 function download(genre,signal){return new Promise(function(resolve,reject){
   if(signal.aborted){reject(abortError());return}
   if(cache[genre]){resolve(cache[genre]);return}
   if(!config||!config.files||!config.files[genre]){reject(Error('Catálogo inválido. Atualize a página.'));return}
   var script=document.createElement('script'),done=false;
   var timer=setTimeout(function(){finish(Error('O catálogo demorou para carregar. Tente novamente.'))},30000);
   function finish(error,tracks){
     if(done)return;done=true;clearTimeout(timer);script.remove();signal.removeEventListener('abort',cancel);
     if(error)reject(error);else{cache[genre]=tracks;resolve(tracks)}
   }
   function cancel(){finish(abortError())}
   signal.addEventListener('abort',cancel,{once:true});
   script.onload=function(){
     var data=window.HUBA_PLAYLISTS_PAGES[genre];
     if(!data||data.version!==config.version||!Array.isArray(data.tracks)){finish(Error('Catálogo inválido. Atualize a página.'));return}
     finish(null,data.tracks);
   };
   script.onerror=function(){finish(Error('Não foi possível baixar o catálogo. Tente novamente.'))};
   script.src=new URL(config.files[genre],base).href;document.head.appendChild(script);
 })}
 var loader=HUBADeezer.create(Object.assign({},options,{sources:config.sources||options.sources,catalogProvider:download}));
 return loaders[config.version]=loader;
 }
 function select(g,min,full){
   var today=HUBA.dayKey(),config=manifest&&manifest.days?manifest.days[today]:manifest;
   if(!full&&!config)config=manifest;
   if(!config||full&&config.date!==today)return Promise.reject(Error('O catálogo diário está sendo atualizado. Tente novamente em alguns minutos e atualize a página.'));
   var loader=loaderFor(config);if(active&&active!==loader)active.pause();active=loader;
   return loader.select(g,min,full);
 }
 // paint() mantém seu botão Retomar ligado ao mesmo carregador e ao mesmo arquivo.
 // O catálogo escolhido fica preso à sua versão; mudar de dia não altera partidas abertas.
 var initial=HUBADeezer.create(options);
 return {select:select,ensure:select,pause:function(){if(active)active.pause()},
   state:function(g){return (active||initial).state(g)},snapshot:function(g){return (active||initial).snapshot(g)},
   paint:function(el,s){return (active||initial).paint(el,s)},genres:function(){return initial.genres()}};
}
window.HUBAPlaylists={create:create};
})();
