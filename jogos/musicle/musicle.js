(function(){

var CLIP=7, NQ=5, ALL='__todos__';
var SKIP_FRAC=0.25, SKIP_MAX=60;   // o trecho nunca começa nos primeiros 25% da música (no máximo 60 s), por causa de introduções longas
  var STATS_KEY='playhub:musicle:stats:v1', HISTORY_KEY='playhub:musicle:recent:v1';
var $=function(s){return document.querySelector(s)};
var dayKey=HUBA.dayKey, hash=HUBA.hash, mulberry=HUBA.mulberry, shuffle=HUBA.shuffle, norm=HUBA.norm, recordDailyStreak=HUBA.recordDailyStreak;
var songs=[], byGenre={}, genres=[], local=[], remote=[], musicLoading=true;
var cur=null;
var audio=new Audio(), objUrl=null, stopTimer=null, raf=null, startSec=0;
var metadataReady=false, playRequest=0;
var failedAnswers={};

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
function poolOf(g){return g===ALL?songs:(byGenre[g]||[])}
function gName(g){return g===ALL?'Todos os gêneros':cap(g)}
  function storeKey(g){return 'musicle3:'+dayKey()+':'+g+':'+poolOf(g).length+':'+CLIP}
  function readState(g){try{var r=localStorage.getItem(storeKey(g)); return r?JSON.parse(r):null}catch(e){return null}}
  function nq(pool){return Math.min(NQ,pool.length)}
  function optionCount(){return CLIP===1.5?5:4}
  function modeOf(){return CLIP===1.5?'hard':'casual'}
  function modeName(){return CLIP===1.5?'Desafiador':'Casual'}
  function fmtSec(n){return String(n).replace('.',',')}
  function readStats(){try{return JSON.parse(localStorage.getItem(STATS_KEY))||{games:0}}catch(e){return {games:0}}}
  function saveStats(st){try{localStorage.setItem(STATS_KEY,JSON.stringify(st))}catch(e){}}
  function renderStats(){
    var st=readStats();
    $('#statGames').textContent=st.games||0;
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
  function setDifficulty(seconds){CLIP=seconds; $('#clipHard').classList.toggle('selected',CLIP===1.5); $('#clipCasual').classList.toggle('selected',CLIP===7); try{localStorage.setItem('playhub:musicle:clip',String(CLIP))}catch(e){} renderHome();}
  $('#clipHard').onclick=function(){setDifficulty(1.5)}; $('#clipCasual').onclick=function(){setDifficulty(7)};

/* As fontes musicais são configuradas em ../../playlists.js. */

function rebuild(){
  var seen={}, arr=[];
  local.concat(remote).forEach(function(s){var k=s.genre+'|'+norm(s.label); if(seen[k])return; seen[k]=1; arr.push(s)});
  arr.sort(function(a,b){return a.label.localeCompare(b.label,'pt-BR')});
  songs=arr; byGenre={};
  songs.forEach(function(s){(byGenre[s.genre]=byGenre[s.genre]||[]).push(s)});
  genres=Object.keys(byGenre).sort(function(a,b){return a.localeCompare(b,'pt-BR')});
  $('#summary').textContent=musicLoading?'Loading…':('Total: '+songs.length+' músicas');
  renderHome();
}

/* ---------- Deezer (JSONP) ---------- */
var jid=0;
function jsonp(url){
  return new Promise(function(res,rej){
    var cb='dzcb'+(++jid)+Date.now(), sc=document.createElement('script');
    var t=setTimeout(function(){clean();rej(new Error('tempo esgotado'))},10000);
    function clean(){clearTimeout(t);delete window[cb];sc.remove()}
    window[cb]=function(d){clean();if(d&&d.error)rej(new Error(d.error.message||'erro retornado pelo Deezer'));else res(d)};
    sc.onerror=function(){clean();rej(new Error('falha'))};
    sc.src=url+'&output=jsonp&callback='+cb;
    document.head.appendChild(sc);
  });
}
function parseCfg(txt){
  var out=[];
  txt.split('\n').forEach(function(line){
    var i=line.indexOf(':'); if(i<1)return;
    var g=line.slice(0,i).trim().toLowerCase();
    var items=line.slice(i+1).split(',').map(function(x){return x.trim()}).filter(Boolean);
    if(g&&items.length)out.push({g:g,items:items});
  });
  return out;
}
function fetchItem(g,it){
  var m=/^(?:playlist:\s*)?(?:https?:\/\/(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?playlist\/)?(\d+)(?:\?.*)?$/i.exec(it);
  // Playlists: percorre todas as páginas indicadas pelo Deezer, sem limite fixo de faixas.
  if(m){
    var seen={}, pages={}, out=[];
    function readPage(url){
      // O campo next é fornecido pelo Deezer. Aceita apenas URLs da própria API.
      var nextUrl;
      try{nextUrl=new URL(url)}catch(e){return Promise.reject(new Error('URL de paginação inválida'))}
      if(nextUrl.hostname!=='api.deezer.com'||!/^https?:$/.test(nextUrl.protocol))
        return Promise.reject(new Error('URL de paginação inesperada'));
      nextUrl.protocol='https:';
      var pageUrl=nextUrl.href;
      if(pages[pageUrl])return Promise.reject(new Error('Página repetida na resposta do Deezer'));
      pages[pageUrl]=true;
      // Uma falha temporária não deve interromper imediatamente uma playlist grande.
      function request(attempt){
        return jsonp(pageUrl).catch(function(err){
          if(attempt<2)return request(attempt+1);
          throw err;
        });
      }
      return request(0).then(function(d){
        if(!d||!Array.isArray(d.data))throw new Error('resposta inválida do Deezer');
        d.data.forEach(function(t){
          if(!t||!t.preview||!t.title||!t.artist||!t.artist.name)return;
          var base=t.title.replace(/\s*[\(\[][^\)\]]*[\)\]]/g,'').trim()||t.title;
          var label=t.artist.name+' - '+base, k=norm(label);
          if(seen[k])return; seen[k]=1;
          out.push({url:t.preview,label:label,genre:g,artist:t.artist.name,title:base,cover:(t.album&&(t.album.cover_medium||t.album.cover_big||t.album.cover))||''});
        });
        return d.next?readPage(d.next):out;
      });
    }
    return readPage('https://api.deezer.com/playlist/'+m[1]+'/tracks?limit=100');
  }
  // Artistas: mantém exatamente a pesquisa e o limite original de oito músicas.
  var url='https://api.deezer.com/search?limit=30&order=RANKING&q='+encodeURIComponent('artist:"'+it+'"');
  return jsonp(url).then(function(d){
    var n=norm(it), seen={}, out=[];
    if(!d||!Array.isArray(d.data))throw new Error('resposta inválida do Deezer');
    d.data.forEach(function(t){
      if(!t||!t.preview||!t.title||!t.artist||!t.artist.name||out.length>=8)return;
      var an=norm(t.artist.name);
      if(an!==n&&an.indexOf(n)<0&&n.indexOf(an)<0)return;
      var base=t.title.replace(/\s*[\(\[][^\)\]]*[\)\]]/g,'').trim()||t.title;
      var label=t.artist.name+' - '+base, k=norm(label);
      if(seen[k])return; seen[k]=1;
      out.push({url:t.preview,label:label,genre:g,artist:t.artist.name,title:base,cover:(t.album&&(t.album.cover_medium||t.album.cover_big||t.album.cover))||''});
    });
    return out;
  });
}
  function loadDeezer(){
    var lines=window.HUBA_MUSICAS && window.HUBA_MUSICAS.fontes;
    var cfg=parseCfg(Array.isArray(lines)?lines.join('\n'):'');
    if(!cfg.length){musicLoading=false;$('#summary').textContent='Total: 0 músicas';renderHome();$('#dzStatus').textContent=window.HUBA_MUSICAS?'Nenhuma fonte encontrada na lista fontes de playlists.js.':'Configuração indisponível: confira se playlists.js está na raiz publicada do repositório e abra ../../playlists.js no navegador.';return}
    musicLoading=true;renderHome();$('#dzStatus').textContent='Loading…';
    var fails=0, empty=0, jobs=[];
    cfg.forEach(function(c){c.items.forEach(function(it){
      jobs.push(fetchItem(c.g,it).then(function(r){if(!r.length)empty++;return r},function(){fails++;return []}));
    })});
    Promise.all(jobs).then(function(res){
      var all=[];res.forEach(function(r){all=all.concat(r)});
      remote=all;musicLoading=false;rebuild();
      var extra=[];if(fails)extra.push(fails+' fonte(s) falharam');if(empty)extra.push(empty+' fonte(s) sem prévias');
      $('#dzStatus').textContent=extra.length?extra.join(' · ')+'.':'';
      if(!all.length)$('#dzStatus').textContent+=' Verifique playlists.js e a disponibilidade do Deezer.';
    }).catch(function(){
      musicLoading=false;renderHome();$('#summary').textContent='Total: '+songs.length+' músicas';$('#dzStatus').textContent='Não foi possível carregar as músicas. Atualize a página para tentar novamente.';
    });
  }

