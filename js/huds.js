/* Só muda a apresentação: mantém os mesmos controles e a partida em andamento. */
(function(){
'use strict';
var key='huba:hud:v1',selected='original';
var choices=[['original','Original','Original'],['focus','Foco','Focus'],['studio','Estúdio','Studio'],['arcade','Arcade','Arcade'],['terminal','Terminal','Terminal'],['panel','Painel','Dashboard']];
try{var saved=localStorage.getItem(key)||localStorage.getItem('huba:bits:hud:v1');if(choices.some(function(c){return c[0]===saved}))selected=saved}catch(e){}
document.documentElement.dataset.hud=selected;
document.documentElement.dataset.bitsHud=selected;
function build(){
 var toolbar=document.querySelector('.huba-language');if(!toolbar)return;
 var menu=document.createElement('details');menu.className='bits-hud-menu';menu.dataset.noTranslate='';
 var title=document.createElement('summary');title.textContent='🖥️';menu.appendChild(title);
 var list=document.createElement('div');list.className='bits-hud-options';menu.appendChild(list);
 choices.forEach(function(choice){
   var b=document.createElement('button');b.type='button';b.dataset.bitsHudChoice=choice[0];
   b.onclick=function(){selected=choice[0];document.documentElement.dataset.hud=selected;document.documentElement.dataset.bitsHud=selected;try{localStorage.setItem(key,selected)}catch(e){}update();menu.open=false;title.focus()};list.appendChild(b);
 });
 function update(){
   var en=window.HUBA_I18N&&HUBA_I18N.language==='en';
   title.title=en?'Game layout':'Visual dos jogos';title.setAttribute('aria-label',title.title);
   list.querySelectorAll('button').forEach(function(b,i){b.textContent=choices[i][en?2:1];b.setAttribute('aria-pressed',String(selected===choices[i][0]))});
 }
 function position(){var rect=title.getBoundingClientRect();list.style.left=Math.max(8,Math.min(rect.left,innerWidth-208))+'px';list.style.top=(rect.bottom+8)+'px';list.style.maxHeight=Math.max(100,innerHeight-rect.bottom-24)+'px'}
 menu.addEventListener('toggle',function(){if(menu.open)position()});window.addEventListener('resize',function(){if(menu.open)position()});
 window.addEventListener('scroll',function(){if(menu.open)position()},true);
 menu.addEventListener('keydown',function(e){if(e.key==='Escape'){menu.open=false;title.focus();e.preventDefault();e.stopPropagation()}});
 document.addEventListener('click',function(e){if(!menu.contains(e.target))menu.open=false});
 document.addEventListener('huba:language',update);document.addEventListener('huba:mode',function(){menu.open=false});
 toolbar.insertBefore(menu,toolbar.firstChild);update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
