/* Só consulta metadados públicos; não toca áudio nem consulta o Deezer. */
import {dayKey} from './gerar-bits-artistas.mjs';
import {offsetDay} from './preparar-catalogos.mjs';
const base=process.argv[2];
if(!base)throw Error('Informe a URL publicada do site.');
const today=dayKey();
async function check(){
 const url=new URL('dados/saude.json',base);url.searchParams.set('check',Date.now());
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!response.ok)throw Error('Monitor: HTTP '+response.status);
 const status=await response.json();
 if(status.schema!==1||status.date!==today||status.readyThrough<offsetDay(today,1))throw Error('Monitor: agenda diária desatualizada ou sem reserva para amanhã.');
 for(const folder of ['playlists','bits-artistas']){
   const config=await fetch(new URL('dados/'+folder+'/config.js?check='+Date.now(),base),{signal:AbortSignal.timeout(20000),cache:'no-store'});
   if(!config.ok||!(await config.text()).includes('"enabled":true'))throw Error('Monitor: catálogo desativado em '+folder);
 }
 console.log('Publicação verificada: '+JSON.stringify(status));
}
// Aguarda a propagação do Pages, com limite; uma falha aparece no Actions.
for(let attempt=0;;attempt++){try{await check();break}catch(e){if(attempt===4)throw e;await new Promise(r=>setTimeout(r,15000))}}
