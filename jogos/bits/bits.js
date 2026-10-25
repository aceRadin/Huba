/* Bits: jogo independente. Nenhum código do Musicle ou Termo é alterado aqui. */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var cats=['geral','pop','anime','rock','metal'];
var labels={geral:'Geral',pop:'Pop',anime:'Anime',rock:'Rock',metal:'Metal'};
var lengths=[1,2,4,7,11,16], maxAttempts=lengths.length;
var catalog=[], byCat={}, active=null, selected=null, roundId=0;
var audio=new Audio(), audioUrl=null, stopTimer=null, frame=null, playStart=0, loadToken=0;
var statsKey='huba:bits:stats:v1', sourcesKey='huba:bits:sources:v1';
var configs=window.BITS_DEFAULT_SOURCES||'';
var norm=HUBA.norm, hash=HUBA.hash;
function setStatus(message){$('loadStatus').textContent=message}
function storageGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function storageSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function getStats(){try{return JSON.parse(storageGet(statsKey))||{games:0,wins:0}}catch(e){return {games:0,wins:0}}}
function saveStats(st){storageSet(statsKey,JSON.stringify(st))}
function renderStats(){var s=getStats();$('totalGames').textContent=s.games||0;$('streakValue').textContent=HUBA.currentStreak('bits')}
function dailyKey(cat){return 'huba:bits:daily:v1:'+HUBA.dayKey()+':'+cat}
function dailySave(){if(!active||!active.daily)return;storageSet(dailyKey(active.cat),JSON.stringify({id:active.song.id,guessIds:active.guesses,finished:active.finished,won:active.won}))}
function dailyRead(cat){try{return JSON.parse(storageGet(dailyKey(cat)))}catch(e){return null}}
function makeID(song){return song.id||norm(song.label)}
function ingest(items){
 var seen={}, out=[];
 items.forEach(function(s){if(!s||!s.label||!(s.url||s.file))return;
   var id=makeID(s), key=s.genre+'|'+norm(s.label);
   if(!seen[key]){seen[key]=true;out.push({id:id,label:s.label,artist:s.artist||'',title:s.title||'',genre:s.genre,url:s.url||null,file:s.file||null})}
 });
 // Lista ordenada dá resultados reproduzíveis com um catálogo de músicas idêntico.
 out.sort(function(a,b){return a.label.localeCompare(b.label,'pt-BR')});
 catalog=out;byCat={};cats.forEach(function(c){byCat[c]=c==='geral'?catalog:catalog.filter(function(s){return s.genre===c})});
 drawTiles();renderStats();
}
function drawTiles(){
 ['daily','random'].forEach(function(mode){var parent=$(mode+'Tiles');parent.textContent='';
 cats.forEach(function(cat){var list=byCat[cat]||[], prev=dailyRead(cat), btn=document.createElement('button');
 btn.type='button';btn.className='bits-tile';if(mode==='daily'&&prev&&prev.finished)btn.classList.add('completed');
 var name=document.createElement('span'),small=document.createElement('small');name.textContent=labels[cat];
 small.textContent=list.length ? (mode==='daily'&&prev&&prev.finished?(prev.won?'Concluído ✓':'Finalizado') : list.length+' músicas') : 'Aguardando músicas';
 btn.append(name,small);btn.disabled=!list.length;btn.onclick=function(){start(cat,mode==='daily')};parent.appendChild(btn);
 });
 });
}
function formatSong(t){return (t.artist||'')+' - '+(t.title||'')}
function parseSource(text){var entries=[];text.split(/\r?\n/).forEach(function(line){var at=line.indexOf(':');if(at<1)return;var genre=norm(line.slice(0,at));if(cats.indexOf(genre)<0||genre==='geral')return;line.slice(at+1).split(',').forEach(function(item){item=item.trim();if(item)entries.push({genre:genre,item:item})})});return entries}
var jsonpCount=0;
function jsonp(url){return new Promise(function(resolve,reject){
 var cb='bitsCb'+(++jsonpCount)+'_'+Date.now(), script=document.createElement('script'), done=false;
 var timeout=setTimeout(function(){finish(new Error('tempo esgotado'))},12000);
 function finish(error,data){if(done)return;done=true;clearTimeout(timeout);try{delete window[cb]}catch(e){window[cb]=undefined}script.remove();if(error)reject(error);else resolve(data)}
 window[cb]=function(d){if(d&&d.error)finish(new Error(d.error.message||'erro Deezer'));else finish(null,d)};
 script.onerror=function(){finish(new Error('falha de rede'))};
 script.src=url+(url.indexOf('?')>=0?'&':'?')+'output=jsonp&callback='+cb;
 document.head.appendChild(script);
 })}
