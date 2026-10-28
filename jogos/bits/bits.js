/* Bits: jogo independente. Nenhum código do Musical ou Wording é alterado aqui. */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var cats=['top','pop','rock','rap'];
var labels={top:'Top',pop:'Pop',rock:'Rock',rap:'Rap'};
var lengths=[1,2,4,7,11,16], maxAttempts=lengths.length;
var byCat={}, active=null, selected=null, roundId=0;
var audio=new Audio(), audioUrl=null, loadToken=0, musicLoading=true, loadingChoice=null;
var unavailableSongs={};
var audioToken=0,recoveredSong=false,recoveringSong=false;
var statsKey='huba:bits:stats:v1', volumeKey='huba:bits:volume:v1', muteKey='huba:bits:muted:v1';
var norm=HUBA.norm, hash=HUBA.hash;
function setStatus(message){$('loadStatus').textContent=message}
function storageGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function storageSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function getStats(){try{return JSON.parse(storageGet(statsKey))||{games:0,wins:0}}catch(e){return {games:0,wins:0}}}
function saveStats(st){storageSet(statsKey,JSON.stringify(st))}
function renderStats(){$('streakValue').textContent=HUBA.currentStreak('bits')}
function dailyKey(cat){return 'huba:bits:daily:v3:us:'+HUBA_BITS_CATALOGO.dayKey()+':'+cat}
function dailySave(){if(!active||!active.daily)return;storageSet(dailyKey(active.cat),JSON.stringify({id:active.song.id,guessIds:active.guesses,finished:active.finished,won:active.won}))}
function dailyRead(cat){try{return JSON.parse(storageGet(dailyKey(cat)))}catch(e){return null}}
function drawTiles(){
 ['daily','random'].forEach(function(mode){var parent=$(mode+'Tiles');parent.textContent='';
 cats.forEach(function(cat){var list=byCat[cat]||[], prev=dailyRead(cat), btn=document.createElement('button');
 btn.type='button';btn.className='bits-tile';if(mode==='daily'&&prev&&prev.finished)btn.classList.add('completed');
 var name=document.createElement('span'),small=document.createElement('small');name.textContent=labels[cat];
 small.textContent=musicLoading&&loadingChoice&&loadingChoice.cat===cat&&loadingChoice.daily===(mode==='daily')?'Carregando gênero…':(mode==='daily'&&prev&&prev.finished?(prev.won?'Concluído ✓':'Finalizado'):'');
 btn.append(name,small);btn.disabled=!!(musicLoading&&loadingChoice&&loadingChoice.cat===cat&&loadingChoice.daily===(mode==='daily'));btn.onclick=function(){enterCategory(cat,mode==='daily')};parent.appendChild(btn);
 });
 });
}
/* Rankings exclusivos do Bits; as playlists dos demais jogos não são alteradas. */
var selectedCat=null;
var musicLoader=HUBA_BITS_CATALOGO.create({onUpdate:function(s){
  byCat[s.genre]=s.songs.map(function(song){return Object.assign({},song,{deezerId:song.id,id:'dz-'+song.id})});
  if(selectedCat===s.genre){
    musicLoader.paint($('catalogCount'),s);musicLoader.paint($('gameCatalogCount'),s);
    if(active&&!active.finished&&active.cat===s.genre&&!selected&&$('guessInput').value)showSuggestions();
    drawTiles();
  }
}});
function enterCategory(cat,daily){
 var token=++loadToken;selectedCat=cat;
 musicLoading=true;loadingChoice={cat:cat,daily:daily};drawTiles();
 setStatus(daily?'Preparando todas as músicas para manter o desafio diário consistente…':'Carregando músicas de '+labels[cat]+'…');
 // Top aguarda os três rankings para não sortear apenas do primeiro gênero.
 musicLoader.select(cat,1,daily).then(function(s){
   if(token!==loadToken)return;
   musicLoading=false;loadingChoice=null;drawTiles();
   if(!s.songs.length)throw new Error('Nenhuma música disponível nesta categoria.');
   setStatus('');start(cat,daily);musicLoader.paint($('gameCatalogCount'),s);
 }).catch(function(err){
   if(token!==loadToken||err.name==='AbortError')return;
   musicLoading=false;loadingChoice=null;drawTiles();
   setStatus((daily?'O diário precisa de todas as fontes. ':'')+err.message+' · Tente novamente para carregar o ranking.');
 });
}
function initCatalog(){
 musicLoading=false;drawTiles();
 setStatus('Catálogo dos Estados Unidos · Top reúne Pop, Rock e Rap.');
 $('catalogCount').textContent='Músicas carregadas sob demanda';
}
function pauseCatalog(){loadToken++;musicLoader.pause();musicLoading=false;loadingChoice=null;if(selectedCat)musicLoader.paint($('catalogCount'),musicLoader.state(selectedCat))}
window.addEventListener('pagehide',pauseCatalog);

