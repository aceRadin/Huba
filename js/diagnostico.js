/* Diagnóstico local e limitado à aba. Não envia telemetria nem registra palpites. */
(function(){
'use strict';
var errors=[];
function record(type,message){errors.push({time:new Date().toISOString(),type:type,message:String(message).slice(0,300)});if(errors.length>20)errors.shift()}
window.addEventListener('error',function(e){
 if(e.target&&e.target!==window){
   if(e.target.tagName==='SCRIPT')record('script','Falha ao carregar '+new URL(e.target.src,location.href).pathname);
 }else record('javascript',e.message||'Erro de JavaScript');
},true);
window.addEventListener('unhandledrejection',function(e){record('promise',e.reason&&e.reason.message||'Operação assíncrona falhou')});
window.HUBA_DIAGNOSTICS={report:function(){return {page:location.pathname,language:document.documentElement.lang,errors:errors.slice()}}};
})();