/* ---------- home ---------- */
function renderHome(){
  ['Daily','Random'].forEach(function(m){
    var box=$('#tiles'+m); box.innerHTML='';
    var daily=m==='Daily';
    var keys=songs.length?(genres.length>1?[ALL].concat(genres):genres):['rock','metal','pop','anime','games','power metal'];
    keys.forEach(function(g){
      var b=document.createElement('button'); b.className='tile';
      var n=songs.length?poolOf(g).length:0, small='';
      if(musicLoading) small='Loading…';
      else if(!songs.length) small='Indisponível';
      else if(n<optionCount()) small='precisa de '+optionCount()+'+ músicas';
      else if(daily){
        var st=readState(g);
        if(st&&st.p&&st.p.length>=nq(poolOf(g))){small='feito: '+st.s+'/'+nq(poolOf(g)); b.classList.add('done')}
        else small='';
      } else small='';
      b.innerHTML='<span class="tname"><span class="tn"></span><em class="tacc"></em></span><small></small>';
      b.querySelector('.tn').textContent=songs.length?gName(g):cap(g);
      b.querySelector('.tacc').textContent=(songs.length&&n>=optionCount())?'precisão '+genreAcc(g):'';
      b.lastChild.textContent=small;
      b.disabled=musicLoading||!songs.length||n<optionCount();
      b.onclick=function(){openGame(daily,g)};
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
  var pool=poolOf(g);
  $('#home').classList.add('hidden'); $('#play').classList.remove('hidden');
  $('#play').classList.toggle('musical-hard',CLIP===1.5);
  $('#playTitle').textContent='Musical · '+gName(g)+' · '+modeName();
  $('#playSub').textContent=(daily?'Rodada do dia. ':'Rodada aleatória. ')+'Ouça o trecho de '+fmtSec(CLIP)+' segundos e escolha qual música tocou. São '+nq(pool)+' perguntas.';
  cur={pool:pool,genre:g,daily:daily,statsRecorded:false};
  failedAnswers={};
  newRound();
}
function newRound(){
  stop();
  failedAnswers={};
  var pool=cur.pool;
  var rng=cur.daily?mulberry(hash(dayKey()+'|'+modeOf()+'|'+cur.genre+'|'+pool.length)):Math.random;
  cur.statsRecorded=false;
  cur.qs=buildQuestions(pool,rng,cur.daily?[]:readHistory());
  cur.picks=[]; cur.qi=0; cur.score=0;
  if(cur.daily){
    var st=readState(cur.genre);
    if(st&&st.p){cur.picks=st.p.slice(); cur.qi=cur.picks.length; cur.score=st.s||0}
  }
  if(cur.qi>=cur.qs.length) showResult(); else showQuestion();
}
$('#again').onclick=newRound;
function goHome(){
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
function setSong(song,frac){
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
  stop();
  $('#qhint').textContent='Esta música não pôde ser reproduzida. Você pode sortear outra sem perder a tentativa.';
  $('#replaceSong').classList.remove('hidden');
}
audio.addEventListener('error',failedAudio);
function replaceFailedSong(){
  if(!cur||$('#replaceSong').classList.contains('hidden'))return;
  var q=cur.qs[cur.qi], excluded={};
  cur.qs.forEach(function(item,i){if(i!==cur.qi)excluded[item.a]=true});
  Object.keys(failedAnswers).forEach(function(i){excluded[Number(i)]=true});
  excluded[q.a]=true;
  failedAnswers[q.a]=true;
  var choices=cur.pool.map(function(_,i){return i}).filter(function(i){return !excluded[i]});
  if(!choices.length){$('#qhint').textContent='Nenhuma outra música disponível nesta categoria. Você pode voltar e carregar outras fontes.';$('#replaceSong').classList.add('hidden');return}
  stop();
  q.a=choices[Math.floor(Math.random()*choices.length)];
  var options=cur.pool.map(function(_,i){return i}).filter(function(i){return i!==q.a});
  q.opts=shuffle(options,Math.random).slice(0,optionCount()-1);
  q.opts=shuffle([q.a].concat(q.opts),Math.random);
  q.start=Math.random();
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
$('#playBtn').onclick=function(){ $('#playBtn').textContent==='Parar'?stop():playClip() };

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
  if(cur.daily)recordDailyStreak(CLIP===1.5?'musicle-hard':'musicle');
  if(!cur.daily){
    var labels=cur.qs.map(function(q){return norm(cur.pool[q.a].label)});
    saveHistory(readHistory().concat(labels));
  }
}
function answer(i){
  var q=cur.qs[cur.qi];
  var ok=i===q.a;
  cur.picks.push(i); if(ok)cur.score++;
  if(cur.daily){try{localStorage.setItem(storeKey(cur.genre),JSON.stringify({p:cur.picks,s:cur.score}))}catch(e){}}
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
  $('#resultTitle').textContent='Você acertou '+cur.score+' de '+total;
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


loadDeezer();

})();
