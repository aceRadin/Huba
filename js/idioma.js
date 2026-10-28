/* Traduções da interface. Textos originais ficam associados aos nós para permitir
 * alternar idioma sem reconstruir partidas, áudio, formulários ou tabuleiros. */
(function(){
'use strict';
var lang='pt', originals=new WeakMap(),attributes=new WeakMap();
try{if(localStorage.getItem('huba:language:v1')==='en')lang='en'}catch(e){}
var phrases={
 'Jogos':'Games','Streak diário do HUBA':'HUBA daily streak','dias de streak diário':'daily streak days','dias seguidos':'days in a row','dia seguido':'day in a row',
 'Configurações do HUBA':'HUBA settings','Configurações':'Settings','Tema do site':'Site theme','Tema':'Theme','Automático':'Automatic','Claro':'Light','Escuro':'Dark','Oceano':'Ocean','Floresta':'Forest','Pôr do sol':'Sunset','Rosa':'Rose','Café':'Coffee','Meia-noite':'Midnight','Esmeralda':'Emerald','Ametista':'Amethyst','Grafite':'Graphite',
 'Diário':'Daily','Aleatório':'Random','Desafiador':'Challenging','Dificuldade do Musical':'Musical difficulty','Dificuldade':'Difficulty','Desafio do dia':'Daily challenge','Jogue quantas vezes quiser':'Play as often as you like','Uma música por categoria a cada dia.':'One song per category each day.',
 'Voltar à tela inicial':'Back to the home page','Voltar aos jogos':'Back to games','Voltar':'Back','Nova rodada':'New round','Outra música':'Another song','Jogar de novo':'Play again','Próxima':'Next','Ver resultado':'See results',
 'Gostou do HUBA?':'Enjoying HUBA?','Ajude a manter os jogos gratuitos e a criar novidades!':'Help keep the games free and support new ones!','Apoio opcional · Todos os jogos continuam gratuitos.':'Optional support · All games remain free.','Apoie o desenvolvimento do HUBA':'Support HUBA development','Apoiar HUBA':'Support HUBA','Configure o endereço em js/apoio-config.js':'Set the address in js/apoio-config.js','Mostrar apoio ao HUBA':'Show HUBA support','Recolher apoio ao HUBA':'Collapse HUBA support','Mostrar doações':'Show donations','Recolher doações':'Collapse donations',
 'Tocar trecho':'Play clip','Parar':'Stop','Ouvir trecho':'Play clip','Ouvir novamente':'Listen again','Silenciar':'Mute','Ativar som':'Unmute','Volume do áudio':'Audio volume','Volume do Bits':'Bits volume','Progresso do trecho':'Clip progress','Trocar somente a música que falhou':'Replace only the song that failed',
 'Qual música tocou?':'Which song played?','Qual é a música?':'What is the song?','Reconhece este trecho?':'Recognize this clip?','Reconheça a música pelo começo. São até seis tentativas: cada erro revela um trecho maior.':'Recognize the song from its beginning. You have six guesses: each mistake reveals a longer clip.',
 'Pesquise artista ou nome da música':'Search for an artist or song title','Selecione uma música da lista.':'Select a song from the list.','Confirmar palpite':'Submit guess','Pular (+ trecho)':'Skip (+ longer clip)','Sortear outra música':'Pick another song','Selecionada: ':'Selected: ','Música: ':'Song: ','Seu palpite: ':'Your guess: ',
 'Finalizado':'Finished','Concluído':'Completed','Pulou a tentativa':'Skipped guess','Palpite registrado':'Guess recorded','Artista correto — música incorreta':'Correct artist — wrong song','Fim das tentativas':'No guesses left',
 'Você acertou todas!':'You got them all!','Você acertou!':'You got it!','Não foi dessa vez':'Not this time','Acertou!':'Correct!','Errou. A resposta era a marcada em verde.':'Incorrect. The correct answer is marked in green.','Acertou':'Correct','Errou':'Incorrect',
 'Você pode ouvir o trecho quantas vezes quiser antes de responder.':'You can replay the clip as often as you like before answering.','Você já tentou essa música. Escolha outra.':'You already guessed this song. Choose another.','Tentativa pulada. Agora o trecho ficou maior.':'Guess skipped. A longer clip is now available.','Não foi dessa vez. Ouça um trecho maior!':'Not quite. Listen to a longer clip!','Você pode tentar outra música no modo Aleatório.':'You can try another song in Random mode.','A lista continua carregando.':'The list is still loading.',
 'Nenhuma música encontrada.':'No songs found.','Busca incompleta: retome o carregamento no contador de músicas.':'Incomplete search: resume loading using the song counter.','Buscando nas músicas que ainda estão chegando…':'Searching songs that are still loading…',
 'Carregando prévia da música…':'Loading the song preview…','Aguarde o carregamento da prévia…':'Please wait for the preview to load…','Você pode ouvir o trecho antes de responder.':'You can listen to the clip before answering.','Atualizando a prévia desta música…':'Refreshing this song’s preview…','Prévia atualizada. Tente ouvir novamente.':'Preview refreshed. Try listening again.','Prévia atualizada. Tente tocar novamente.':'Preview refreshed. Try playing again.',
 'Esta prévia não tocou. Sorteie outra música sem perder a rodada.':'This preview could not play. Pick another song without losing the round.','Esta música não pôde ser reproduzida. Você pode sortear outra sem perder a tentativa.':'This song could not play. You can pick another without losing an attempt.','Não há outra música disponível nesta categoria. Carregue mais músicas.':'No other songs are available in this category. Load more songs.','Nova música sorteada. Suas tentativas foram reiniciadas sem penalidade.':'New song selected. Your guesses were reset without a penalty.',
 'Nenhuma outra música disponível nesta categoria. Você pode voltar e carregar outras fontes.':'No other songs are available in this category. You can go back and load other sources.',
 'Escolha um gênero para carregar suas músicas.':'Choose a genre to load songs.','Escolha um gênero para carregar apenas suas playlists.':'Choose a genre to load only its playlists.','As músicas são carregadas ao escolher o gênero.':'Songs load when you choose a genre.','Aguardando gênero…':'Waiting for a genre…','Carregando gênero…':'Loading genre…','Carregando músicas de ':'Loading songs from ',' músicas carregadas neste gênero':' songs loaded in this genre',' músicas carregadas':' songs loaded',' músicas · catálogo EUA':' songs · US catalog','Músicas carregadas sob demanda':'Songs load on demand',
 'Catálogo dos Estados Unidos · Top reúne Pop, Rock e Rap.':'United States catalog · Top combines Pop, Rock and Rap.','Preparando todas as músicas para manter o desafio diário consistente…':'Preparing all songs to keep the daily challenge consistent…','Preparando o catálogo completo para manter o desafio diário igual para todos…':'Preparing the full catalog to keep the daily challenge the same for everyone…',
 'Carregamento pausado. As músicas já obtidas continuam disponíveis.':'Loading paused. Songs already loaded remain available.','Algumas páginas falharam. Você pode retomar o carregamento.':'Some pages failed. You can resume loading.','O diário precisa de todas as páginas.':'The daily challenge needs every page.','O diário precisa de todas as fontes.':'The daily challenge needs every source.','Tente novamente para carregar o ranking.':'Try again to load the chart.','Falha ao carregar gênero. Clique novamente para tentar.':'Could not load the genre. Click again to retry.','Poucas músicas disponíveis nesta categoria.':'Not enough songs in this category.','Nenhuma música disponível nesta categoria.':'No songs available in this category.','Carregue músicas antes de jogar.':'Load songs before playing.','Nenhuma fonte configurada em playlists.js.':'No sources configured in playlists.js.',
 'O catálogo americano de hoje ainda não foi publicado. Tente mais tarde.':'Today’s US catalog has not been published yet. Please try later.','O catálogo americano ainda não foi publicado.':'The US catalog has not been published yet.','Catálogo americano inválido':'Invalid US catalog','Catálogo incompleto':'Incomplete catalog','Faixa inválida':'Invalid track','A música do diário salvo não está disponível no catálogo. Tente carregar novamente mais tarde.':'The saved daily song is not available in the catalog. Try loading again later.',
 'carregamento pausado':'loading paused','carregando…':'loading…','concluído':'complete','pausado':'paused','indisponível':'unavailable','Retomar':'Resume','Tentar carregar novamente':'Retry loading',
 'Desafio diário':'Daily challenge','Rodada do dia.':'Daily round.','Rodada aleatória.':'Random round.','Rodada aleatória':'Random round',
 'Acerte até errar. Cada acerto exige uma escolha de dificuldade permanente.':'Keep guessing until you miss. Each correct answer requires a permanent difficulty choice.',
 'Acertou! Escolha a dificuldade da próxima rodada':'Correct! Choose the difficulty for the next round','A dificuldade escolhida se acumula e permanece até você errar.':'Your chosen difficulty stacks and lasts until you miss.',
 'Acertou! Escolha a dificuldade para a próxima rodada.':'Correct! Choose the difficulty for the next round.','Errou! Fim da sequência.':'Incorrect! Your streak has ended.','Desafio de hoje concluído':'Today’s challenge is complete','Sua sequência diária: ':'Your daily streak: ','Sequência encerrada: ':'Streak ended: ','Sequência: ':'Streak: ','Rodada ':'Round ','Recorde em ':'Best in ','Recorde: ':'Best: ',
 'Máximo de 15 alternativas':'Maximum of 15 choices','Máximo de músicas disponíveis: ':'Maximum available songs: ','Tempo mínimo: 1,5 s':'Minimum time: 1.5 s','Limites máximos atingidos! Qual música tocou?':'Maximum limits reached! Which song played?','Tempo mínimo atingido: +1 alternativa automática. Qual música tocou?':'Minimum time reached: +1 automatic choice. Which song played?','Máximo de alternativas: trecho reduzido automaticamente em 5%. Qual música tocou?':'Maximum choices reached: clip automatically shortened by 5%. Which song played?',
 'Prévia indisponível. Música substituída sem perder sua sequência.':'Preview unavailable. Song replaced without losing your streak.','Não foi possível carregar esta prévia. Sorteie outra música sem perder sua sequência.':'Could not load this preview. Pick another song without losing your streak.','Nenhuma prévia disponível. Tente novamente sem perder sua sequência.':'No preview available. Try again without losing your streak.','Carregando músicas para a próxima rodada. Sua sequência está preservada…':'Loading songs for the next round. Your streak is safe…','Não foi possível carregar a próxima rodada. Tente novamente sem perder sua sequência.':'Could not load the next round. Try again without losing your streak.','Não há mais músicas disponíveis.':'No more songs available.',
 'Estatísticas':'Statistics','Idioma das palavras':'Word language','A mesma palavra para todos no dia.':'The same word for everyone each day.','Palavras novas sempre que quiser.':'New words whenever you like.','Selecionar arquivos…':'Select files…','Atualizar arquivos…':'Update files…','Esquecer arquivos salvos':'Forget saved files','Carregando as listas de palavras…':'Loading word lists…','Digite 5 letras':'Enter 5 letters','Preencha o espaço em branco':'Fill the blank space','Palavra não aceita':'Word not accepted','Pula uma posição, deixando um espaço em branco':'Skip a position, leaving a blank space','espaço':'space',
 'Verde: posição certa · Amarelo: letra em outro lugar · Apagada: não está em nenhuma palavra · Espaço: deixa uma casa em branco (·) para preencher depois':'Green: correct position · Yellow: letter in another position · Dimmed: absent from all words · Space: leaves a blank (·) to fill later',
 'jogos':'games','vitórias':'wins','sequência':'streak','melhor':'best','jogar':'play','carregando':'loading','sem lista':'no list','venceu':'won','não foi dessa vez':'not this time','em andamento':'in progress','Fechar':'Close',
 'palpites validados':'validated guesses','palpites livres':'unrestricted guesses','lidas de ':'read from ',' salvo neste navegador':' saved in this browser','arquivo inválido: ':'invalid file: ','português':'Portuguese','inglês':'English','palavras':'words','palavra':'word','tentativas':'guesses','tentativa':'guess',
 'Em breve':'Coming soon','Artista não informado':'Artist unavailable','precisão ':'accuracy ',
 'Falha de rede ao consultar o Deezer':'Network error contacting Deezer','O Deezer demorou para responder':'Deezer took too long to respond','Resposta de músicas inválida':'Invalid song response','Página do Deezer não autorizada':'Unauthorized Deezer page','Paginação repetida no Deezer':'Repeated Deezer pagination','Nenhuma playlist configurada para ':'No playlist configured for ',
 'Carregamento cancelado':'Loading cancelled','Prévia indisponível':'Preview unavailable'
};
phrases['Nenhuma lista carregada. Coloque words.json e palavra.json na pasta dados/ do HUBA e abra por um servidor local, ou selecione os arquivos aqui: eles ficam salvos neste navegador.']='No word list loaded. Put words.json and palavra.json in the HUBA dados/ folder and use a local server, or select the files here to save them in this browser.';
phrases['Configurar as fontes em jogos/bits/playlists.js.']='Configure sources in jogos/bits/playlists.js.';
phrases['Trecho 5% menor na próxima rodada']='Clip 5% shorter next round';
phrases['Português']='Portuguese';
var entries=Object.keys(phrases).sort(function(a,b){return b.length-a.length});
var escaped=entries.map(function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')});
var matcher=new RegExp(escaped.join('|'),'g');
function translate(text){
 if(lang!=='en')return text;
 if(phrases[text])return phrases[text];
 var files=[];
 var out=text.replace(/[\w/-]+\.(?:js|json|html|css)\b/g,function(file){files.push(file);return '\uE000'+(files.length-1)+'\uE001'})
 .replace(/Você acertou (\d+) de (\d+)/g,'You got $1 out of $2 correct')
 .replace(/Acertou em (\d+) de (\d+) tentativas\./g,'Correct in $1 out of $2 guesses.')
 .replace(/Pergunta (\d+) de (\d+)/g,'Question $1 of $2')
 .replace(/Ouça o trecho de ([\d,]+) segundos e escolha qual música tocou\. São (\d+) perguntas\./g,'Listen to the $1-second clip and choose the song. There are $2 questions.')
 .replace(/Em (\d+) tentativas?\./g,function(_,n){return 'In '+n+(n==='1'?' guess.':' guesses.')})
 .replace(/\+1 alternativa na próxima rodada/g,'+1 choice next round')
 .replace(/Trecho ([\d,.]+%) menor/g,'Clip $1 shorter')
 .replace(/de chance de \+1 alternativa/g,'chance of +1 choice')
 .replace(/Punição ativada! Chance de ([\d,.]+%): \+1 alternativa adicionada\./g,'Penalty triggered! $1 chance: +1 choice added.')
 .replace(/(\d+) opções/g,'$1 choices').replace(/(\d+) acertos/g,'$1 correct')
 .replace(/Precisa de (\d+)\+ músicas/g,'Needs $1+ songs').replace(/precisa de (\d+)\+ músicas/g,'needs $1+ songs')
 .replace(/\bfeito:/g,'done:').replace(/\bFeito ·/g,'Done ·').replace(/Música (\d+)/g,'Song $1')
 .replace(/A palavra era: /g,'The word was: ').replace(/As palavras eram: /g,'The words were: ');
 return out.replace(matcher,function(match){return phrases[match]}).replace(/\uE000(\d+)\uE001/g,function(_,i){return files[Number(i)]});
}
function protectedText(el){return el.closest('script,style,.w-tile,.musical-option-title,.musical-option-artist,.bits-choice,[data-no-translate]')}
function textValue(node){
 var value=node.nodeValue,record=originals.get(node);
 if(!record||value!==record.output)record={input:value,output:value};
 var el=node.parentElement;if(!el||protectedText(el))return;
 var input=record.input,output;
 // Nomes de músicas, artistas e respostas não fazem parte da tradução da interface.
 if(el.matches('#finishSong,#selectedText,.musical-recap-guess')){
   var prefix=/^(Música: |Selecionada: |Seu palpite: )/.exec(input);
   output=prefix?translate(prefix[0])+input.slice(prefix[0].length):translate(input);
 }else if(el.matches('.bits-history-line')&&!/Pulou a tentativa|Palpite registrado/.test(input))output=input;
 else if(el.matches('#wResText')&&/^(A palavra era: |As palavras eram: )/.test(input)){var split=input.indexOf(': ')+2;output=translate(input.slice(0,split))+input.slice(split)}
 else output=translate(input);
 record.output=output;originals.set(node,record);if(value!==output)node.nodeValue=output;
}
function elementValue(el){
 if(protectedText(el)||el.matches('.musical-option'))return;
 var saved=attributes.get(el)||{};
 ['placeholder','title','aria-label','alt'].forEach(function(key){
  if(!el.hasAttribute(key))return;
  var value=el.getAttribute(key),record=saved[key];
  if(!record||value!==record.output)record={input:value};
  record.output=translate(record.input);saved[key]=record;if(value!==record.output)el.setAttribute(key,record.output);
 });attributes.set(el,saved);
}
function apply(root){
 if(root.nodeType===3){textValue(root);return}
 if(root.nodeType!==1&&root.nodeType!==9)return;
 if(root.nodeType===1)elementValue(root);
 var walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT),node;
 while((node=walker.nextNode())){if(node.nodeType===3)textValue(node);else elementValue(node)}
}
function setLanguage(value){
 lang=value==='en'?'en':'pt';try{localStorage.setItem('huba:language:v1',lang)}catch(e){}
 document.documentElement.lang=lang==='en'?'en':'pt-BR';apply(document);
 document.querySelectorAll('[data-site-lang]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.siteLang===lang))});
 document.dispatchEvent(new CustomEvent('huba:language',{detail:lang}));
}
function build(){
 var nav=document.createElement('nav');nav.className='huba-language';nav.setAttribute('aria-label','Site language');nav.dataset.noTranslate='';
 [['pt','Português'],['en','English']].forEach(function(option){var b=document.createElement('button');b.type='button';b.dataset.siteLang=option[0];b.textContent=option[1];b.setAttribute('aria-pressed',String(lang===option[0]));b.onclick=function(){setLanguage(option[0])};nav.appendChild(b)});
 var header=document.querySelector('.landing-top');
 if(header){header.appendChild(nav);document.body.classList.add('home-header-language')}else document.body.appendChild(nav);
 document.documentElement.lang=lang==='en'?'en':'pt-BR';apply(document);
 new MutationObserver(function(records){records.forEach(function(r){if(r.type==='childList')r.addedNodes.forEach(apply);else if(r.type==='characterData')textValue(r.target);else elementValue(r.target)})}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','alt']});
}
window.HUBA_I18N={get language(){return lang},setLanguage:setLanguage,translate:translate,isText:function(el,text){return el.textContent===text||el.textContent===translate(text)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
