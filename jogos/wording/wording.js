(function(){
var $=function(s){return document.querySelector(s)};
var dayKey=HUBA.dayKey,hash=HUBA.hash,mulberry=HUBA.mulberry,shuffle=HUBA.shuffle,norm=HUBA.norm,recordDailyStreak=HUBA.recordDailyStreak;
/* ---------- Wording ---------- */
var WCFG={}, WLANG=HUBA_I18N.language, WLOADING=true;
var WFILES=['words.json','palavra.json'];
var WDATA_URL=new URL('../../dados/wording-listas.js',document.currentScript.src).href;
var suspendedWords={};
function wLangOfFile(name){return /palavra|(^|[^a-z])pt([^a-z]|$)|port/i.test(name)?'pt':'en'}
function wPrepare(d,defLang){
  var out={}, any=false, root=d;
  if(Array.isArray(d)){root={}; root[defLang]=d}
  ['pt','en'].forEach(function(l){
    var s0=root&&root[l]; if(!s0)return;
    var isArr=Array.isArray(s0), arr=isArr?s0:s0.words; if(!Array.isArray(arr))return;
    var seen={}, words=[], ns=[];
    arr.forEach(function(x){
      if(typeof x!=='string')return;
      var dsp=x.trim().toLowerCase(), k=norm(dsp);
      if(!/^[a-z]{5}$/.test(k)||seen[k])return;
      seen[k]=1; words.push(dsp); ns.push(k);
    });
    var extra=(!isArr&&Array.isArray(s0.extra))?s0.extra:[];
    extra.forEach(function(x){if(typeof x!=='string')return; var k=norm(x.trim().toLowerCase()); if(/^[a-z]{5}$/.test(k))seen[k]=1});
    if(words.length>=10){out[l]={words:words,n:ns,set:seen,validate:isArr||s0.validate!==false}; any=true}
  });
  return any?out:null;
}
function wParse(name,text){try{return wPrepare(JSON.parse(text),wLangOfFile(name))}catch(e){return null}}
function wPickLang(){WLANG=HUBA_I18N.language}
function wInitWords(){
  WLOADING=true;
  var source;
  if(location.protocol==='file:'){
    source=new Promise(function(resolve,reject){
      function ready(){resolve(WFILES.map(function(name){return wPrepare(window.HUBA_WORD_LISTS[name],wLangOfFile(name))}))}
      if(window.HUBA_WORD_LISTS){ready();return}
      var script=document.createElement('script');script.src=WDATA_URL;
      script.onload=function(){script.remove();if(window.HUBA_WORD_LISTS)ready();else reject(new Error('Listas indisponíveis'))};
      script.onerror=function(){script.remove();reject(new Error('Listas indisponíveis'))};document.head.appendChild(script);
    }).catch(function(){return []});
  }else source=Promise.all(WFILES.map(function(name){
    return fetch('../../dados/'+name,{cache:'no-store'}).then(function(r){
      if(!r.ok)throw new Error('Lista indisponível');return r.text();
    }).then(function(text){var cfg=wParse(name,text);if(!cfg)throw new Error('Lista inválida');return cfg}).catch(function(){return null});
  }));
  source.then(function(results){
    var cfg={};results.forEach(function(result){if(result)Object.keys(result).forEach(function(lang){cfg[lang]=result[lang]})});
    WCFG=cfg;WLOADING=false;wPickLang();renderWordHub();
  });
}
function wRenderLang(){
  var txt=WLOADING?'Carregando as listas de palavras…':WCFG[WLANG]?'':'Não foi possível carregar a lista de palavras deste idioma. Atualize a página para tentar novamente.';
  $('#wSrc').textContent=txt;$('#wSrc').parentElement.classList.toggle('hidden',!txt);
}

document.addEventListener('huba:language',function(){
  var playing=w&&!$('#wgame').classList.contains('hidden'),mode=w&&w.mode,daily=w&&w.daily;
  if(playing)suspendedWords[w.lang+'|'+mode+'|'+daily]=w;
  wPickLang();
  if(playing&&WCFG[WLANG]){
    var saved=suspendedWords[WLANG+'|'+mode+'|'+daily];
    if(saved){w=saved;showWordGame()}else startWord(mode,daily,true);
  }else if(playing)wBackToHub();
  else renderWordHub();
  if($('#wStats').open)renderWStats();
});
var WMODES={
  termo:{name:'Wording',n:1,tries:6,desc:'1 palavra · 6 tentativas'},
  dueto:{name:'Woording',n:2,tries:7,desc:'2 palavras · 7 tentativas'},
  quarteto:{name:'Woooording',n:4,tries:9,desc:'4 palavras · 9 tentativas'}
};
var WKEY='playhub:word:stats:v1', w=null, wMsgT=null;
function wRead(){try{var o=JSON.parse(localStorage.getItem(WKEY)); if(o&&o.modes)return o}catch(e){} return {games:0,modes:{}}}
function wSave(st){try{localStorage.setItem(WKEY,JSON.stringify(st))}catch(e){}}
function wDayKey(mode,lang){lang=lang||WLANG; var c=WCFG[lang]; return 'word2:'+dayKey()+':'+lang+':'+mode+':'+(c?c.words.length:0)}
function wStatKey(lang,mode){return lang==='pt'?mode:mode+'.'+lang}
function wLoad(mode){try{var o=JSON.parse(localStorage.getItem(wDayKey(mode))); return (o&&o.g)||null}catch(e){return null}}
function wTargets(mode,daily){
  var M=WMODES[mode], cfg=WCFG[WLANG], rng=daily?mulberry(hash(dayKey()+'|word|'+WLANG+'|'+mode)):Math.random;
  var idx=cfg.words.map(function(_,i){return i});
  return shuffle(idx,rng).slice(0,M.n).map(function(i){return {n:cfg.n[i],d:cfg.words[i]}});
}
function wScore(g,t){
  var r=['a','a','a','a','a'], used=[0,0,0,0,0], i, j;
  for(i=0;i<5;i++)if(g[i]===t[i]){r[i]='c'; used[i]=1}
  for(i=0;i<5;i++){
    if(r[i]==='c')continue;
    for(j=0;j<5;j++){if(!used[j]&&g[i]===t[j]){r[i]='p'; used[j]=1; break}}
  }
  return r;
}
function wStatus(mode){
  if(!WCFG[WLANG])return null;
  var g=wLoad(mode); if(!g)return null;
  var M=WMODES[mode], ts=wTargets(mode,true);
  if(ts.every(function(t){return g.indexOf(t.n)>=0}))return 'win';
  return g.length>=M.tries?'lose':'play';
}
function renderWordHub(){
  $('#wDailyStreak').textContent=HUBA.currentStreak('word');
  wRenderLang();
  [['Daily',HUBA.isDaily]].forEach(function(x){
    var box=$('#wTiles'+x[0]); box.innerHTML='';
    Object.keys(WMODES).forEach(function(k){
      var M=WMODES[k], b=document.createElement('button'), st=x[1]?wStatus(k):null, txt=WCFG[WLANG]?'jogar':(WLOADING?'carregando':'sem lista');
      b.className='tile'; b.disabled=!WCFG[WLANG];
      if(st==='win'){txt='venceu ✓'; b.classList.add('done')}
      else if(st==='lose')txt='não foi dessa vez';
      else if(st==='play')txt='em andamento';
      b.innerHTML='<span class="tname"><span class="tn"></span><em class="tacc"></em></span><small></small>';
      b.querySelector('.tn').textContent=M.name;
      b.querySelector('.tacc').textContent=M.desc;
      b.lastChild.textContent=txt;
      b.onclick=function(){startWord(k,x[1])};
      box.appendChild(b);
    });
  });
}
function wBuildKb(){
  var kb=$('#wKb'); if(kb.firstChild)return;
  ['qwertyuiop','asdfghjkl','>zxcvbnm<'].forEach(function(row,ri){
    var r=document.createElement('div'); r.className='w-krow'+(ri===1?' indent':'');
    row.split('').forEach(function(ch){
      var b=document.createElement('button'); b.type='button'; b.tabIndex=-1;
      b.className='w-key'+(ch==='>'||ch==='<'?' wide':'');
      b.textContent=ch==='>'?'Enter':ch==='<'?'⌫':ch;
      b.dataset.k=ch==='>'?'enter':ch==='<'?'back':ch;
      b.addEventListener('mousedown',function(e){e.preventDefault()});
      b.onclick=function(){wKey(b.dataset.k)};
      r.appendChild(b);
    });
    kb.appendChild(r);
  });
  var rs=document.createElement('div'); rs.className='w-krow';
  var sb=document.createElement('button'); sb.type='button'; sb.tabIndex=-1; sb.className='w-key wide w-space'; sb.textContent='espaço'; sb.dataset.k='space';
  sb.title='Pula uma posição, deixando um espaço em branco'; sb.addEventListener('mousedown',function(e){e.preventDefault()}); sb.onclick=function(){wKey('space')};
  rs.appendChild(sb); kb.appendChild(rs);
}
function startWord(mode,daily,preserve){
  if(!WCFG[WLANG])return;
  if(!preserve)suspendedWords={};
  var M=WMODES[mode];
  w={mode:mode,lang:WLANG,M:M,daily:daily,targets:wTargets(mode,daily),guesses:[],slots:['','','','',''],pos:0,done:false,won:false,flip:-1};
  if(daily){var g=wLoad(mode); if(g)w.guesses=g.slice()}
  wEval();
  showWordGame();
}
function showWordGame(){
  var M=w.M,daily=w.daily;
  $('#word').classList.add('hidden'); $('#wgame').classList.remove('hidden');
  $('#wTitle').textContent=M.name+' · '+(daily?'Diário':'Treino')+(WLANG==='en'?' · English':'');
  $('#wMsg').textContent='';
  wBuildKb(); renderWord();
  document.dispatchEvent(new Event('huba:word-screen'));
}
function wEval(){
  w.won=w.targets.every(function(t){return w.guesses.indexOf(t.n)>=0});
  w.done=w.won||w.guesses.length>=w.M.tries;
}
function wToast(t){
  $('#wMsg').textContent=t; clearTimeout(wMsgT);
  wMsgT=setTimeout(function(){$('#wMsg').textContent=''},2200);
}
function wKey(k){
  if(!w||w.done)return;
  w.flip=-1;
  if(k==='enter')return wSubmit();
  if(k==='back'){
    // Apaga a casa selecionada; se estiver vazia, procura uma letra antes.
    // Se o cursor voltou ao início com letras à direita, apaga a última delas.
    var target=w.pos;
    if(!w.slots[target]||w.slots[target]===' '){
      target=-1;
      for(var j=w.pos-1;j>=0;j--)if(w.slots[j]&&w.slots[j]!==' '){target=j;break}
      if(target<0)for(var j=4;j>w.pos;j--)if(w.slots[j]&&w.slots[j]!==' '){target=j;break}
      if(target<0){for(var j=4;j>=0;j--)if(w.slots[j]===' '){target=j;break}}
    }
    if(target>=0){w.slots[target]='';w.pos=target}
    // Depois de limpar a palavra (inclusive placeholders), recomeça na primeira casa.
    // Backspace em uma linha já vazia também deve levar o cursor ao início.
    if(target<0||w.slots.every(function(slot){return slot===''}))w.pos=0;
  }
  else if(k==='space'){if(!w.slots[w.pos])w.slots[w.pos]=' '; if(w.pos<4)w.pos++}
  else if(k==='left'){if(w.pos>0)w.pos--}
  else if(k==='right'){if(w.pos<4)w.pos++}
  else{w.slots[w.pos]=k; w.pos=(w.pos+1)%5}
  renderWord();
}
function wShake(){var b=$('#wBoards'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake')}
function wSubmit(){
  document.dispatchEvent(new Event('huba:word-guess'));
  var cur=w.slots.join('');
  if(!/^[a-z]{5}$/.test(cur)){
    var vis=w.slots.map(function(x){return (x&&x!==' ')?x:' '}).join('');
    wToast((w.slots.indexOf(' ')>=0||/\S\s+\S/.test(vis))?'Preencha o espaço em branco':'Digite 5 letras'); wShake(); return;
  }
  var wc=WCFG[w.lang];
  if(wc&&wc.validate&&!wc.set[cur]){
    wToast('Palavra não aceita'); wShake(); return;
  }
  clearTimeout(wMsgT); $('#wMsg').textContent='';
  w.guesses.push(cur); w.slots=['','','','','']; w.pos=0; w.flip=w.guesses.length-1;
  wEval();
  if(w.daily){try{localStorage.setItem(wDayKey(w.mode,w.lang),JSON.stringify({g:w.guesses}))}catch(e){}}
  if(w.done)wFinish();
  renderWord();
}
function wFinish(){
  HUBA.recordPlayedGame('word');
  var st=wRead(); st.games=(st.games||0)+1;
  if(w.daily){
    var sk=wStatKey(w.lang,w.mode), m=st.modes[sk]=st.modes[sk]||{p:0,w:0,s:0,b:0,d:[]};
    m.p++;
    if(w.won){m.w++; m.s++; m.b=Math.max(m.b,m.s); var n=w.guesses.length; m.d[n-1]=(m.d[n-1]||0)+1}
    else m.s=0;
    recordDailyStreak('word');
  }
  wSave(st);
}
function renderWord(){
  var boards=$('#wBoards'); boards.dataset.n=w.M.n; boards.innerHTML='';
  var rank={a:1,p:2,c:3};
  w.targets.forEach(function(t,b){
    var solvedAt=w.guesses.indexOf(t.n), shown=solvedAt>=0?solvedAt+1:w.guesses.length;
    var bd=document.createElement('div'); bd.className='w-board'+(solvedAt>=0?' solved':'');
    for(var r=0;r<w.M.tries;r++){
      var row=document.createElement('div'); row.className='w-row'+((r===w.flip&&r<shown)?' flip':'');
      var g=null, sc=null, disp=null, act=false;
      if(r<shown){
        g=w.guesses[r]; sc=wScore(g,t.n); if(r===solvedAt)disp=t.d;
      } else if(r===w.guesses.length&&!w.done&&solvedAt<0){g=w.slots; act=true}
      for(var i=0;i<5;i++){
        var tile=document.createElement('div'), ch=(g&&g[i])?(disp?disp[i]:g[i]):'';
        tile.className='w-tile'; tile.textContent=ch;
        if(sc){tile.classList.add(sc[i]); tile.style.animationDelay=(i*0.2)+'s'}
        else if(ch)tile.classList.add('f');
        if(act&&g[i]===' '){tile.textContent='·'; tile.classList.remove('f'); tile.classList.add('ph')}
        if(act){tile.classList.add('act'); if(i===w.pos)tile.classList.add('cur'); wTileClick(tile,i)}
        row.appendChild(tile);
      }
      bd.appendChild(row);
    }
    boards.appendChild(bd);
  });
  // teclado: uma cor por letra, mesma regra do Wording valendo para todas as palavras do jogo
  var kst={};
  w.guesses.forEach(function(g){
    w.targets.forEach(function(t){
      var sc=wScore(g,t.n);
      for(var q=0;q<5;q++){var L=g[q]; if(!kst[L]||rank[sc[q]]>rank[kst[L]])kst[L]=sc[q]}
    });
  });
  $('#wKbNote').classList.toggle('hidden',w.done);
  document.querySelectorAll('.w-key').forEach(function(btn){
    btn.style.background=''; btn.classList.remove('ks','used','free','kc','kp','kd');
    var st=kst[btn.dataset.k];
    btn.classList.add(st==='c'?'kc':st==='p'?'kp':st==='a'?'kd':'free');
  });
  $('#wKb').classList.toggle('hidden',w.done);
  if(w.done)$('#wKbNote').classList.add('hidden');
  var res=$('#wResult');
  res.classList.toggle('hidden',!w.done);
  $('#wAgain').classList.toggle('hidden',w.daily);
  if(w.done){
    var n2=w.guesses.length;
    $('#wResTitle').textContent=w.won?(w.M.n>1?'Você acertou todas!':'Você acertou!'):'Não foi dessa vez';
    $('#wResText').textContent=w.won?('Em '+n2+(n2===1?' tentativa.':' tentativas.')):('A palavra era: '+w.targets.map(function(t){return t.d.toUpperCase()}).join(', ')).replace('A palavra era','A'+(w.M.n>1?'s palavras eram':' palavra era'));
  }
}
function wTileClick(tile,i){tile.onclick=function(){if(!w||w.done)return; w.pos=i; w.flip=-1; renderWord()}}
function wBackToHub(){
  $('#wgame').classList.add('hidden'); $('#word').classList.remove('hidden'); renderWordHub();
}
$('#wBack').onclick=wBackToHub; $('#wBack2').onclick=wBackToHub;
$('#wAgain').onclick=function(){startWord(w.mode,false)};
$('#wToLanding').onclick=function(){
  window.location.href='../../index.html';
};
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    if($('#wStats').open){e.preventDefault();$('#wStats').close();return}
    if(!$('#wgame').classList.contains('hidden')){e.preventDefault();wBackToHub();return}
    // Na seleção de modos não sai automaticamente para a página principal do Hubdle.
    return;
  }
  if(!w||$('#wgame').classList.contains('hidden')||$('#wStats').open)return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target.closest&&e.target.closest('.huba-settings, .huba-support-dropdown, .huba-language'))return;
  var k=e.key;
  var ae=document.activeElement; if(ae&&ae!==document.body&&ae.tagName==='BUTTON')ae.blur();
  if(k==='Enter'){e.preventDefault(); wKey('enter')}
  else if(k==='Backspace'){e.preventDefault(); wKey('back')}
  else if(k===' '){e.preventDefault(); wKey('space')}
  else if(k==='ArrowLeft'){e.preventDefault(); wKey('left')}
  else if(k==='ArrowRight'){e.preventDefault(); wKey('right')}
  else if(k&&k.length===1){var c=norm(k); if(/^[a-z]$/.test(c))wKey(c)}
});
function renderWStats(){
  var st=wRead(), body=$('#wStatsBody'); body.innerHTML='';
  document.querySelector('#wStats h2').textContent='Estatísticas · '+(WLANG==='en'?'English':'Português');
  Object.keys(WMODES).forEach(function(k){
    var M=WMODES[k], m=st.modes[wStatKey(WLANG,k)]||{p:0,w:0,s:0,b:0,d:[]};
    var blk=document.createElement('div'); blk.className='w-sblock';
    var pct=m.p?Math.round(m.w/m.p*100):0;
    blk.innerHTML='<h3></h3><div class="w-nums"><div><strong></strong><span>jogos</span></div><div><strong></strong><span>vitórias</span></div><div><strong></strong><span>sequência</span></div><div><strong></strong><span>melhor</span></div></div><div class="w-dist"></div>';
    blk.querySelector('h3').textContent=M.name;
    var nums=blk.querySelectorAll('strong'); nums[0].textContent=m.p; nums[1].textContent=pct+'%'; nums[2].textContent=m.s; nums[3].textContent=m.b;
    var dist=blk.querySelector('.w-dist'), mx=1, i;
    for(i=0;i<M.tries;i++)mx=Math.max(mx,m.d[i]||0);
    for(i=0;i<M.tries;i++){
      var v=m.d[i]||0, lab=document.createElement('span'), bar=document.createElement('div');
      lab.textContent=i+1; bar.className='w-bar'+(v?' on':''); bar.style.width=Math.max(8,v/mx*100)+'%'; bar.textContent=v;
      dist.appendChild(lab); dist.appendChild(bar);
    }
    body.appendChild(blk);
  });
}
function openWStats(){renderWStats(); var d=$('#wStats'); if(d.showModal)d.showModal(); else d.setAttribute('open','')}
$('#wGameStats').onclick=openWStats;
$('#wStatsClose').onclick=function(){$('#wStats').close()};
$('#wStats').addEventListener('click',function(e){if(e.target===this)this.close()});


wInitWords();

document.addEventListener('huba:mode',function(){suspendedWords={};if(!$('#wgame').classList.contains('hidden'))wBackToHub();else renderWordHub();});
})();
