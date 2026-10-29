(function(){
'use strict';
var MAX_CLIP=30, MIN_CLIP=1.5, MAX_OPTIONS=15, BASE_REDUCTION=.05, RECORD_KEY='huba:streakal:records:v1', GAMES_KEY='huba:streakal:games:v1';
var $=function(s){return document.querySelector(s)};
var dayKey=HUBA.dayKey,hash=HUBA.hash,mulberry=HUBA.mulberry,shuffle=HUBA.shuffle,norm=HUBA.norm;
var byGenre={},musicLoading=true;
var cur=null, audio=new Audio(),timer=null,raf=null,playRequest=0,metadataReady=false,startSec=0,invalidSongs={},audioFailures=0,audioFailTimer=null, songLoadToken=0, songReady=Promise.resolve(), recoveredCurrentSong=false;
var waitingCatalog=false,waitingReplacement=false,recoveringCurrentSong=false;
var volume=0.8,muted=false;
try{var stored=parseFloat(localStorage.getItem('musicle:vol'));if(isFinite(stored)&&stored>=0&&stored<=1)volume=stored;muted=localStorage.getItem('musicle:muted')==='1'}catch(e){}
function applyVol(){audio.volume=volume;audio.muted=muted;$('#vol').value=volume*100;$('#volLabel').textContent=(muted?0:Math.round(volume*100))+'%';$('#muteBtn').textContent=muted?'🔇':'🔊';try{localStorage.setItem('musicle:vol',String(volume));localStorage.setItem('musicle:muted',muted?'1':'0')}catch(e){}}
$('#vol').oninput=function(){volume=this.value/100;if(volume>0)muted=false;applyVol()};
$('#muteBtn').onclick=function(){muted=!muted;if(!muted&&volume===0)volume=.5;applyVol()};applyVol();
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function poolOf(g){return byGenre[g]||[]}
function gName(g){return cap(g)}
function readJSON(k,def){try{return JSON.parse(localStorage.getItem(k))||def}catch(e){return def}}
function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function records(){return readJSON(RECORD_KEY,{})}
function best(g){return records()[g]||0}
function saveBest(g,n){var r=records();if(n>(r[g]||0)){r[g]=n;writeJSON(RECORD_KEY,r)}}
function dailyKey(g){return 'huba:streakal:daily:'+dayKey()+':'+g}
function renderHome(){
  $('#statDailyStreak').textContent=HUBA.currentStreak('streakal');
  ['Daily'].forEach(function(mode){var daily=HUBA.isDaily,box=$('#tiles'+mode);box.innerHTML='';
    var keys=configuredGenres();
    keys.forEach(function(g){var pool=poolOf(g),b=document.createElement('button');b.type='button';b.className='tile';
      var st=daily?readJSON(dailyKey(g),null):null;
      b.innerHTML='<span class="tname"><span class="tn"></span><em class="tacc"></em></span><small></small>';
      b.querySelector('.tn').textContent=gName(g);
      b.querySelector('.tacc').textContent='Recorde: '+best(g);
      b.lastChild.textContent=musicLoading&&loadingChoice&&loadingChoice.genre===g&&loadingChoice.daily===daily?'Carregando gênero…':st&&st.done?'Feito · '+st.score+' acertos':loadedGenres[g]&&pool.length<2?'Precisa de 2+ músicas':'';
      if(st&&st.done)b.classList.add('done');
      b.disabled=!!(musicLoading&&loadingChoice&&loadingChoice.genre===g&&loadingChoice.daily===daily);
      b.onclick=function(){enterGenre(daily,g)};box.appendChild(b);
    });
  });
}
/* Catálogo incremental: índices já usados pela partida nunca são reordenados. */
var musicLoader=HUBAPlaylists.create({
  sources:window.HUBA_MUSICAS&&window.HUBA_MUSICAS.fontes||[],artistLimit:8,
  onUpdate:function(s){
    byGenre[s.genre]=s.songs;loadedGenres[s.genre]=s.complete;
    if(selectedGenre===s.genre){
      musicLoader.paint($('#summary'),s);musicLoader.paint($('#gameCatalogCount'),s);
      if(cur&&!cur.daily&&cur.genre===s.genre)cur.pool=s.songs;
      if(s.error)$('#dzStatus').textContent='Carregamento pausado. As músicas já obtidas continuam disponíveis.';
      renderHome();
    }
  }
});
var loadedGenres={},selectionToken=0,loadingChoice=null,selectedGenre=null;
function configuredGenres(){return musicLoader.genres()}
function initCatalog(){
  musicLoading=false;
  $('#dzStatus').textContent=configuredGenres().length?'':'Nenhuma fonte configurada em playlists.js.';
  $('#summary').textContent='As músicas são carregadas ao escolher o gênero.';renderHome();
}
function enterGenre(daily,g){
  var token=++selectionToken;selectedGenre=g;
  musicLoading=true;loadingChoice={genre:g,daily:daily};renderHome();
  $('#dzStatus').textContent=daily?'Preparando o catálogo completo para manter o desafio diário igual para todos…':'Carregando músicas de '+gName(g)+'…';
  musicLoader.select(g,2,daily).then(function(s){
    if(token!==selectionToken)return;
    musicLoading=false;loadingChoice=null;
    if(s.songs.length<2)throw new Error('Poucas músicas disponíveis nesta categoria.');
    $('#dzStatus').textContent=s.error?'Algumas páginas falharam. Você pode retomar o carregamento.':'';
    renderHome();openGame(daily,g);musicLoader.paint($('#gameCatalogCount'),s);
  }).catch(function(err){
    if(token!==selectionToken||err.name==='AbortError')return;
    musicLoading=false;loadingChoice=null;
    $('#dzStatus').textContent=(daily?'O diário precisa de todas as páginas. ':'')+(err.message||'Falha ao carregar gênero. Clique novamente para tentar.');renderHome();
  });
}
function pauseCatalog(){selectionToken++;musicLoader.pause();musicLoading=false;loadingChoice=null;if(selectedGenre){musicLoader.paint($('#summary'),musicLoader.state(selectedGenre))}}
window.addEventListener('pagehide',pauseCatalog);

function newRun(daily,g){return {genre:g,daily:daily,pool:daily?musicLoader.snapshot(g):poolOf(g),score:0,optionCount:2,clip:MAX_CLIP,consecutiveShorter:0,penaltyNotice:'',used:[],round:0,pending:false,ended:false,locked:false,answer:null,options:[],rng:daily?mulberry(hash(dayKey()+'|streakal|'+g+'|'+poolOf(g).length)):Math.random}}
/* Painel de apoio recolhível exclusivo do Streakal, a partir da 4ª rodada. */
var streakalSupportToggle=null;
function streakalSupportSetCollapsed(collapsed){
  var panel=document.querySelector('.huba-support');
  if(!panel)return;
  if(!streakalSupportToggle){
    streakalSupportToggle=document.createElement('button');
    streakalSupportToggle.type='button';
    streakalSupportToggle.className='streakal-support-toggle';
    streakalSupportToggle.setAttribute('aria-controls','streakal-support-panel');
    panel.id='streakal-support-panel';
    streakalSupportToggle.onclick=function(){streakalSupportSetCollapsed(!document.body.classList.contains('streakal-support-collapsed'))};
    document.body.appendChild(streakalSupportToggle);
  }
  document.body.classList.toggle('streakal-support-collapsed',collapsed);
  var eligible=!!cur&&cur.round>=4&&!$('#play').classList.contains('hidden');
  streakalSupportToggle.hidden=!eligible;
  streakalSupportToggle.textContent=collapsed?'⌃':'⌄';
  streakalSupportToggle.setAttribute('aria-expanded',String(!collapsed));
  streakalSupportToggle.setAttribute('aria-label',collapsed?'Mostrar apoio ao HUBA':'Recolher apoio ao HUBA');
  streakalSupportToggle.title=collapsed?'Mostrar doações':'Recolher doações';
}
function openGame(daily,g){
  musicLoader.select(g,2,daily).catch(function(){});waitingCatalog=false;
  $('#gameCatalogCount').textContent=poolOf(g).length.toLocaleString('pt-BR')+' músicas carregadas neste gênero';
  $('#home').classList.add('hidden');$('#play').classList.remove('hidden');$('#play').classList.remove('is-result');
  $('#playTitle').textContent='Streakal · '+gName(g);$('#playSub').textContent=(daily?'Desafio diário':'Treino')+' · Acerte até errar. Cada acerto exige uma escolha de dificuldade permanente.';
  cur=newRun(daily,g);invalidSongs={};audioFailures=0;streakalSupportSetCollapsed(false);updateLimitDisplay();
  // Desafios diários concluídos não podem reiniciar o placar nesse dia.
  var prev=daily?readJSON(dailyKey(g),null):null;
  if(prev&&prev.done){cur.score=prev.score;cur.ended=true;showResult(true);return}
  nextQuestion();
}
function pickAnswer(){
  var available=cur.pool.map(function(_,i){return i}).filter(function(i){return cur.used.indexOf(i)<0&&!invalidSongs[i]});
  if(!available.length){cur.used=[];available=cur.pool.map(function(_,i){return i}).filter(function(i){return !invalidSongs[i]})}
  if(!available.length)return null;
  var idx=available[Math.floor(cur.rng()*available.length)];cur.used.push(idx);return idx;
}
function stop(){
  playRequest++;clearTimeout(audioFailTimer);audioFailTimer=null;audio.onplaying=null;
  audio.pause();clearTimeout(timer);cancelAnimationFrame(raf);
  $('#fill').style.transform='scaleX(0)';$('#playBtn').textContent='Tocar trecho';
}
function formatSec(n){return n>=1?n.toFixed(n<10?2:1).replace(/0+$/,'').replace(/\.$/,''):n.toFixed(3)}
// Renova o link de áudio pelo ID da faixa, sem recarregar playlists.
// Algumas prévias do Deezer são temporárias e podem deixar de funcionar após inatividade.
function freshPreview(song){
  if(!song.id)return Promise.resolve(song.url);
  return HUBADeezer.request('https://api.deezer.com/track/'+encodeURIComponent(song.id),null,true).then(function(data){
    if(!data||!data.preview)throw new Error('Prévia indisponível');
    song.url=data.preview;
    return song.url;
  });
}
function loadAudioSource(url, token){
  if(token!==songLoadToken||!cur||cur.ended)return;
  metadataReady=false;startSec=0;cur.effectiveClip=cur.clip;
  audio.onloadedmetadata=function(){
    if(token!==songLoadToken||!cur)return;
    metadataReady=true;
    var d=audio.duration;
    cur.effectiveClip=isFinite(d)&&d>0?Math.min(cur.clip,d):cur.clip;
    $('#runSettings').textContent=cur.options.length+' opções · '+formatSec(cur.effectiveClip)+' s';
  };
  audio.preload='auto';audio.src=url;audio.load();
}
function setSong(song){
  var token=++songLoadToken;
  recoveredCurrentSong=false;
  recoveringCurrentSong=false;
  metadataReady=false;startSec=0;
  audio.removeAttribute('src');audio.load();
  // A renovação começa ao abrir cada pergunta, inclusive após longa inatividade.
  songReady=freshPreview(song).catch(function(){
    // Se a API estiver temporariamente indisponível, ainda podemos tentar a URL anterior.
    return song.url;
  }).then(function(url){
    if(token!==songLoadToken||!cur||cur.ended)return false;
    if(!url)throw new Error('Sem prévia disponível');
    loadAudioSource(url,token);
    return true;
  });
  // A promessa é tratada pelo Play, evitando rejeições não observadas.
  songReady.catch(function(){});
}
function failAudio(){
  if(!cur||cur.ended||cur.pending||$('#play').classList.contains('hidden'))return;
  if(recoveringCurrentSong)return;
  stop();
  // Antes de descartar a faixa, busca um link novo uma única vez.
  if(!recoveredCurrentSong&&cur.answer!==null&&cur.pool[cur.answer].id){
    recoveredCurrentSong=true;
    recoveringCurrentSong=true;
    var token=++songLoadToken, song=cur.pool[cur.answer];
    $('#qhint').textContent='Atualizando a prévia desta música…';
    songReady=freshPreview(song).then(function(url){
      if(token!==songLoadToken||!cur||cur.ended)return false;
      recoveringCurrentSong=false;
      loadAudioSource(url,token);
      $('#qhint').textContent='Prévia atualizada. Tente tocar novamente.';
      return true;
    }).catch(function(){
      if(token===songLoadToken){recoveringCurrentSong=false;replaceFailedSong()}
      return false;
    });
    return;
  }
  replaceFailedSong();
}
function replaceFailedSong(){
  if(!cur||cur.ended||cur.pending)return;
  stop();songLoadToken++;
  if(audioFailures<5){
    audioFailures++;
    invalidSongs[cur.answer]=true;
    nextQuestion(true);
    $('#qhint').textContent='Prévia indisponível. Música substituída sem perder sua sequência.';
  }else{
    $('#qhint').textContent='Não foi possível carregar esta prévia. Sorteie outra música sem perder sua sequência.';
    $('#replaceSong').classList.remove('hidden');
  }
}
audio.addEventListener('error',function(){
  // Não interpretar a remoção intencional de src durante uma troca como falha.
  if(audio.getAttribute('src'))failAudio();
});
function replaceSong(){if(!cur||cur.ended)return;if(waitingCatalog){waitForCatalog(waitingReplacement);return}audioFailures=0;invalidSongs[cur.answer]=true;stop();songLoadToken++;nextQuestion(true)}
$('#replaceSong').onclick=replaceSong;
function playClip(){
  if(!cur||cur.pending||cur.ended)return;
  stop();var request=playRequest;
  $('#playBtn').textContent='Parar';
  // O tempo de espera inclui a obtenção de um URL atualizado.
  audioFailTimer=setTimeout(function(){if(request===playRequest)failAudio()},15000);
  Promise.resolve(songReady).then(function(ready){
    if(request!==playRequest||ready===false)return;
    if(!audio.getAttribute('src')){failAudio();return}
    function begin(){
      if(request!==playRequest)return;
      try{audio.currentTime=startSec}catch(e){failAudio();return}
      function start(){
        if(request!==playRequest)return;
        var duration=cur.effectiveClip||cur.clip;
        audio.onplaying=function(){
          if(request!==playRequest)return;
          clearTimeout(audioFailTimer);audioFailures=0;
          var t0=performance.now();timer=setTimeout(function(){if(request===playRequest)stop()},duration*1000);
          (function tick(t){if(request!==playRequest)return;
            $('#fill').style.transform='scaleX('+Math.min(1,(t-t0)/(duration*1000))+')';
            if(t-t0<duration*1000)raf=requestAnimationFrame(tick)
          })(t0);
        };
        var p=audio.play();if(p&&p.catch)p.catch(function(){if(request===playRequest)failAudio()});
      }
      if(audio.seeking)audio.addEventListener('seeked',function done(){audio.removeEventListener('seeked',done);start()},{once:true});
      else start();
    }
    if(metadataReady)begin();
    else audio.addEventListener('loadedmetadata',function ready(){audio.removeEventListener('loadedmetadata',ready);begin()},{once:true});
  }).catch(function(){if(request===playRequest)failAudio()});
}
$('#playBtn').onclick=function(){if(HUBA_I18N.isText($('#playBtn'),'Parar'))stop();else playClip()};
function makeCard(song){var b=document.createElement('button');b.type='button';b.className='opt musical-option';
  var cover=document.createElement('span');cover.className='musical-cover';var fallback=document.createElement('span');fallback.className='musical-cover-fallback';fallback.textContent='♫';cover.appendChild(fallback);
  if(song.cover){var img=document.createElement('img');img.src=song.cover;img.alt='';img.loading='lazy';img.onerror=function(){img.remove()};cover.appendChild(img)}
  var text=document.createElement('span'), title=document.createElement('strong'), artist=document.createElement('span');
  text.className='musical-option-info';title.className='musical-option-title';artist.className='musical-option-artist';
  title.textContent=song.title||song.label;artist.textContent=song.artist||'';text.appendChild(title);text.appendChild(artist);b.appendChild(cover);b.appendChild(text);b.setAttribute('aria-label',song.label);return b;
}
function nextQuestion(replacement){
  var s=musicLoader.state(cur.genre);
  if(!cur.daily&&!s.complete&&cur.pool.length<Math.max(2,cur.optionCount)){waitForCatalog(replacement);return}
  stop();songLoadToken++;if(!replacement)audioFailures=0;cur.pending=false;cur.locked=false;$('#quiz').classList.remove('hidden');$('#result').classList.add('hidden');$('#opts').classList.remove('hidden');$('#upgradePanel').classList.add('hidden');$('#replaceSong').classList.add('hidden');
  $('#replaceSong').textContent='Sortear outra música';
  var answer=pickAnswer();if(answer===null){
    if(!cur.daily&&!s.complete){waitForCatalog(replacement,cur.pool.length+1);return}
    $('#qhint').textContent='Nenhuma prévia disponível. Tente novamente sem perder sua sequência.';
    $('#opts').textContent='';$('#replaceSong').classList.remove('hidden');invalidSongs={};cur.locked=true;return;
  }cur.answer=answer;
  if(!replacement)cur.round++;
  if(cur.round===4&&!replacement)streakalSupportSetCollapsed(true);
  var others=shuffle(cur.pool.map(function(_,i){return i}).filter(function(i){return i!==answer&&!invalidSongs[i]}),cur.rng).slice(0,Math.max(1,cur.optionCount-1));
  cur.options=shuffle([answer].concat(others),cur.rng);
  $('#qcount').textContent='Sequência: '+cur.score+' · Rodada '+cur.round;
  updateLimitDisplay();
  $('#runSettings').textContent=cur.options.length+' opções · '+formatSec(cur.clip)+' s';
  $('#qhint').textContent=cur.penaltyNotice||'Qual música tocou?';
  cur.penaltyNotice='';
  setSong(cur.pool[answer]);
  var box=$('#opts');box.innerHTML='';box.style.setProperty('--option-columns',Math.min(5,cur.options.length));box.style.setProperty('--mobile-columns',Math.min(2,cur.options.length));
  cur.options.forEach(function(i){var b=makeCard(cur.pool[i]);b.onclick=function(){answerQuestion(i)};box.appendChild(b)});
}
// Esperar músicas não altera o placar, o número da rodada nem os debuffs.
function waitForCatalog(replacement,min){
  var run=cur,token=selectionToken;
  waitingCatalog=true;waitingReplacement=replacement;cur.locked=true;
  $('#opts').textContent='';$('#upgradePanel').classList.add('hidden');$('#replaceSong').classList.add('hidden');
  $('#qhint').textContent='Carregando músicas para a próxima rodada. Sua sequência está preservada…';
  musicLoader.ensure(run.genre,min||Math.max(2,run.optionCount),false).then(function(){
    if(cur!==run||token!==selectionToken||run.ended)return;
    waitingCatalog=false;nextQuestion(replacement);
  }).catch(function(e){
    if(cur!==run||token!==selectionToken||e.name==='AbortError')return;
    $('#qhint').textContent='Não foi possível carregar a próxima rodada. Tente novamente sem perder sua sequência.';
    $('#replaceSong').textContent='Tentar carregar novamente';$('#replaceSong').classList.remove('hidden');
  });
}
// A duração nunca fica menor do que 1,5 segundo, e não há mais que 15 opções.
function maxOptions(){return !cur.daily&&!musicLoader.state(cur.genre).complete?MAX_OPTIONS:Math.min(MAX_OPTIONS,cur.pool.length)}
function minTimeReached(){return cur.clip<=MIN_CLIP+1e-8}
function maxOptionsReached(){return cur.optionCount>=maxOptions()}
function updateLimitDisplay(){
  var timeMin=!!cur&&minTimeReached(), optionsMax=!!cur&&maxOptionsReached();
  var tags=[];
  if(timeMin)tags.push('Tempo mínimo: 1,5 s');
  if(optionsMax)tags.push(cur.optionCount>=MAX_OPTIONS?'Máximo de 15 alternativas':'Máximo de músicas disponíveis: '+maxOptions());
  $('#limitStatus').textContent=tags.join(' · ');
  $('#limitStatus').classList.toggle('hidden',!tags.length);
  $('#play').classList.toggle('streakal-maxed',timeMin&&optionsMax);
}
// A partir da terceira redução consecutiva, a taxa cresce 50% a cada escolha.
// Ex.: 5%, 5%, 7,5%, 11,25%, 16,875% ...
function shorterReduction(consecutive){return consecutive<3?BASE_REDUCTION:Math.min(.95,BASE_REDUCTION*Math.pow(1.5,consecutive-2))}
// O risco começa na terceira redução consecutiva: 9%, 12%, 15%...
// Cada escolha consecutiva acumula 3 pontos percentuais de risco.
function extraOptionChance(consecutive){return consecutive<3?0:Math.min(1,consecutive*.03)}
function formatPercent(n){return (n*100).toLocaleString('pt-BR',{maximumFractionDigits:3})+'%'}
function applyShorter(reduction,applyPenalty){
  cur.clip=Math.max(MIN_CLIP,cur.clip*(1-reduction));
  if(applyPenalty){
    var chance=extraOptionChance(cur.consecutiveShorter);
    if(chance>0&&cur.rng()<chance&&!maxOptionsReached()){
      cur.optionCount++;
      cur.penaltyNotice='Punição ativada! Chance de '+formatPercent(chance)+': +1 alternativa adicionada. Qual música tocou?';
    }else cur.penaltyNotice='';
  }else cur.penaltyNotice='';
}
function autoDifficultyIfLimited(){
  if(minTimeReached()&&maxOptionsReached()){
    // Ambos os limites foram atingidos: avança sem alterar a dificuldade.
    cur.penaltyNotice='Limites máximos atingidos! Qual música tocou?';
  }else if(minTimeReached()){
    // Tempo já no mínimo: a única penalidade possível é acrescentar uma opção.
    cur.optionCount++;
    cur.penaltyNotice='Tempo mínimo atingido: +1 alternativa automática. Qual música tocou?';
  }else if(maxOptionsReached()){
    // Opções no máximo: aplica apenas a redução BASE de 5%, sem sorteios.
    cur.clip=Math.max(MIN_CLIP,cur.clip*(1-BASE_REDUCTION));
    cur.penaltyNotice='Máximo de alternativas: trecho reduzido automaticamente em 5%. Qual música tocou?';
  }else return false;
  cur.pending=false;
  nextQuestion(false);
  return true;
}
function answerQuestion(i){if(!cur||cur.locked||cur.pending||cur.ended)return;cur.locked=true;stop();
  var correct=i===cur.answer,buttons=$('#opts').querySelectorAll('button');
  cur.options.forEach(function(idx,k){buttons[k].disabled=true;if(idx===cur.answer)buttons[k].classList.add('right');else if(idx===i)buttons[k].classList.add('wrong')});
  if(!correct){$('#qhint').textContent='Errou! Fim da sequência.';endRun(false);return}
  cur.score++;saveBest(cur.genre,cur.score);$('#qcount').textContent='Sequência: '+cur.score+' · Rodada '+cur.round;
  // Quando apenas uma dificuldade é possível, não mostra os botões.
  if(autoDifficultyIfLimited())return;
  $('#qhint').textContent='Acertou! Escolha a dificuldade para a próxima rodada.';cur.pending=true;$('#opts').classList.add('hidden');$('#upgradePanel').classList.remove('hidden');
  $('#extraOption').disabled=false;
  $('#extraOption').textContent='+1 alternativa na próxima rodada ('+(cur.optionCount+1)+')';
  var nextConsecutive=cur.consecutiveShorter+1;
  var reduction=shorterReduction(nextConsecutive);
  var extraChance=extraOptionChance(nextConsecutive);
  $('#shorterClip').textContent='Trecho '+formatPercent(reduction)+' menor ('+formatSec(Math.max(MIN_CLIP,cur.clip*(1-reduction)))+' s)'+(extraChance?' · '+formatPercent(extraChance)+' de chance de +1 alternativa':'');
  $('#upgradePanel').scrollIntoView({behavior:'smooth',block:'center'});
}
function upgrade(type){if(!cur||!cur.pending||cur.ended)return;
  if(type==='extra'){
    if(maxOptionsReached())return;
    cur.optionCount++;
    cur.consecutiveShorter=0; // Só uma escolha voluntária de +1 alternativa reseta o debuff.
    cur.penaltyNotice='';
  }else if(type==='shorter'){
    cur.consecutiveShorter++;
    applyShorter(shorterReduction(cur.consecutiveShorter),true);
  }else return;
  nextQuestion(false);
}
$('#extraOption').onclick=function(){upgrade('extra')};$('#shorterClip').onclick=function(){upgrade('shorter')};
function endRun(exhausted){if(!cur||cur.ended)return;cur.ended=true;stop();songLoadToken++;saveBest(cur.genre,cur.score);
  HUBA.recordPlayedGame('streakal');
  var games=readJSON(GAMES_KEY,{n:0});games.n=(games.n||0)+1;writeJSON(GAMES_KEY,games);
  if(cur.daily){
    writeJSON(dailyKey(cur.genre),{done:true,score:cur.score});
    HUBA.recordDailyStreak('streakal'); // Conta no máximo um dia, independente do gênero.
  }
  showResult(false,exhausted);
}
function showResult(revisit,exhausted){stop();$('#quiz').classList.add('hidden');$('#result').classList.remove('hidden');$('#play').classList.add('is-result');
  $('#resultTitle').textContent=revisit?'Desafio de hoje concluído':'Sequência encerrada: '+cur.score+' acertos';
  $('#resultInfo').textContent=(revisit?'Sua sequência diária: '+cur.score+'. ':'')+'Recorde em '+gName(cur.genre)+': '+best(cur.genre)+'.'+(exhausted?' Não há mais músicas disponíveis.':'');
  var box=$('#lastSong');box.innerHTML='';if(!revisit&&cur.answer!==null){var card=makeCard(cur.pool[cur.answer]);card.disabled=true;box.appendChild(card)}
  $('#again').classList.toggle('hidden',cur.daily);
}
function goHome(){pauseCatalog();stop();songLoadToken++;$('#play').classList.add('hidden');$('#play').classList.remove('is-result');$('#home').classList.remove('hidden');streakalSupportSetCollapsed(false);renderHome()}
$('#backBtn').onclick=goHome;$('#backBtn2').onclick=goHome;
$('#again').onclick=function(){openGame(false,cur.genre)};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('#play').classList.contains('hidden')){e.preventDefault();goHome()}});
initCatalog();
document.addEventListener('huba:mode',function(){pauseCatalog();if(!$('#play').classList.contains('hidden'))goHome();else renderHome();});
})();
