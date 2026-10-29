/* Painel de apoio compartilhado: aparece na página inicial e nos jogos. */
(function(){
'use strict';
var config=window.HUBA_APOIO||{};
var panel=document.createElement('footer');
panel.className='huba-support';
panel.setAttribute('aria-label','Apoie o desenvolvimento do Hubdle');

var heading=document.createElement('div');heading.className='huba-support-title';
var heart=document.createElement('span');heart.className='huba-support-heart';heart.textContent='♡';heart.setAttribute('aria-hidden','true');
var title=document.createElement('strong');title.textContent='Gostou do Hubdle?';
heading.appendChild(heart);heading.appendChild(title);panel.appendChild(heading);

var description=document.createElement('p');description.className='huba-support-description';
description.textContent='Ajude a manter os jogos gratuitos e a criar novidades!';panel.appendChild(description);

var links=document.createElement('div');links.className='huba-support-links';
function supportLink(name,url,variant){
 var link=document.createElement('a');link.className='huba-support-button '+variant;
 link.textContent=name;
 if(typeof url==='string' && /^https:\/\/[^\s]+$/i.test(url)){
   link.href=url;link.target='_blank';link.rel='noopener noreferrer';
 }else{
   link.classList.add('huba-support-disabled');link.removeAttribute('href');
   link.setAttribute('aria-disabled','true');link.title='Configure o endereço em js/apoio-config.js';
 }
 links.appendChild(link);
}
supportLink('☕  Buy Me a Coffee',config.buymeacoffee,'huba-support-coffee');
supportLink('♡  Patreon',config.patreon,'huba-support-patreon');
panel.appendChild(links);

var note=document.createElement('small');note.className='huba-support-note';
note.textContent='Apoio opcional · Todos os jogos continuam gratuitos.';panel.appendChild(note);
if(document.body.dataset.supportCollapse==='wording'){
  var dropdown=document.createElement('details');dropdown.className='huba-support-dropdown';dropdown.open=true;
  var toggle=document.createElement('summary');toggle.textContent='♡ Apoiar Hubdle';
  dropdown.appendChild(toggle);dropdown.appendChild(panel);document.body.appendChild(dropdown);
  document.body.classList.add('wording-support-ready');
  var collapseTimer;
  function collapse(){clearTimeout(collapseTimer);dropdown.open=false}
  function showBriefly(){clearTimeout(collapseTimer);dropdown.open=true;collapseTimer=setTimeout(collapse,3000)}
  document.addEventListener('huba:word-guess',collapse);
  document.addEventListener('huba:word-screen',showBriefly);
  dropdown.addEventListener('keydown',function(e){if(e.key==='Escape'){collapse();toggle.focus();e.preventDefault();e.stopPropagation()}});
  showBriefly();
}else document.body.appendChild(panel);
})();
