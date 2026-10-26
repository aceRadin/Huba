/* Rodapé compartilhado: carregado em todas as páginas. */
(function(){
'use strict';
var config=window.HUBA_APOIO||{};
var bar=document.createElement('footer');bar.className='huba-support';bar.setAttribute('aria-label','Apoiar e sugerir melhorias para o HUBA');
var caption=document.createElement('span');caption.className='huba-support-label';caption.textContent='Apoie o HUBA';bar.appendChild(caption);
function supportLink(text,url){
 var a=document.createElement('a');a.className='huba-support-button';a.textContent=text;
 if(typeof url==='string'&&/^https:\/\/[^\s]+$/i.test(url)){a.href=url;a.target='_blank';a.rel='noopener noreferrer'}
 else{a.classList.add('huba-support-disabled');a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.title='Configure este link em js/apoio-config.js'}
 bar.appendChild(a);return a;
}
supportLink('Patreon',config.patreon);supportLink('Buy Me a Coffee',config.buymeacoffee);
var suggestion=document.createElement('button');suggestion.type='button';suggestion.className='huba-support-button';suggestion.textContent='Sugestões';bar.appendChild(suggestion);
document.body.appendChild(bar);
var dialog=document.createElement('dialog');dialog.className='huba-feedback-dialog';
var heading=document.createElement('h2');heading.textContent='Enviar uma sugestão';dialog.appendChild(heading);
var note=document.createElement('p');note.textContent='Conte sua ideia ou relate um problema. Você pode copiar a mensagem ou, quando houver e-mail configurado, enviá-la por seu aplicativo de e-mail.';dialog.appendChild(note);
var field=document.createElement('textarea');field.rows=5;field.placeholder='Minha sugestão para o HUBA é…';field.setAttribute('aria-label','Texto da sugestão');dialog.appendChild(field);
var actions=document.createElement('div');actions.className='huba-feedback-actions';
var copy=document.createElement('button');copy.type='button';copy.textContent='Copiar sugestão';actions.appendChild(copy);
var mail=document.createElement('button');mail.type='button';mail.textContent='Abrir e-mail';if(!config.sugestoesEmail||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.sugestoesEmail)){mail.disabled=true;mail.title='Configure sugestoesEmail em js/apoio-config.js'}actions.appendChild(mail);
var close=document.createElement('button');close.type='button';close.textContent='Fechar';close.addEventListener('click',function(){dialog.close()});actions.appendChild(close);dialog.appendChild(actions);
var status=document.createElement('p');status.setAttribute('role','status');status.className='huba-feedback-status';dialog.appendChild(status);document.body.appendChild(dialog);
suggestion.addEventListener('click',function(){status.textContent='';dialog.showModal();field.focus()});
copy.addEventListener('click',function(){if(!field.value.trim()){status.textContent='Escreva sua sugestão primeiro.';return}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(field.value).then(function(){status.textContent='Sugestão copiada!'},function(){field.select();status.textContent='Selecione e copie o texto com Ctrl+C.'})}else{field.select();status.textContent='Texto selecionado. Pressione Ctrl+C para copiar.'}});
mail.addEventListener('click',function(){if(mail.disabled||!field.value.trim()){status.textContent='Escreva sua sugestão primeiro.';return}var uri='mailto:'+config.sugestoesEmail+'?subject='+encodeURIComponent('Sugestão para o HUBA')+'&body='+encodeURIComponent(field.value);window.location.href=uri});
})();
