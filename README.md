# Hubdle

Quatro jogos gratuitos em HTML, CSS e JavaScript: Musical, Bits, Streakal e Wording. A página publicada é https://aceradin.github.io/Hubdle/.

## Jogos

- **Musical:** cinco perguntas, quatro alternativas no Casual e cinco no Desafiador. O trecho é de sete segundos ou 1,5 segundo. As dificuldades compartilham o streak.
- **Bits:** seis tentativas para reconhecer a música. Diário usa até cinco faixas por artista; Treino usa até quinze. Pop, Rock e Rap têm listas próprias; Top reúne os três.
- **Streakal:** começa com duas alternativas e até 30 segundos. Cada acerto aumenta a dificuldade, até dez opções e 1,5 segundo. A penalidade automática de alternativa extra não reinicia o debuff; apenas a escolha voluntária de +1 alternativa o reinicia.
- **Wording:** uma, duas ou quatro palavras, com seis, sete ou nove tentativas. O idioma acompanha o site. Espaço deixa uma posição vazia; Backspace pode apagar até voltar ao início.

O cabeçalho permite escolher HUD, tema, Diário/Treino e idioma. O Musical também tem dificuldade; o Wording tem estatísticas durante a partida. O streak geral conta qualquer partida concluída, independentemente de vitória. Preferências e históricos ficam neste navegador.

## Diários e salvamento

Todos os jogos usam o dia de **São Paulo**. Uma partida guarda sua data de início: passar da meia-noite não grava os palpites no desafio seguinte. O streak geral conta o dia em que se concluiu uma partida; o streak específico diário pertence à data do desafio. Um resultado antigo não apaga um streak mais recente.

Musical salva as perguntas por ID, alternativas, trechos e palpites. Streakal salva rodada, opções, dificuldade, debuff e estado do sorteio, inclusive na escolha de dificuldade. Bits conserva música, tentativas e reservas; Wording conserva palpites e alvos. Voltar ou recarregar retoma o Diário; Treino continua sendo uma nova partida.

Uma falha de áudio primeiro tenta renovar a mesma faixa pelo ID. Se necessário, o jogo usa uma reserva sem derrota técnica. Reservas no Diário seguem sorteio determinístico e o resultado informa **Com música reserva**. Jogadores que tiveram falhas diferentes podem usar reservas diferentes; esses resultados não devem ser tratados como desafios estritamente idênticos.

## Fontes e publicação

- Musical e Streakal: catálogo compartilhado em [playlists.js](playlists.js).
- Bits: artistas em [jogos/bits/artistas.js](jogos/bits/artistas.js).
- Wording: [dados/palavra.json](dados/palavra.json) e [dados/words.json](dados/words.json). A cópia JavaScript para abrir por file:// é gerada por scripts/gerar-palavras.mjs.

No GitHub Pages, selecione **Settings → Pages → Source → GitHub Actions**. Depois de Commit e Push na main, acompanhe **Actions → Publicar Hubdle**. Não use uma segunda publicação por branch: ela sobrescreveria os catálogos preparados.

O workflow testa o site, prepara os catálogos, publica e verifica o resultado. Executa também às **12h17 e 18h17 de São Paulo**, sujeito à fila do GitHub. Hoje e os próximos dois dias ficam preparados; uma data publicada não muda nas atualizações seguintes. Arquivos de sete dias anteriores permanecem disponíveis para abas antigas. A agenda é guardada no cache do Actions e pode ser recuperada do próprio site se esse cache desaparecer.

Na primeira publicação, o catálogo diário atual é preservado se estiver disponível no site. Alterações de artistas/playlists entram nos novos dias ainda não preparados. Não é preciso executar manualmente todos os dias. Falhas ficam visíveis no Actions; se ultrapassarem a reserva de dias preparados, o Diário avisa e não sorteia silenciosamente outro catálogo.

## Testar localmente

Com Node.js 24 instalado:

~~~sh
npm ci
npx playwright install chromium firefox webkit
npm test
npm run test:browsers
~~~

No Linux, use npx playwright install --with-deps chromium firefox webkit. Os testes simulam o Deezer; alguns reproduzem áudio WAV real para verificar o player. Os testes em WebKit não substituem testes em um iPhone físico.

Pode abrir index.html diretamente no computador. Para testar pelo navegador com HTTP, sirva esta pasta com um servidor estático. Os configs versionados no Git ficam desativados para o uso local; o workflow gera os configs ativos para publicação.

## Diagnóstico e manutenção

- dados/saude.json no site publicado informa a data e até quando há desafios preparados.
- scripts/verificar-publicacao.mjs verifica o site após o deploy.
- No console do navegador, HUBA_DIAGNOSTICS.report() mostra até vinte erros da aba. Não envia telemetria, não guarda palpites e é apagado ao recarregar.
- Ative as notificações de falhas do Actions na sua conta se quiser ser avisado pelo GitHub.
- Não há sincronização entre dispositivos nem proteção contra edição manual do localStorage.

O link de apoio permanece https://buymeacoffee.com/aceradin. A autorização comercial do Deezer e os direitos sobre as músicas precisam ser confirmados antes de monetizar; o funcionamento técnico da API não concede essa autorização. Consulte https://cdn-content.dzcdn.net/pdf/CGU-developers.pdf.

Veja [a explicação desta revisão](docs/revisao-estabilidade.md). Os demais documentos descrevem etapas históricas do desenvolvimento; este README e a revisão de estabilidade descrevem o funcionamento atual.