function chooseSong(cat,daily){
 var list=(byCat[cat]||[]).slice();if(daily)list.sort(HUBADeezer.compare);if(!list.length)return null;
 if(daily){var stored=dailyRead(cat);if(stored){var old=list.find(function(s){return s.id===stored.id});if(old)return old;setStatus('A música do diário salvo não está disponível no catálogo. Tente carregar novamente mais tarde.');return null}
   var random=HUBA.mulberry(hash('bits|'+cat+'|'+HUBA_BITS_CATALOGO.dayKey()));return list[Math.floor(random()*list.length)];
 }
 var last=active&&active.song&&active.song.id;var options=list.filter(function(s){return s.id!==last});return (options.length?options:list)[Math.floor(Math.random()*(options.length?options:list).length)];
}
/* Controle de apoio exclusivo do Bits; não altera o rodapé dos outros jogos. */
var supportToggle=null;
function bitsSupportCollapsed(collapse){
 var panel=document.querySelector('.huba-support');
 if(!panel)return;
 if(!supportToggle){
   supportToggle=document.createElement('button');
   supportToggle.type='button';supportToggle.className='bits-support-toggle';
   supportToggle.setAttribute('aria-controls','bits-support-panel');
   panel.id='bits-support-panel';
   supportToggle.onclick=function(){bitsSupportCollapsed(!document.body.classList.contains('bits-support-collapsed'))};
   document.body.appendChild(supportToggle);
 }
 document.body.classList.toggle('bits-support-collapsed',collapse);
 supportToggle.hidden=!collapse && (!active || active.guesses.length<3);
 supportToggle.textContent=collapse?'⌃':'⌄';
 supportToggle.setAttribute('aria-expanded',String(!collapse));
 supportToggle.setAttribute('aria-label',collapse?'Mostrar apoio ao HUBA':'Recolher apoio ao HUBA');
}
function start(cat,daily){
 var list=byCat[cat]||[];if(!list.length){setStatus('Carregue músicas antes de jogar.');return}
 stopAudio();unavailableSongs={};var song=chooseSong(cat,daily);if(!song)return;
 $('gameCatalogCount').textContent=list.length.toLocaleString('pt-BR')+' músicas carregadas neste gênero';
 active={cat:cat,daily:daily,pool:daily?(byCat[cat]||[]).slice().sort(HUBADeezer.compare):null,song:song,guesses:[],finished:false,won:false,recorded:false};
 if(daily){var old=dailyRead(cat);if(old&&old.id===song.id){active.guesses=Array.isArray(old.guessIds)?old.guessIds.slice(0,maxAttempts):[];active.finished=!!old.finished;active.won=!!old.won;active.recorded=active.finished}}
 roundId++;
 $('bitsHome').classList.add('hidden');$('bitsGame').classList.remove('hidden');
 $('gameTitle').textContent='Bits · '+labels[cat];$('gameSubtitle').textContent=daily?'Desafio diário':'Rodada aleatória';
 $('playAgain').classList.toggle('hidden',daily);$('guessInput').value='';selected=null;
 $('finish').classList.toggle('hidden',!active.finished);$('guessArea').classList.toggle('hidden',active.finished);
 $('replaceAudio').classList.add('hidden');prepareAudio(song);renderRound();
 bitsSupportCollapsed(active.guesses.length>=3);
 if(active.finished)showFinish();else $('guessInput').focus();
}
function durationLimit(){return active?clipDuration():0}
function updateTimeline(){
 var now=Math.max(0,Number(audio.currentTime)||0);
 var pieces=$('timeline').children, previous=0;
 for(var i=0;i<pieces.length;i++){
   var end=lengths[i], portion=Math.max(0,Math.min(1,(now-previous)/(end-previous)));
   pieces[i].firstChild.style.transform='scaleX('+portion+')';previous=end;
 }
 $('timeline').setAttribute('aria-valuenow',String(Math.min(16,Math.round(now*10)/10)));
}
function pauseAudio(){
 audio.pause();$('playAudio').textContent='▶ Ouvir novamente';updateTimeline();
}
function stopAudio(){
 audio.pause();try{audio.currentTime=0}catch(e){}
 updateTimeline();$('playAudio').textContent='▶ Ouvir trecho';
}
function prepareAudio(song,recovered){
 audioToken++;recoveredSong=!!recovered;recoveringSong=false;
 if(!song.url&&!song.file){
   var token=audioToken;audio.removeAttribute('src');audio.load();recoveringSong=true;
   message('Carregando prévia da música…');
   HUBADeezer.request('https://api.deezer.com/track/'+encodeURIComponent(song.deezerId),null,true).then(function(data){
     if(token!==audioToken)return;if(!data||!data.preview)throw Error('Prévia indisponível');
     song.url=data.preview;prepareAudio(song);message('Você pode ouvir o trecho antes de responder.');
   }).catch(function(){if(token===audioToken){recoveringSong=false;showAudioFailure()}});return;
 }
 if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null}
 audioUrl=song.file?URL.createObjectURL(song.file):null;
 audio.preload='metadata';audio.src=audioUrl||song.url;audio.load();updateTimeline();
}
function clipDuration(){return lengths[Math.min(active.guesses.length,lengths.length-1)]}
function audioFailed(){
 if(!active||active.finished||$('bitsGame').classList.contains('hidden'))return;
 if(recoveringSong)return;
 var song=active.song,token=audioToken;
 if(song.deezerId&&!recoveredSong){
   recoveredSong=true;recoveringSong=true;pauseAudio();message('Atualizando a prévia desta música…');
   HUBADeezer.request('https://api.deezer.com/track/'+encodeURIComponent(song.deezerId),null,true).then(function(data){
     if(token!==audioToken)return;
     if(!data||!data.preview)throw new Error('Prévia indisponível');
     song.url=data.preview;prepareAudio(song,true);message('Prévia atualizada. Tente ouvir novamente.');
   }).catch(function(){if(token===audioToken){recoveringSong=false;showAudioFailure()}});return;
 }
 showAudioFailure();
}
function showAudioFailure(){
 pauseAudio();$('replaceAudio').classList.remove('hidden');
 message('Esta prévia não tocou. Sorteie outra música sem perder a rodada.');
}
function replaceAudio(){
 if(!active||active.finished||$('replaceAudio').classList.contains('hidden'))return;
 unavailableSongs[active.song.id]=true;
 var options=(byCat[active.cat]||[]).filter(function(s){return !unavailableSongs[s.id]});
 if(!options.length){message('Não há outra música disponível nesta categoria. Carregue mais músicas.');$('replaceAudio').classList.add('hidden');return}
 var song=options[Math.floor(Math.random()*options.length)];
 stopAudio();active.song=song;
 // Uma música nova exige palpites novos; não contam tentativas ou derrota.
 active.guesses=[];active.finished=false;active.won=false;
 $('finish').classList.add('hidden');$('guessArea').classList.remove('hidden');
 $('replaceAudio').classList.add('hidden');prepareAudio(song);dailySave();renderRound();
 message('Nova música sorteada. Suas tentativas foram reiniciadas sem penalidade.');
}
$('replaceAudio').onclick=replaceAudio;
audio.addEventListener('error',audioFailed);
function buildTimeline(){
 var root=$('timeline');root.replaceChildren();var prev=0;
 lengths.forEach(function(end,i){
   var part=document.createElement('span');part.className='bits-segment';
   part.style.flex=String(end-prev)+' 1 0';
   part.classList.toggle('unlocked',!!active&&(active.finished||i<=active.guesses.length));
   var fill=document.createElement('i');fill.className='bits-segment-fill';part.appendChild(fill);root.appendChild(part);prev=end;
 });updateTimeline();
}
// O tempo real do áudio controla a barra e o limite; pular não interrompe.
audio.addEventListener('timeupdate',function(){
 updateTimeline();if(active&&!active.finished&&!audio.paused&&audio.currentTime>=durationLimit()-0.015)pauseAudio();
});
audio.addEventListener('ended',function(){pauseAudio()});
function play(){
 if(!active)return;
 if(recoveringSong){message('Aguarde o carregamento da prévia…');return}
 // Ao clicar de novo, o trecho reinicia desde o começo, mesmo se já estiver tocando.
 try{audio.currentTime=0}catch(e){}
 updateTimeline();
 var token=audioToken,p=audio.play();if(p&&p.catch)p.catch(function(){if(token===audioToken)audioFailed()});
 $('playAudio').textContent='↻ Ouvir novamente';
}
function applyVolume(){
 audio.volume=volume;audio.muted=muted||volume===0;
 $('volumeAudio').value=String(Math.round(volume*100));
 $('volumeLabel').textContent=(audio.muted?'0':Math.round(volume*100))+'%';
 $('muteAudio').textContent=audio.muted?'🔇':'🔊';
 $('muteAudio').setAttribute('aria-label',audio.muted?'Ativar som':'Silenciar');
 $('muteAudio').title=audio.muted?'Ativar som':'Silenciar';
 storageSet(volumeKey,String(volume));storageSet(muteKey,muted?'1':'0');
}
var volume=parseFloat(storageGet(volumeKey));if(!Number.isFinite(volume)||volume<0||volume>1)volume=.8;
var muted=storageGet(muteKey)==='1';
$('volumeAudio').oninput=function(){volume=Number(this.value)/100;if(volume>0)muted=false;applyVolume()};
$('muteAudio').onclick=function(){muted=!muted;if(!muted&&volume===0)volume=.5;applyVolume()};
applyVolume();
function message(msg){$('message').textContent=msg}
function guessOptions(){return active.daily?active.pool:(byCat[active.cat]||[])}
function showSuggestions(){
 var list=$('suggestions');list.replaceChildren();if(!active||active.finished)return;
 var value=norm($('guessInput').value);$('guessInput').setAttribute('aria-expanded','false');
 if(!value){list.classList.remove('open');return}
 // Não sugere músicas já escolhidas nesta rodada, inclusive em partidas diárias retomadas.
 var tried=new Set(active.guesses.filter(function(id){return id!=='__skip__'}));
 var options=guessOptions().filter(function(s){return !tried.has(s.id)&&norm(s.label).includes(value)}).slice(0,12);
 if(!options.length){list.classList.remove('open');var s=musicLoader.state(active.cat);$('selectedText').textContent=s.complete?'Nenhuma música encontrada.':s.error?'Busca incompleta: retome o carregamento no contador de músicas.':'Buscando nas músicas que ainda estão chegando…';return}
 $('selectedText').textContent='Selecione uma música da lista.'+(musicLoader.state(active.cat).complete?'':' A lista continua carregando.');
 options.forEach(function(song){var b=document.createElement('button');b.type='button';b.className='bits-choice';b.setAttribute('role','option');b.textContent=song.label;b.onclick=function(){selected=song;$('guessInput').value=song.label;$('selectedText').textContent='Selecionada: '+song.label;$('submitGuess').disabled=false;list.classList.remove('open');$('guessInput').setAttribute('aria-expanded','false')};list.appendChild(b)});
 list.classList.add('open');$('guessInput').setAttribute('aria-expanded','true');
}
function renderRound(){
 if(!active)return;
 var attempts=active.guesses.length;
 $('attemptLabel').textContent=active.finished?'Finalizado':(attempts+1)+' / '+maxAttempts;
 $('clipLength').textContent=clipDuration()+' s';
 buildTimeline();
 var box=$('history');box.replaceChildren();active.guesses.forEach(function(id,index){var line=document.createElement('div');line.className='bits-history-line';
 var song=(byCat[active.cat]||[]).find(function(s){return s.id===id});line.textContent=(index+1)+'. '+(id==='__skip__'?'Pulou a tentativa':song?song.label:'Palpite registrado');
 if(id===active.song.id)line.style.borderColor='var(--ok)';
 else if(song&&norm(song.artist)===norm(active.song.artist)){
   line.classList.add('same-artist');
   var hint=document.createElement('small');hint.textContent='✓ Artista correto — música incorreta';line.appendChild(hint);
 }
 box.appendChild(line)});
 $('guessInput').value='';selected=null;$('submitGuess').disabled=true;$('selectedText').textContent='Selecione uma música da lista.';$('suggestions').classList.remove('open');
 if(!active.finished)message('Você pode ouvir o trecho quantas vezes quiser antes de responder.');
}
function submit(skip){
 if(!active||active.finished||(!skip&&!selected))return;
 var id=skip?'__skip__':selected.id;
 // Proteção extra: um palpite já enviado não pode consumir outra tentativa.
 if(!skip&&active.guesses.indexOf(id)!==-1){
   selected=null;$('submitGuess').disabled=true;$('guessInput').value='';
   $('selectedText').textContent='Selecione uma música da lista.';
   $('suggestions').classList.remove('open');
   message('Você já tentou essa música. Escolha outra.');return;
 }
 active.guesses.push(id);
 if(active.guesses.length===3)bitsSupportCollapsed(true);
 // Um pulo ou palpite incorreto amplia o trecho sem reiniciar o áudio.
 // Se o trecho anterior já terminou, a próxima reprodução começa do início.
 if(!skip)pauseAudio();
 if(id===active.song.id){active.won=true;active.finished=true}else if(active.guesses.length>=maxAttempts)active.finished=true;
 if(active.finished)recordFinish();dailySave();renderRound();
 if(active.finished)showFinish();else message(skip?'Tentativa pulada. Agora o trecho ficou maior.':'Não foi dessa vez. Ouça um trecho maior!');
}
function recordFinish(){if(!active||active.recorded)return;HUBA.recordPlayedGame('bits');var st=getStats();st.games=(st.games||0)+1;if(active.won)st.wins=(st.wins||0)+1;saveStats(st);active.recorded=true;
 // Streak somente para conclusão de desafio diário, uma vez por data, independentemente da categoria.
 if(active.daily)HUBA.recordDailyStreak('bits');renderStats();}
