/* Funções compartilhadas pelos jogos e pela página inicial. */
window.HUBA = (function(){
  function dayKey(){var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function hash(s){var h=2166136261; for(var i=0;i<s.length;i++){h^=s.charCodeAt(i); h=Math.imul(h,16777619)} return h>>>0}
  function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function shuffle(arr,rng){for(var i=arr.length-1;i>0;i--){var j=Math.floor(rng()*(i+1)),t=arr[i];arr[i]=arr[j];arr[j]=t} return arr}
  function norm(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
  function keyOf(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function streakKey(id){return 'playhub:'+id+':streak:v1'}
  function readStreak(id){try{return JSON.parse(localStorage.getItem(streakKey(id)))||{}}catch(e){return {}}}
  function currentStreak(id){var st=readStreak(id),y=new Date();y.setDate(y.getDate()-1);return (st.last===dayKey()||st.last===keyOf(y))?(st.count||0):0}
  function recordDailyStreak(id){var st=readStreak(id),today=dayKey(),y=new Date();y.setDate(y.getDate()-1);if(st.last===today)return;st.count=(st.last===keyOf(y))?(st.count||0)+1:1;st.last=today;st.best=Math.max(st.best||0,st.count);try{localStorage.setItem(streakKey(id),JSON.stringify(st))}catch(e){}}
  return {dayKey:dayKey,hash:hash,mulberry:mulberry,shuffle:shuffle,norm:norm,currentStreak:currentStreak,recordDailyStreak:recordDailyStreak};
})();

/* Preferência visual compartilhada, disponível em todas as telas. */
(function(){
  'use strict';
  var themes={system:'Automático',light:'Claro',dark:'Escuro',ocean:'Oceano',forest:'Floresta',sunset:'Pôr do sol',rose:'Rosa',coffee:'Café'};
  var selected='system',key='huba:theme:v1';
  try{var saved=localStorage.getItem(key);if(Object.prototype.hasOwnProperty.call(themes,saved))selected=saved}catch(e){}
  function apply(theme){
    selected=theme;
    if(theme==='system')document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme',theme);
  }
  apply(selected);
  function buildSettings(){
    var nav=document.createElement('nav');nav.className='huba-settings';nav.setAttribute('aria-label','Configurações do HUBA');
    var menu=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent='⚙';summary.title='Configurações';summary.setAttribute('aria-label','Configurações');menu.appendChild(summary);
    var content=document.createElement('div');content.className='huba-settings-content';
    var heading=document.createElement('strong');heading.textContent='Configurações';content.appendChild(heading);
    var dropdown=document.createElement('details'),label=document.createElement('summary');label.textContent='Tema';dropdown.appendChild(label);
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
    dropdown.appendChild(options);content.appendChild(dropdown);menu.appendChild(content);nav.appendChild(menu);document.body.appendChild(nav);
    nav.addEventListener('keydown',function(e){if(e.key==='Escape'){menu.open=false;summary.focus();e.preventDefault();e.stopPropagation()}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSettings);else buildSettings();
})();
