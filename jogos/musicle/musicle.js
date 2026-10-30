(function(){

var CLIP=7, NQ=5;
var SKIP_FRAC=0.25, SKIP_MAX=60;   // o trecho nunca começa nos primeiros 25% da música (no máximo 60 s), por causa de introduções longas
  var STATS_KEY='playhub:musicle:stats:v1', HISTORY_KEY='playhub:musicle:recent:v1';
var $=function(s){return document.querySelector(s)};
var dayKey=HUBA.dayKey, hash=HUBA.hash, mulberry=HUBA.mulberry, shuffle=HUBA.shuffle, norm=HUBA.norm, recordDailyStreak=HUBA.recordDailyStreak;
var byGenre={},musicLoading=true;
var cur=null;
var audio=new Audio(), objUrl=null, stopTimer=null, raf=null, startSec=0;
var metadataReady=false, playRequest=0;
var failedAnswers={};
var audioToken=0,recoveredSong=false,recoveringSong=false;

/* ---------- volume ---------- */
var vol=0.8, muted=false;
try{
  var sv=parseFloat(localStorage.getItem('musicle:vol'));
  if(!isNaN(sv)&&sv>=0&&sv<=1)vol=sv;
  muted=localStorage.getItem('musicle:muted')==='1';
}catch(e){}
function applyVol(){
  var off=muted||vol===0;
  audio.volume=vol; audio.muted=off;
  $('#vol').value=Math.round(vol*100);
  $('#volLabel').textContent=(off?0:Math.round(vol*100))+'%';
  $('#muteBtn').textContent=off?'🔇':'🔊';
  $('#muteBtn').setAttribute('aria-label',off?'Ativar som':'Silenciar');
  $('#muteBtn').title=off?'Ativar som':'Silenciar';
  try{localStorage.setItem('musicle:vol',String(vol)); localStorage.setItem('musicle:muted',muted?'1':'0')}catch(e){}
}
$('#vol').oninput=function(){vol=this.value/100; if(vol>0)muted=false; applyVol()};
$('#muteBtn').onclick=function(){muted=!muted; if(!muted&&vol===0)vol=0.5; applyVol()};
applyVol();

/* ---------- utilidades ---------- */
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function poolOf(g){return byGenre[g]||[]}
function gName(g){return cap(g)}
  function storeKey(g,date){return 'musicle4:'+(date||dayKey())+':'+g+':'+CLIP}
  function readState(g){try{var r=localStorage.getItem(storeKey(g))||localStorage.getItem('musicle3:'+dayKey()+':'+g+':'+poolOf(g).length+':'+CLIP); return r?JSON.parse(r):null}catch(e){return null}}
  function nq(pool){return Math.min(NQ,pool.length)}
  function optionCount(){return CLIP===1.5?5:4}
  function modeOf(){return CLIP===1.5?'hard':'casual'}
  function modeName(){return CLIP===1.5?'Desafiador':'Casual'}
  function fmtSec(n){return String(n).replace('.',',')}
  function readStats(){try{return JSON.parse(localStorage.getItem(STATS_KEY))||{games:0}}catch(e){return {games:0}}}
  function saveStats(st){try{localStorage.setItem(STATS_KEY,JSON.stringify(st))}catch(e){}}
  function renderStats(){
    $('#statDailyStreak').textContent=HUBA.currentStreak('musicle');
  }
  function genreAcc(g){
    var st=readStats(), r=st.genres&&st.genres[modeOf()+'|'+g];
    return (r&&r.q)?Math.round(r.c/r.q*100)+'%':'—';
  }
  function recordStats(){
    if(!cur||cur.statsRecorded)return;
    var st=readStats(), k=modeOf()+'|'+cur.genre;
    st.games=(st.games||0)+1;
    st.genres=st.genres||{}; st.genres[k]=st.genres[k]||{q:0,c:0};
    st.genres[k].q+=cur.qs.length; st.genres[k].c+=cur.score;
    saveStats(st); cur.statsRecorded=true; renderStats();
  }
  function readHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[]}catch(e){return []}}
  function saveHistory(arr){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(arr.slice(-12)))}catch(e){}}
  function setDifficulty(seconds){if(!$('#play').classList.contains('hidden'))goHome();CLIP=seconds; $('#clipHard').classList.toggle('selected',CLIP===1.5); $('#clipCasual').classList.toggle('selected',CLIP===7); try{localStorage.setItem('playhub:musicle:clip',String(CLIP))}catch(e){} renderHome();}
  $('#clipHard').onclick=function(){setDifficulty(1.5)}; $('#clipCasual').onclick=function(){setDifficulty(7)};