function showFinish(){$('replaceAudio').classList.add('hidden');stopAudio();$('guessArea').classList.add('hidden');$('finish').classList.remove('hidden');
 $('finishTitle').textContent=active.won?'Você acertou! 🎉':'Fim das tentativas';
 $('finishSong').textContent='Música: '+active.song.label;
 $('finishDetail').textContent=active.won?'Acertou em '+active.guesses.length+' de '+maxAttempts+' tentativas.':'Você pode tentar outra música no modo Aleatório.';
 $('playAgain').classList.toggle('hidden',active.daily);
}
function back(){pauseCatalog();audioToken++;bitsSupportCollapsed(false);$('replaceAudio').classList.add('hidden');stopAudio();if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null}roundId++;active=null;$('bitsGame').classList.add('hidden');$('bitsHome').classList.remove('hidden');if(supportToggle)supportToggle.hidden=true;drawTiles();renderStats()}
document.addEventListener('keydown',function(e){
 if(e.key!=='Escape')return;
 if($('bitsGame').classList.contains('hidden')){
   return;
 }
 e.preventDefault();back();
});
$('backGame').onclick=back;$('finishBack').onclick=back;$('playAgain').onclick=function(){if(active&&!active.daily){var cat=active.cat;enterCategory(cat,false)}};
$('playAudio').onclick=play;$('skipGuess').onclick=function(){submit(true)};$('submitGuess').onclick=function(){submit(false)};
$('guessInput').addEventListener('input',function(){selected=null;$('submitGuess').disabled=true;$('selectedText').textContent='Selecione uma música da lista.';showSuggestions()});
// Enter: prioriza completar a pesquisa quando a lista estiver aberta.
// Com a lista fechada e uma faixa já selecionada, confirma o palpite
// mesmo que o campo de pesquisa não esteja com o foco.
document.addEventListener('keydown',function(e){
 if(e.key!=='Enter'||e.repeat||e.isComposing||!active||active.finished||$('bitsGame').classList.contains('hidden'))return;
 var tag=e.target&&e.target.tagName;
 // Não interfere no Enter nativo sobre outros botões e controles.
 if(tag==='BUTTON'||tag==='SELECT'||tag==='TEXTAREA'||(e.target&&e.target.isContentEditable))return;
 var list=$('suggestions');
 if(list.classList.contains('open')){
   var first=list.querySelector('button');
   if(first){e.preventDefault();first.click()}
   return;
 }
 if(selected){e.preventDefault();submit(false)}
});
renderStats();initCatalog();
})();
