/* Funções compartilhadas pelos jogos e pela página inicial. */
window.HUBA = (function(){
  function dayKey(date){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date||new Date())}
  function previousDay(day){return new Date(Date.parse(day+'T12:00:00Z')-86400000).toISOString().slice(0,10)}
  function hash(s){var h=2166136261; for(var i=0;i<s.length;i++){h^=s.charCodeAt(i); h=Math.imul(h,16777619)} return h>>>0}
  function mulberry(a){var rng=function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};rng.getState=function(){return a|0};return rng}
  function shuffle(arr,rng){for(var i=arr.length-1;i>0;i--){var j=Math.floor(rng()*(i+1)),t=arr[i];arr[i]=arr[j];arr[j]=t} return arr}
  function norm(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
  function streakKey(id){return 'playhub:'+id+':streak:v1'}
  function readStreak(id){try{return JSON.parse(localStorage.getItem(streakKey(id)))||{}}catch(e){return {}}}
  function currentStreak(id){var st=readStreak(id),today=dayKey();return (st.last===today||st.last===previousDay(today))?(st.count||0):0}
  function recordDailyStreak(id,date){var st=readStreak(id),today=date||dayKey();if(st.last>=today)return;st.count=(st.last===previousDay(today))?(st.count||0)+1:1;st.last=today;st.best=Math.max(st.best||0,st.count);try{localStorage.setItem(streakKey(id),JSON.stringify(st))}catch(e){}}
  // Conserva a maior sequência ativa anterior; não soma dias que podem coincidir.
  try{if(!localStorage.getItem('huba:musicle:unified:v1')){
    var casual=readStreak('musicle'),hard=readStreak('musicle-hard');
    var merged=currentStreak('musicle-hard')>currentStreak('musicle')?hard:casual;
    merged.best=Math.max(casual.best||0,hard.best||0,merged.count||0);
    localStorage.setItem(streakKey('musicle'),JSON.stringify(merged));localStorage.setItem('huba:musicle:unified:v1','1');
  }}catch(e){}
  function recordPlayedGame(id,date){recordDailyStreak('huba');if(id==='musicle')recordDailyStreak('musicle',date);document.dispatchEvent(new Event('huba:streak'))}
  return {dayKey:dayKey,hash:hash,mulberry:mulberry,shuffle:shuffle,norm:norm,currentStreak:currentStreak,recordDailyStreak:recordDailyStreak,recordPlayedGame:recordPlayedGame};
})();

/* Preferência de modo compartilhada; o Diário é o padrão. */
(function(){
 var HUBA=window.HUBA,mode='daily';try{if(localStorage.getItem('huba:mode:v1')==='training')mode='training'}catch(e){}
 Object.defineProperty(HUBA,'mode',{get:function(){return mode}});
 Object.defineProperty(HUBA,'isDaily',{get:function(){return mode==='daily'}});
 HUBA.syncMode=function(){
  document.querySelectorAll('[data-mode-title]').forEach(function(el){el.textContent=HUBA.isDaily?'Diário':'Treino'});
  document.querySelectorAll('[data-mode-description]').forEach(function(el){el.textContent=HUBA.isDaily?el.dataset.dailyDescription:'Jogue quantas vezes quiser.'});
 };
 HUBA.setMode=function(value){
  var next=value==='training'?'training':'daily';if(next===mode)return;
  mode=next;try{localStorage.setItem('huba:mode:v1',mode)}catch(e){}
  HUBA.syncMode();document.dispatchEvent(new CustomEvent('huba:mode',{detail:mode}));
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',HUBA.syncMode);else HUBA.syncMode();
})();

/* Preferência visual compartilhada, disponível em todas as telas. */
(function(){
  'use strict';
  var themes={system:'Automático',light:'Claro',dark:'Escuro',ocean:'Oceano',forest:'Floresta',sunset:'Pôr do sol',rose:'Rosa',coffee:'Café',midnight:'Meia-noite',emerald:'Esmeralda',amethyst:'Ametista',graphite:'Grafite',gpt:'Carvão',discord:'Discord'};
  var selected='system',key='huba:theme:v1';
  try{var saved=localStorage.getItem(key);if(Object.prototype.hasOwnProperty.call(themes,saved))selected=saved}catch(e){}
  function apply(theme){
    selected=theme;
    if(theme==='system')document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme',theme);
  }
  apply(selected);
  function buildSettings(){
    var nav=document.createElement('nav');nav.className='huba-settings';nav.setAttribute('aria-label','Configurações do Hubdle');
    var menu=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent='⚙';summary.title='Configurações';summary.setAttribute('aria-label','Configurações');menu.appendChild(summary);
    var content=document.createElement('div');content.className='huba-settings-content';
    var options=document.createElement('div');options.className='huba-theme-options';options.setAttribute('role','group');options.setAttribute('aria-label','Tema do site');
    Object.keys(themes).forEach(function(theme){
      var button=document.createElement('button');button.type='button';button.textContent=themes[theme];button.dataset.theme=theme;
      button.setAttribute('aria-pressed',String(selected===theme));
      button.onclick=function(){
        apply(theme);try{localStorage.setItem(key,theme)}catch(e){}
        options.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.theme===theme))});
      };
      options.appendChild(button);
    });
    content.appendChild(options);menu.appendChild(content);nav.appendChild(menu);document.body.appendChild(nav);
    nav.addEventListener('keydown',function(e){if(e.key==='Escape'){menu.open=false;summary.focus();e.preventDefault();e.stopPropagation()}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSettings);else buildSettings();
})();