/* As fontes musicais são configuradas em ../../playlists.js. */

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
  var token=++selectionToken,date=dayKey();selectedGenre=g;
  musicLoading=true;loadingChoice={genre:g,daily:daily};renderHome();
  $('#dzStatus').textContent=daily?'Preparando o catálogo completo para manter o desafio diário igual para todos…':'Carregando músicas de '+gName(g)+'…';
  musicLoader.select(g,Math.max(NQ,optionCount()),daily).then(function(s){
    if(token!==selectionToken)return;
    musicLoading=false;loadingChoice=null;
    if(daily&&date!==dayKey())throw Error('O dia mudou. Escolha o gênero novamente.');
    if(s.songs.length<optionCount())throw new Error('Poucas músicas disponíveis nesta categoria.');
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

/* ---------- home ---------- */
function renderHome(){
  renderStats();
  ['Daily'].forEach(function(m){
    var box=$('#tiles'+m); box.innerHTML='';
    var daily=HUBA.isDaily;
    var keys=configuredGenres();
    keys.forEach(function(g){
      var b=document.createElement('button'); b.className='tile';
      var n=poolOf(g).length, small='';
      if(musicLoading && loadingChoice && loadingChoice.genre===g && loadingChoice.daily===daily) small='Carregando gênero…';
      else if(!loadedGenres[g]) small='';
      else if(loadedGenres[g] && n<optionCount()) small='precisa de '+optionCount()+'+ músicas';
      else if(daily){
        var st=readState(g);
        if(st&&st.p&&st.p.length>=nq(poolOf(g))){small='feito: '+st.s+'/'+nq(poolOf(g)); b.classList.add('done')}
        else small='';
      } else small='';
      b.innerHTML='<span class="tname"><span class="tn"></span><em class="tacc"></em></span><small></small>';
      b.querySelector('.tn').textContent=gName(g);
      b.querySelector('.tacc').textContent='precisão '+genreAcc(g);
      b.lastChild.textContent=small;
      b.disabled=!!(musicLoading && loadingChoice && loadingChoice.genre===g && loadingChoice.daily===daily);
      b.onclick=function(){enterGenre(daily,g)};
      box.appendChild(b);
    });
  });
}

/* ---------- montar rodada ---------- */
function buildQuestions(pool,rng,exclude){
  var idx=pool.map(function(_,i){return i});
  var n=nq(pool);
  var cand=idx.filter(function(i){return !exclude||exclude.indexOf(norm(pool[i].label))<0});
  if(cand.length<n)cand=idx;
  var answers=shuffle(cand.slice(),rng).slice(0,n);
  return answers.map(function(a){
    var others=shuffle(idx.filter(function(i){return i!==a}),rng).slice(0,optionCount()-1);
    return {a:a,opts:shuffle([a].concat(others),rng),start:rng()};
  });
}
function openGame(daily,g){
  var pool=daily?musicLoader.snapshot(g):poolOf(g);
  $('#gameCatalogCount').textContent=pool.length.toLocaleString('pt-BR')+' músicas carregadas neste gênero';
  $('#home').classList.add('hidden'); $('#play').classList.remove('hidden');
  $('#play').classList.toggle('musical-hard',CLIP===1.5);
  $('#playTitle').textContent='Musical · '+gName(g)+' · '+modeName();
  $('#playSub').textContent=(daily?'Rodada do dia. ':'Rodada aleatória. ')+'Ouça o trecho de '+fmtSec(CLIP)+' segundos e escolha qual música tocou. São '+nq(pool)+' perguntas.';
  cur={pool:pool,genre:g,daily:daily,date:dayKey(),replacements:0,statsRecorded:false};
  failedAnswers={};
  newRound();
}
function newRound(){
  if(!cur.daily){musicLoader.select(cur.genre,5,false).catch(function(){});cur.pool=poolOf(cur.genre)}
  stop();
  failedAnswers={};
  var pool=cur.pool;
  var rng=cur.daily?mulberry(hash(cur.date+'|'+modeOf()+'|'+cur.genre+'|'+pool.length)):Math.random;
  cur.statsRecorded=false;
  cur.qs=buildQuestions(pool,rng,cur.daily?[]:readHistory());
  cur.picks=[]; cur.qi=0; cur.score=0;
  if(cur.daily){
    var st=readState(cur.genre);
    if(st&&st.p){
      if(st.questions){
        function index(song){var i=pool.findIndex(function(t){return t.id===song.id});if(i<0){i=pool.length;pool.push(song)}return i}
        cur.qs=st.questions.map(function(q){return {a:index(q.answer),opts:q.options.map(index),start:q.start}});
        cur.picks=st.p.map(function(id){return pool.findIndex(function(t){return t.id===id})});
      }else cur.picks=st.p.slice();
      cur.qi=cur.picks.length;cur.score=st.s||0;cur.replacements=st.replacements||0;failedAnswers=st.failedAnswers||{};
    }
    saveDaily();
  }
  if(cur.qi>=cur.qs.length) showResult(); else showQuestion();
}
$('#again').onclick=newRound;
function saveDaily(){
  if(!cur||!cur.daily)return;
  var saved={p:cur.picks.map(function(i){return cur.pool[i]&&cur.pool[i].id}),s:cur.score,replacements:cur.replacements,failedAnswers:failedAnswers,
    questions:cur.qs.map(function(q){return {answer:cur.pool[q.a],options:q.opts.map(function(i){return cur.pool[i]}),start:q.start}})};
  try{localStorage.setItem(storeKey(cur.genre,cur.date),JSON.stringify(saved))}catch(e){}
}
function goHome(){
  pauseCatalog();
  audioToken++;
  stop(); $('#play').classList.add('hidden'); $('#home').classList.remove('hidden'); renderHome();
}
$('#backBtn').onclick=goHome;
$('#backBtn2').onclick=goHome;
document.addEventListener('keydown',function(e){
 if(e.key!=='Escape')return;
 if(!$('#play').classList.contains('hidden')){e.preventDefault();goHome()}
 // Em #home, Escape não manda para a página inicial do HUBA.
});

/* ---------- áudio ---------- */
function stop(){
  playRequest++; // invalida reproduções que estavam aguardando carregar ou posicionar o áudio
  audio.onplaying=null; audio.pause(); clearTimeout(stopTimer); cancelAnimationFrame(raf);
  $('#fill').style.transform='scaleX(0)';
  $('#playBtn').textContent='Tocar trecho';
}
function setSong(song,frac,recovered){
  audioToken++;recoveredSong=!!recovered;recoveringSong=false;
  if(objUrl)URL.revokeObjectURL(objUrl);
  objUrl=song.file?URL.createObjectURL(song.file):null;
  metadataReady=false;
  startSec=0;
  audio.onloadedmetadata=function(){
    var d=audio.duration;
    if(!isFinite(d)||d<=CLIP)d=song.url?30:0;
    var lo=Math.min(d*SKIP_FRAC,SKIP_MAX), hi=d-CLIP;
    startSec=hi<=0?0:(hi>lo?lo+frac*(hi-lo):hi);
    metadataReady=true;
  };
  audio.preload='auto'; audio.src=objUrl||song.url;
}
function failedAudio(){
  if(!cur||$('#play').classList.contains('hidden')||$('#quiz').classList.contains('hidden'))return;
  if(cur.picks.length>cur.qi)return;
  if(recoveringSong)return;
  stop();
  var q=cur.qs[cur.qi],song=q&&cur.pool[q.a],token=audioToken;
  if(song&&song.id&&!recoveredSong){
    recoveredSong=true;recoveringSong=true;$('#qhint').textContent='Atualizando a prévia desta música…';
    HUBADeezer.request('https://api.deezer.com/track/'+encodeURIComponent(song.id),null,true).then(function(data){
      if(token!==audioToken)return;
      if(!data||!data.preview)throw new Error('Prévia indisponível');
      song.url=data.preview;setSong(song,q.start,true);$('#qhint').textContent='Prévia atualizada. Tente tocar novamente.';
    }).catch(function(){if(token===audioToken){recoveringSong=false;showAudioFailure()}});return;
  }
  showAudioFailure();
}
function showAudioFailure(){
  $('#qhint').textContent='Esta música não pôde ser reproduzida. Você pode sortear outra sem perder a tentativa.';
  $('#replaceSong').classList.remove('hidden');
}
audio.addEventListener('error',failedAudio);
function replaceFailedSong(){
  if(!cur||$('#replaceSong').classList.contains('hidden'))return;
  if(cur.picks.length>cur.qi)return;
  var q=cur.qs[cur.qi], excluded={};
  cur.qs.forEach(function(item,i){if(i!==cur.qi)excluded[item.a]=true});
  Object.keys(failedAnswers).forEach(function(i){excluded[Number(i)]=true});
  excluded[q.a]=true;
  failedAnswers[q.a]=true;
  var choices=cur.pool.map(function(_,i){return i}).filter(function(i){return !excluded[i]});
  if(!choices.length){$('#qhint').textContent='Nenhuma outra música disponível nesta categoria. Você pode voltar e carregar outras fontes.';$('#replaceSong').classList.add('hidden');return}
  stop();
  var rng=cur.daily?mulberry(hash(cur.date+'|musical-reserva|'+cur.genre+'|'+cur.qi+'|'+(++cur.replacements))):Math.random;
  q.a=choices[Math.floor(rng()*choices.length)];
  var options=cur.pool.map(function(_,i){return i}).filter(function(i){return i!==q.a});
  q.opts=shuffle(options,rng).slice(0,optionCount()-1);
  q.opts=shuffle([q.a].concat(q.opts),rng);
  q.start=rng();
  saveDaily();
  showQuestion();
}
$('#replaceSong').onclick=replaceFailedSong;
function playClip(){
  stop();
  var request=playRequest;
  $('#playBtn').textContent='Parar';

  function begin(){
    if(request!==playRequest)return;
    // O trecho é sorteado uma vez por pergunta, após o carregamento dos metadados.
    // Todas as reproduções desta pergunta voltam exatamente ao mesmo segundo.
    try{audio.currentTime=startSec}catch(e){failedAudio();return}

    function playFromStart(){
      if(request!==playRequest)return;
      var started=false;
      audio.onplaying=function(){
        if(started||request!==playRequest)return;
        started=true;
        var t0=performance.now();
        stopTimer=setTimeout(function(){if(request===playRequest)stop()},CLIP*1000);
        (function tick(now){
          if(request!==playRequest)return;
          var el=(now-t0)/1000;
          $('#fill').style.transform='scaleX('+Math.min(1,el/CLIP)+')';
          if(el<CLIP)raf=requestAnimationFrame(tick);
        })(t0);
      };
      var promise=audio.play();
      if(promise&&promise.catch)promise.catch(function(){if(request===playRequest)failedAudio()});
    }

    // Aguarda o seek terminar antes de iniciar a reprodução.
    if(audio.seeking){
      audio.addEventListener('seeked',function onSeeked(){
        audio.removeEventListener('seeked',onSeeked);
        playFromStart();
      });
    }else playFromStart();
  }

  // Sem essa espera, o primeiro Play começava em 0 s e os demais em startSec.
  if(metadataReady)begin();
  else audio.addEventListener('loadedmetadata',function onMetadata(){
    audio.removeEventListener('loadedmetadata',onMetadata);
    begin();
  });
}
$('#playBtn').onclick=function(){ HUBA_I18N.isText($('#playBtn'),'Parar')?stop():playClip() };

/* ---------- perguntas ---------- */
function dots(){
  var d=$('#dots'); d.innerHTML='';
  cur.qs.forEach(function(q,i){
    var s=document.createElement('span'); s.className='dot';
    if(i<cur.picks.length) s.classList.add(cur.picks[i]===q.a?'ok':'no');
    else if(i===cur.qi) s.classList.add('now');
    d.appendChild(s);
  });
}
function showQuestion(){
  $('#play').classList.remove('is-result');
  $('#quiz').classList.remove('hidden'); $('#result').classList.add('hidden');
  var q=cur.qs[cur.qi];
  $('#qcount').textContent='Pergunta '+(cur.qi+1)+' de '+cur.qs.length;
  $('#qhint').textContent='Qual música tocou?';
  $('#replaceSong').classList.add('hidden');
  $('#nextRow').classList.add('hidden');
  dots();
  setSong(cur.pool[q.a],q.start);
  var box=$('#opts'); box.innerHTML='';
  q.opts.forEach(function(i){
    var song=cur.pool[i];
    var b=document.createElement('button'); b.className='opt musical-option';
    b.type='button';
    var cover=document.createElement('span'); cover.className='musical-cover';
    var fallback=document.createElement('span'); fallback.className='musical-cover-fallback';
    fallback.textContent='♫'; fallback.setAttribute('aria-hidden','true');
    cover.appendChild(fallback);
    if(song.cover){
      var img=document.createElement('img');
      img.src=song.cover; img.alt=''; img.loading='lazy'; img.decoding='async';
      img.onerror=function(){img.remove()};
      cover.appendChild(img);
    }
    var text=document.createElement('span'); text.className='musical-option-info';
    var title=document.createElement('strong'); title.className='musical-option-title';
    var artist=document.createElement('span'); artist.className='musical-option-artist';
    var parts=song.label.split(' - ');
    title.textContent=song.title||(parts.length>1?parts.slice(1).join(' - '):song.label);
    artist.textContent=song.artist||(parts.length>1?parts[0]:'Artista não informado');
    text.appendChild(title); text.appendChild(artist);
    b.appendChild(cover); b.appendChild(text);
    b.setAttribute('aria-label',song.label);
    b.onclick=function(){answer(i)};
    box.appendChild(b);
  });
}
function finishRound(){
  recordStats();
  HUBA.recordPlayedGame('musicle',cur.daily?cur.date:undefined);
  renderStats();
  if(!cur.daily){
    var labels=cur.qs.map(function(q){return norm(cur.pool[q.a].label)});
    saveHistory(readHistory().concat(labels));
  }
}
function answer(i){
  if(!cur||cur.picks.length>cur.qi)return;
  stop();
  var q=cur.qs[cur.qi];
  var ok=i===q.a;
  cur.picks.push(i); if(ok)cur.score++;
  saveDaily();
  var btns=document.querySelectorAll('.opt');
  q.opts.forEach(function(oi,k){
    btns[k].disabled=true;
    if(oi===q.a)btns[k].classList.add('right');
    else if(oi===i)btns[k].classList.add('wrong');
  });
  $('#qhint').textContent=ok?'Acertou!':'Errou. A resposta era a marcada em verde.';
  dots();
  var last=cur.picks.length>=cur.qs.length;
  if(last)finishRound();
  $('#nextBtn').textContent=last?'Ver resultado':'Próxima';
  $('#nextRow').classList.remove('hidden');
}
$('#nextBtn').onclick=function(){
  stop(); cur.qi=cur.picks.length;
  if(cur.qi>=cur.qs.length) showResult(); else showQuestion();
};

/* ---------- resultado ---------- */
function showResult(){
  stop();
  $('#quiz').classList.add('hidden'); $('#result').classList.remove('hidden');
  $('#replaceSong').classList.add('hidden');
  var total=cur.qs.length;
  $('#resultTitle').textContent='Você acertou '+cur.score+' de '+total+(cur.daily&&cur.replacements?' · Com música reserva':'');
  var ul=$('#recap'); ul.innerHTML='';
  cur.qs.forEach(function(q,i){
    var song=cur.pool[q.a], ok=cur.picks[i]===q.a;
    var li=document.createElement('li');
    li.className='musical-recap-card '+(ok?'ok':'no');

    var cover=document.createElement('span');
    cover.className='musical-cover';
    var fallback=document.createElement('span');
    fallback.className='musical-cover-fallback';
    fallback.textContent='♫'; fallback.setAttribute('aria-hidden','true');
    cover.appendChild(fallback);
    if(song.cover){
      var img=document.createElement('img');
      img.src=song.cover; img.alt='Capa do álbum';
      img.loading='lazy'; img.decoding='async';
      img.onerror=function(){img.remove()};
      cover.appendChild(img);
    }

    var info=document.createElement('span');
    info.className='musical-option-info';
    var number=document.createElement('span');
    number.className='musical-recap-number';
    number.textContent='Música '+(i+1)+' · '+(ok?'Acertou':'Errou');
    var title=document.createElement('strong');
    title.className='musical-option-title';
    var artist=document.createElement('span');
    artist.className='musical-option-artist';
    var parts=song.label.split(' - ');
    title.textContent=song.title||(parts.length>1?parts.slice(1).join(' - '):song.label);
    artist.textContent=song.artist||(parts.length>1?parts[0]:'Artista não informado');
    info.appendChild(number); info.appendChild(title); info.appendChild(artist);

    if(!ok && cur.pool[cur.picks[i]]){
      var guess=document.createElement('small');
      guess.className='musical-recap-guess';
      guess.textContent='Seu palpite: '+cur.pool[cur.picks[i]].label;
      info.appendChild(guess);
    }
    li.appendChild(cover); li.appendChild(info);
    ul.appendChild(li);
  });
  $('#again').classList.toggle('hidden',cur.daily);
  $('#play').classList.add('is-result');
}


try{var savedClip=parseFloat(localStorage.getItem('playhub:musicle:clip')); if(savedClip===3)savedClip=1.5; if(savedClip===1.5||savedClip===7)CLIP=savedClip;}catch(e){}
setDifficulty(CLIP);
renderStats();
renderHome();


initCatalog();

document.addEventListener('huba:mode',function(){pauseCatalog();if(!$('#play').classList.contains('hidden'))goHome();else renderHome();});
})();
