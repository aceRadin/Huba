/* Deezer público: fila única, cache de páginas e catálogo progressivo por gênero.
 * Não faz nenhuma consulta até select()/ensure(). Compatível com GitHub Pages.
 */
(function(){
'use strict';
var serial=0, queue=[], busy=false, lastRequest=0, pageCache=new Map();
var GAP=250, PAGE_SIZE=100;
function aborted(){var e=new Error('Carregamento cancelado');e.name='AbortError';return e}
function check(signal){if(signal&&signal.aborted)throw aborted()}
function delay(ms,signal){return new Promise(function(resolve,reject){
  check(signal);
  var timer=setTimeout(function(){cleanup();resolve()},ms);
  function cancel(){clearTimeout(timer);cleanup();reject(aborted())}
  function cleanup(){if(signal)signal.removeEventListener('abort',cancel)}
  if(signal)signal.addEventListener('abort',cancel,{once:true});
})}
function apiURL(value){
  var url=new URL(value);
  if(url.hostname!=='api.deezer.com'||!/^https?:$/.test(url.protocol)||url.username||url.password||url.port)throw new Error('Página do Deezer não autorizada');
  url.protocol='https:';url.searchParams.delete('output');url.searchParams.delete('callback');url.hash='';return url;
}
function jsonp(url,signal){return new Promise(function(resolve,reject){
  check(signal);
  var cb='hubaDeezer'+(++serial),script=document.createElement('script'),done=false;
  var timer=setTimeout(function(){finish(new Error('O Deezer demorou para responder'))},12000);
  function finish(error,data){
    if(done)return;done=true;clearTimeout(timer);script.remove();if(signal)signal.removeEventListener('abort',cancel);
    // Uma resposta já em trânsito pode executar mesmo depois de remover o script.
    window[cb]=function(){};setTimeout(function(){delete window[cb]},60000);
    if(error)reject(error);else resolve(data);
  }
  function cancel(){finish(aborted())}
  window[cb]=function(data){
    if(data&&data.error){var e=new Error(data.error.message||'Falha no Deezer');e.code=Number(data.error.code);finish(e)}
    else finish(null,data);
  };
  script.onerror=function(){finish(new Error('Falha de rede ao consultar o Deezer'))};
  if(signal)signal.addEventListener('abort',cancel,{once:true});
  var parsed=apiURL(url);parsed.searchParams.set('output','jsonp');parsed.searchParams.set('callback',cb);script.src=parsed.href;
  document.head.appendChild(script);
})}
async function drain(){
  if(busy)return;busy=true;
  while(queue.length){
    var item=queue.shift();
    try{check(item.signal);await delay(Math.max(0,GAP-(Date.now()-lastRequest)),item.signal);check(item.signal);lastRequest=Date.now();item.resolve(await jsonp(item.url,item.signal))}
    catch(e){item.reject(e)}
  }
  busy=false;
}
function scheduled(url,signal,priority){return new Promise(function(resolve,reject){
  var item={url:url,signal:signal,resolve:resolve,reject:reject};
  if(priority)queue.unshift(item);else queue.push(item);drain();
})}
async function request(url,signal,priority){
  url=apiURL(url).href;
  for(var attempt=0;;attempt++){
    check(signal);
    try{return await scheduled(url,signal,priority)}catch(e){
      if(e.name==='AbortError'||attempt>=2||[100,200,300,500,501,600,800,901].indexOf(e.code)>=0)throw e;
      await delay((e.code===4?2000:500)*Math.pow(2,attempt),signal);
    }
  }
}
async function page(url,signal,persistence){
  url=apiURL(url).href;
  var key=persistence?persistence+'|'+url:url,storageKey='huba:bits:artist-page:'+key;
  if(pageCache.has(key))return pageCache.get(key);
  if(persistence)try{
    var stored=JSON.parse(sessionStorage.getItem(storageKey));
    if(stored&&Array.isArray(stored.data)){pageCache.set(key,stored);return stored}
  }catch(e){}
  var data=await request(url,signal,false);
  if(!data||!Array.isArray(data.data))throw new Error('Resposta de músicas inválida');
  pageCache.set(key,data);
  if(persistence)try{sessionStorage.setItem(storageKey,JSON.stringify(data))}catch(e){}
  return data;
}
function parse(lines){
  var result=[];
  (lines||[]).forEach(function(line){
    var at=line.indexOf(':');if(at<1)return;
    var genre=HUBA.norm(line.slice(0,at));
    line.slice(at+1).split(',').forEach(function(item){if(item.trim())result.push({genre:genre,item:item.trim()})});
  });return result;
}
function source(item,initial){
  var artistTop=/^artist-top:\s*(\d+)(?::(5|10|15))?$/i.exec(item);
  if(artistTop){var limit=Number(artistTop[2]||10);return {artist:null,top:true,topLimit:limit,artistId:artistTop[1],url:'https://api.deezer.com/artist/'+artistTop[1]+'/top?limit='+limit,seen:new Set(),done:false}}
  var chart=/^chart:\s*(\d+)$/i.exec(item);
  // Rankings não fornecem next de forma confiável; peça a seleção completa de 300.
  if(chart)return {artist:null,url:'https://api.deezer.com/chart/'+chart[1]+'/tracks?limit=300',seen:new Set(),done:false};
  var match=/^(?:playlist:\s*)?(?:https?:\/\/(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?playlist\/)?(\d+)(?:\?.*)?$/i.exec(item);
  return {artist:match?null:item,url:match?'https://api.deezer.com/playlist/'+match[1]+'/tracks?limit='+initial:'https://api.deezer.com/search?limit=50&order=RANKING&q='+encodeURIComponent('artist:"'+item+'"'),seen:new Set(),done:false};
}
function compare(a,b){return a.label.localeCompare(b.label,'pt-BR')||String(a.id).localeCompare(String(b.id),'en')}
function create(options){
  var entries=parse(options.sources),states=new Map(),active=null,controller=null,epoch=0;
  function state(g){
    if(!states.has(g))states.set(g,{genre:g,songs:[],keys:new Set(),sources:null,index:0,running:false,complete:false,error:null,waiters:[]});
    return states.get(g);
  }
  function notify(s){
    s.waiters.slice().forEach(function(w){
      if((w.full?s.complete:s.songs.length>=w.min)||s.complete){w.resolve(s);s.waiters.splice(s.waiters.indexOf(w),1)}
      else if(s.error){w.reject(s.error);s.waiters.splice(s.waiters.indexOf(w),1)}
    });
    if(options.onUpdate)options.onUpdate(s);
  }
  function pause(){
    epoch++;
    if(controller)controller.abort();controller=null;
    if(active){active.running=false;active.waiters.splice(0).forEach(function(w){w.reject(aborted())})}
    active=null;
  }
  function add(s,tracks,src){
    var accepted=0;
    tracks.forEach(function(t){
      if(src.artist&&options.artistLimit&&accepted>=options.artistLimit)return;
      if(!t||!t.id||typeof t.title!=='string'||!t.title.trim()||!t.artist||typeof t.artist.name!=='string'||!t.artist.name.trim()||!/^https:\/\/[^\s]+$/i.test(t.preview||''))return;
      if(src.top&&String(t.artist.id)!==src.artistId)return;
      if(src.artist){var a=HUBA.norm(t.artist.name),n=HUBA.norm(src.artist);if(a!==n&&a.indexOf(n)<0&&n.indexOf(a)<0)return}
      var title=t.title.replace(/\s*[\(\[][^\)\]]*[\)\]]/g,'').trim()||t.title;
      var label=t.artist.name+' - '+title,id=String(t.id),key=HUBA.norm(label);
      if(s.keys.has('id:'+id)||s.keys.has('label:'+key))return;
      s.keys.add('id:'+id);s.keys.add('label:'+key);accepted++;
      s.songs.push({id:id,url:t.preview,label:label,genre:s.genre,artist:t.artist.name,title:title,cover:(t.album&&(t.album.cover_medium||t.album.cover_big||t.album.cover))||''});
    });
  }
  async function pump(s,signal,run){
    try{
      while(s.index<s.sources.length){
        check(signal);if(run!==epoch)return;
        var src=s.sources[s.index],url=src.url;
        if(src.seen.has(url))throw new Error('Paginação repetida no Deezer');
        var data=await page(url,signal,options.pagePersistence);check(signal);if(run!==epoch)return;
        // Valida next antes de incorporar a página; uma falha mantém o cursor retomável.
        var next=null;
        if(!src.artist&&!src.top&&data.next){var parsed=apiURL(data.next);parsed.searchParams.set('limit',String(PAGE_SIZE));next=parsed.href;if(src.seen.has(next)||next===url)throw new Error('Paginação repetida no Deezer')}
        add(s,src.top?data.data.slice(0,src.topLimit):data.data,src);src.seen.add(url);
        if(next)src.url=next;else{src.done=true;s.index++}
        notify(s);
      }
      s.complete=true;s.running=false;notify(s);
    }catch(e){
      if(run!==epoch||e.name==='AbortError')return;
      s.running=false;s.error=e;notify(s);
    }
  }
  function start(s,initial){
    if(s.running||s.complete)return;
    if(!s.sources){
      var seen=new Set();
      s.sources=entries.filter(function(e){return e.genre===s.genre}).map(function(e,i){return source(e.item,i?PAGE_SIZE:initial)}).filter(function(src){var key=src.artist||new URL(src.url).pathname;if(seen.has(key))return false;seen.add(key);return true});
    }
    if(!s.sources.length){s.error=new Error('Nenhuma playlist configurada para '+s.genre);notify(s);return}
    s.error=null;s.running=true;controller=new AbortController();notify(s);pump(s,controller.signal,epoch);
  }
  function wait(s,min,full){
    if((full?s.complete:s.songs.length>=min)||s.complete)return Promise.resolve(s);
    if(s.error)return Promise.reject(s.error);
    return new Promise(function(resolve,reject){s.waiters.push({min:min,full:full,resolve:resolve,reject:reject})});
  }
  function select(g,min,full){
    if(active&&active.genre!==g)pause();
    var s=state(g);active=s;
    start(s,full?PAGE_SIZE:min);return wait(s,min,full);
  }
  function ensure(g,min,full){return select(g,min,!!full)}
  function snapshot(g){return state(g).songs.slice().sort(compare)}
  function countText(s){return s.songs.length.toLocaleString('pt-BR')+' músicas carregadas'+(s.complete?' · concluído':s.error?' · carregamento pausado':s.running?' · carregando…':' · pausado')}
  function paint(element,s){
    element.textContent=countText(s);
    if(s.error){var retry=document.createElement('button');retry.type='button';retry.textContent='Retomar';retry.style.cssText='font:inherit;padding:2px 6px;margin-left:6px';retry.onclick=function(){select(s.genre,1,false).catch(function(){})};element.appendChild(retry)}
  }
  return {select:select,ensure:ensure,pause:pause,state:state,snapshot:snapshot,paint:paint,genres:function(){return entries.map(function(e){return e.genre}).filter(function(g,i,a){return a.indexOf(g)===i})}};
}
window.HUBADeezer={create:create,request:request,compare:compare};
})();
