# Musical e Streakal: playlists preparadas antes da publicação

Os dois jogos continuam usando **o mesmo `playlists.js`**, com todos os gêneros atuais. O arquivo não foi modificado. No GitHub Pages, o workflow **Publicar Hubdle** agora percorre as playlists antes de publicar e grava um catálogo completo por gênero. Não limita a quantidade de músicas das playlists.

## Antes e agora

Antes, cada jogador consultava as playlists do gênero e seguia suas páginas no Deezer. O Treino começava com um lote pequeno; o Diário aguardava todas as páginas.

Agora, o Actions faz esse trabalho uma vez. O navegador recebe uma pequena configuração e, ao clicar em um gênero, baixa somente o arquivo daquele gênero. Musical e Streakal usam os mesmos arquivos, que podem ser reaproveitados pelo cache normal do navegador. O contador mostra as músicas válidas e a conclusão assim que o arquivo chega. Nenhum catálogo de outro gênero é baixado antecipadamente.

O arquivo contém dados das músicas e endereços de prévias, não os áudios. Prévia vencida continua sendo renovada pelo ID: Musical tenta a mesma música antes de oferecer substituição; Streakal mantém a atualização por pergunta e a recuperação sem perder sequência. O trecho repetido, as dificuldades, as perguntas, os debuffs e os recordes permanecem sob controle dos jogos existentes.

## Paginação e consistência

O gerador `scripts/gerar-playlists.mjs` executa o próprio `js/deezer.js` com uma função de consulta apropriada para Node. Assim, utiliza as mesmas regras para `next`, páginas de 100, títulos, fontes por artista, prévias válidas e duplicatas. Playlists compartilhadas entre gêneros reutilizam as páginas já obtidas durante a geração. Há uma requisição por vez, pausa entre pedidos e novas tentativas com espera crescente.

Os catálogos prontos passam pelo mesmo filtro no navegador. O teste compara a ordem e todos os dados das músicas com o carregamento direto anterior. Os sorteios diários e suas chaves de progresso permanecem iguais. O calendário usado pelos jogos e streaks também não foi alterado; a atualização do catálogo segue São Paulo.

O cache do Actions guarda a lista por data e configuração para que republicações comuns no mesmo dia não modifiquem o catálogo. Mudanças em `playlists.js` ou no carregador/gerador geram outra versão; prefira realizá-las antes de iniciar os desafios do dia. O cache é temporário e pode ser removido pelo GitHub, portanto não é um arquivo histórico permanente.

## Publicar e atualizar

1. Faça **Commit** e **Push origin** das alterações para `main` pelo GitHub Desktop.
2. Em **Settings → Pages**, mantenha **Source: GitHub Actions**.
3. Aguarde **Actions → Publicar Hubdle** terminar com sucesso. O passo novo é **Preparar playlists do Musical e Streakal**.
4. Atualize o site com **Ctrl+Shift+R**.

O mesmo workflow publica Bits, Musical e Streakal, em push, execução manual ou diariamente às **00h de São Paulo (03h UTC)**. Gerar playlists grandes pode levar vários minutos no Actions; essa espera não fica com cada jogador. Não há chave secreta nem backend obrigatório.

Se uma playlist estiver inacessível ou a geração não puder terminar, o workflow falha antes de publicar. O site anterior continua disponível. Consulte o erro e use **Re-run all jobs** depois de corrigir a fonte ou aguardar o Deezer.

O agendamento do GitHub pode atrasar. Se o catálogo for de outra data, o Diário informa que está aguardando atualização, em vez de sortear uma lista antiga. O Treino pode usar o catálogo anterior. Falhas de download permitem tentar o gênero novamente, sem mudar silenciosamente para consultas ao vivo.

## Uso local, medições e limitações

O `dados/playlists/config.js` do repositório tem `enabled:false`; o Actions o substitui só ao preparar a publicação. Ao abrir o código diretamente no computador, continua valendo o carregamento progressivo anterior. Isso também preserva o uso via `file://` com internet.

Testes de navegador verificam um catálogo simulado de 300 músicas, cinco perguntas com cinco alternativas no Musical, 40 acertos com até 10 alternativas no Streakal, recuperação do áudio, diários com latências diferentes, cancelamento, falhas e troca de gênero. A melhoria confirmada é estrutural: **um arquivo por gênero, com zero consultas de playlists pelo navegador**. Os tempos de testes usam respostas simuladas; não medem a velocidade real do GitHub Pages ou do Deezer.

Catálogos muito grandes ainda precisam ser transferidos e lidos pelo navegador. O tamanho do arquivo, a conexão e a disponibilidade do áudio continuam influenciando o tempo de entrada. A primeira medição real depende da publicação no GitHub; o workflow remoto não foi executado nesta alteração local.