function getSongs(entry){
 var item=entry.item, match=/^(?:playlist:\s*)?(?:https?:\/\/(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?playlist\/)?(\d+)(?:\?.*)?$/i.exec(item);
 var base=match?'https://api.deezer.com/playlist/'+match[1]+'/tracks?limit=100':'https://api.deezer.com/search?limit=50&order=RANKING&q='+encodeURIComponent('artist:"'+item+'"');
 var all=[], seen={}, visited={};
 function page(url){
   var parsed;
   try{parsed=new URL(url)}catch(e){return Promise.reject(new Error('endereço inválido'))}
   if(parsed.hostname!=='api.deezer.com'||!/^https?:$/.test(parsed.protocol))return Promise.reject(new Error('página de API não autorizada'));
   parsed.protocol='https:';url=parsed.href;
   if(visited[url])return Promise.reject(new Error('paginação repetida'));
   visited[url]=true;
   function retry(n){return jsonp(url).catch(function(err){if(n<1)return retry(n+1);throw err})}
   return retry(0).then(function(response){
     if(!response||!Array.isArray(response.data))throw new Error('resposta inválida');
     response.data.forEach(function(t){
       if(!t||!t.preview||!t.artist||!t.artist.name||!t.title)return;
       if(!match){var artist=norm(t.artist.name), requested=norm(item);if(artist!==requested&&artist.indexOf(requested)<0&&requested.indexOf(artist)<0)return}
       var title=t.title.replace(/\s*[\(\[][\s\S]*?[\)\]]/g,'').trim()||t.title;
       var label=t.artist.name+' - '+title,k=norm(label);
       if(seen[k])return;seen[k]=true;
       all.push({id:'dz-'+String(t.id||k),label:label,artist:t.artist.name,title:title,genre:entry.genre,url:t.preview});
     });
     // Para artistas apenas uma página, como no Musicle; playlists percorrem todas as páginas.
     return match&&response.next?page(response.next):all;
   });
 }
 return page(base);
}
function loadRemote(){
 var entries=parseSource($('sources').value);
 if(!entries.length){setStatus('Adicione ao menos um artista ou playlist em Pop, Anime, Rock ou Metal.');return}
 var token=++loadToken, total=entries.length, completed=0, fails=0, found=[];
 $('loadSources').disabled=true;setStatus('Carregando músicas: 0 / '+total+' fontes…');
 // No máximo três fontes simultâneas para não sobrecarregar a API.
 var next=0;
 function worker(){if(next>=entries.length)return Promise.resolve();var e=entries[next++];return getSongs(e).then(function(s){found=found.concat(s)},function(){fails++}).then(function(){completed++;if(token===loadToken)setStatus('Carregando músicas: '+completed+' / '+total+' fontes…');return worker()})}
 Promise.all([worker(),worker(),worker()]).then(function(){
   if(token!==loadToken)return;
   // Preserve os arquivos locais selecionados, se existirem.
   ingest(found.concat(localSongs));
   var note=catalog.length+' músicas elegíveis. '+(fails?fails+' fonte(s) falharam. ':'')+'Clique em uma categoria para jogar.';
   if(!catalog.length)note='Nenhuma prévia disponível. Tente outros artistas ou arquivos locais.';
   setStatus(note);
 }).catch(function(){if(token===loadToken)setStatus('Falha inesperada. Tente novamente.')} ).then(function(){if(token===loadToken)$('loadSources').disabled=false});
}
var localSongs=[];
function loadLocal(fileList){
 var files=Array.prototype.slice.call(fileList||[]);var added=[];
 files.forEach(function(file){if(!/^audio\//.test(file.type)&&!/\.(mp3|m4a|ogg|wav|flac|aac|opus)$/i.test(file.name))return;
 var path=(file.webkitRelativePath||'').split('/'), genre=path.length>=3?norm(path[1]):'geral';
 if(cats.indexOf(genre)<0)genre='geral';
 var name=file.name.replace(/\.[^/.]+$/,'').replace(/_/g,' '), parts=name.split(/\s+-\s+/),artist=parts.length>1?parts.shift().trim():'Arquivo local',title=parts.length?parts.join(' - '):name;
 added.push({id:'local-'+file.name+'-'+file.size+'-'+file.lastModified,genre:genre,label:artist+' - '+title,artist:artist,title:title,file:file});
 });
 if(!added.length){setStatus('Nenhum arquivo de áudio compatível selecionado.');return}
 localSongs=added;ingest(catalog.filter(function(s){return !s.file}).concat(localSongs));setStatus(localSongs.length+' arquivos locais selecionados; '+catalog.length+' músicas no total.');
}
function chooseSong(cat,daily){
 var list=byCat[cat]||[];if(!list.length)return null;
 if(daily){var stored=dailyRead(cat);if(stored){var old=list.find(function(s){return s.id===stored.id});if(old)return old}
   var random=HUBA.mulberry(hash('bits|'+cat+'|'+HUBA.dayKey()));return list[Math.floor(random()*list.length)];
 }
 var last=active&&active.song&&active.song.id;var options=list.filter(function(s){return s.id!==last});return (options.length?options:list)[Math.floor(Math.random()*(options.length?options:list).length)];
}
function start(cat,daily){
 var list=byCat[cat]||[];if(!list.length){setStatus('Carregue músicas antes de jogar.');return}
 stopAudio();var song=chooseSong(cat,daily);if(!song)return;
 active={cat:cat,daily:daily,song:song,guesses:[],finished:false,won:false,recorded:false};
 if(daily){var old=dailyRead(cat);if(old&&old.id===song.id){active.guesses=Array.isArray(old.guessIds)?old.guessIds.slice(0,maxAttempts):[];active.finished=!!old.finished;active.won=!!old.won;active.recorded=active.finished}}
 roundId++;
 $('bitsHome').classList.add('hidden');$('bitsGame').classList.remove('hidden');
 $('gameTitle').textContent='Bits · '+labels[cat];$('gameSubtitle').textContent=daily?'Desafio diário':'Rodada aleatória';
 $('playAgain').classList.toggle('hidden',daily);$('guessInput').value='';selected=null;
 $('finish').classList.toggle('hidden',!active.finished);$('guessArea').classList.toggle('hidden',active.finished);
 prepareAudio(song);renderRound();
 if(active.finished)showFinish();else $('guessInput').focus();
}
function stopAudio(){audio.pause();audio.onplaying=null;audio.onloadedmetadata=null;clearTimeout(stopTimer);cancelAnimationFrame(frame);$('audioProgress').style.transform='scaleX(0)';$('playAudio').textContent='▶ Ouvir trecho'}
function prepareAudio(song){if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null}audioUrl=song.file?URL.createObjectURL(song.file):null;audio.preload='metadata';audio.src=audioUrl||song.url;audio.load()}
function clipDuration(){return lengths[Math.min(active.guesses.length,lengths.length-1)]}
function play(){if(!active)return;if(!audio.paused){stopAudio();return}
 stopAudio();var clip=clipDuration();audio.currentTime=0;
 // O Bits sempre toca a introdução, diferentemente do Musicle.
 var started=false;audio.onplaying=function(){if(started)return;started=true;var start=performance.now();stopTimer=setTimeout(stopAudio,clip*1000);
 function tick(now){$('audioProgress').style.transform='scaleX('+Math.min(1,(now-start)/(clip*1000))+')';if(now-start<clip*1000)frame=requestAnimationFrame(tick)}frame=requestAnimationFrame(tick)};
 var p=audio.play();if(p&&p.catch)p.catch(function(){stopAudio();message('Não foi possível reproduzir a prévia. Tente outra fonte ou arquivo.')});
 $('playAudio').textContent='■ Parar';
}
function message(msg){$('message').textContent=msg}
function guessOptions(){return byCat[active.cat]||[]}
function showSuggestions(){
 var list=$('suggestions');list.replaceChildren();if(!active||active.finished)return;
 var value=norm($('guessInput').value);$('guessInput').setAttribute('aria-expanded','false');
 if(!value){list.classList.remove('open');return}
 var options=guessOptions().filter(function(s){return norm(s.label).includes(value)}).slice(0,12);
 if(!options.length){list.classList.remove('open');return}
 options.forEach(function(song){var b=document.createElement('button');b.type='button';b.className='bits-choice';b.setAttribute('role','option');b.textContent=song.label;b.onclick=function(){selected=song;$('guessInput').value=song.label;$('selectedText').textContent='Selecionada: '+song.label;$('submitGuess').disabled=false;list.classList.remove('open');$('guessInput').setAttribute('aria-expanded','false')};list.appendChild(b)});
 list.classList.add('open');$('guessInput').setAttribute('aria-expanded','true');
}
function renderRound(){
 if(!active)return;
 var attempts=active.guesses.length;
 $('attemptLabel').textContent=active.finished?'Finalizado':(attempts+1)+' / '+maxAttempts;
 $('clipLength').textContent=clipDuration()+' s';
 var stepBox=$('steps');stepBox.replaceChildren();for(var i=0;i<maxAttempts;i++){var step=document.createElement('div');step.className='bits-step';if(i<attempts)step.classList.add(active.guesses[i]===active.song.id?'won':'missed');else if(i===attempts&&!active.finished)step.classList.add('active');stepBox.appendChild(step)}
 var box=$('history');box.replaceChildren();active.guesses.forEach(function(id,index){var line=document.createElement('div');line.className='bits-history-line';
 var song=(byCat[active.cat]||[]).find(function(s){return s.id===id});line.textContent=(index+1)+'. '+(id==='__skip__'?'Pulou a tentativa':song?song.label:'Palpite registrado');
 if(id===active.song.id)line.style.borderColor='var(--ok)';box.appendChild(line)});
 $('guessInput').value='';selected=null;$('submitGuess').disabled=true;$('selectedText').textContent='Selecione uma música da lista.';$('suggestions').classList.remove('open');
 if(!active.finished)message('Você pode ouvir o trecho quantas vezes quiser antes de responder.');
}
function submit(skip){
 if(!active||active.finished||(!skip&&!selected))return;
 var id=skip?'__skip__':selected.id;
 active.guesses.push(id);stopAudio();
 if(id===active.song.id){active.won=true;active.finished=true}else if(active.guesses.length>=maxAttempts)active.finished=true;
 if(active.finished)recordFinish();dailySave();renderRound();
 if(active.finished)showFinish();else message(skip?'Tentativa pulada. Agora o trecho ficou maior.':'Não foi dessa vez. Ouça um trecho maior!');
}
function recordFinish(){if(!active||active.recorded)return;var st=getStats();st.games=(st.games||0)+1;if(active.won)st.wins=(st.wins||0)+1;saveStats(st);active.recorded=true;
 // Streak somente para conclusão de desafio diário, uma vez por data, independentemente da categoria.
 if(active.daily)HUBA.recordDailyStreak('bits');renderStats();}
function showFinish(){stopAudio();$('guessArea').classList.add('hidden');$('finish').classList.remove('hidden');
 $('finishTitle').textContent=active.won?'Você acertou! 🎉':'Fim das tentativas';
 $('finishSong').textContent='Música: '+active.song.label;
 $('finishDetail').textContent=active.won?'Acertou em '+active.guesses.length+' de '+maxAttempts+' tentativas.':'Você pode tentar outra música no modo Aleatório.';
 $('playAgain').classList.toggle('hidden',active.daily);
}
function back(){stopAudio();if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null}roundId++;active=null;$('bitsGame').classList.add('hidden');$('bitsHome').classList.remove('hidden');drawTiles();renderStats()}
$('backGame').onclick=back;$('finishBack').onclick=back;$('playAgain').onclick=function(){if(active&&!active.daily){var cat=active.cat;start(cat,false)}};
$('playAudio').onclick=play;$('skipGuess').onclick=function(){submit(true)};$('submitGuess').onclick=function(){submit(false)};
$('guessInput').addEventListener('input',function(){selected=null;$('submitGuess').disabled=true;$('selectedText').textContent='Selecione uma música da lista.';showSuggestions()});
$('guessInput').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();if(selected)submit(false);else{var first=$('suggestions').querySelector('button');if(first)first.click()}}});
$('loadSources').onclick=function(){storageSet(sourcesKey,$('sources').value);loadRemote()};
$('resetSources').onclick=function(){$('sources').value=configs;storageSet(sourcesKey,configs);setStatus('Fontes padrão restauradas. Clique em Carregar músicas.')};
$('pickFolder').onclick=function(){$('folderInput').click()};$('pickFiles').onclick=function(){$('filesInput').click()};
$('folderInput').onchange=function(){loadLocal(this.files)};$('filesInput').onchange=function(){loadLocal(this.files)};
$('sources').value=storageGet(sourcesKey)||configs;
audio.volume=0.8;ingest([]);renderStats();loadRemote();
})();
