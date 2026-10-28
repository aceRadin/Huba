# Idioma e sequências diárias

As bandeiras do Brasil e dos Estados Unidos selecionam Português / English no cabeçalho. Elas têm rótulos acessíveis e dicas com os nomes dos idiomas. A escolha é salva no navegador em `huba:language:v1`.

À esquerda das bandeiras ficam o botão de temas e o seletor Diário/Treino. O tema deixou o canto inferior esquerdo e continua com as mesmas cores e preferências salvas. O modo padrão é Diário; a escolha é salva em `huba:mode:v1` e acompanha a navegação entre jogos. Cada jogo mostra apenas uma coluna central. Treino usa a mesma lógica aleatória ilimitada que antes ficava na coluna direita; não altera nem apaga o progresso dos desafios diários. Ao trocar de modo durante a partida, o jogo volta à seleção e cancela carregamentos pendentes. Os palpites diários já enviados permanecem salvos; uma rodada de treino abandonada não é convertida em diário. Tema e idioma podem ser alterados sem sair da partida.

`js/idioma.js` reúne as traduções de textos fixos, mensagens numéricas, dicas e rótulos acessíveis. O módulo conserva o texto original de cada elemento e acompanha os textos novos gerados pelos jogos. Assim, a troca de idioma não substitui formulários, tabuleiros ou controles de áudio. Títulos de músicas, artistas, letras digitadas e respostas não são traduzidos. Para acrescentar mensagens, inclua a tradução em `phrases` ou um padrão para os valores dinâmicos e teste os dois sentidos da troca.

No Wording, as palavras acompanham o idioma da página; não há seletor separado. Ao trocar a bandeira durante uma partida, abre-se a partida correspondente ao novo idioma. A partida anterior fica guardada em memória para retomada ao voltar à bandeira anterior, incluindo letras e placeholders. Diários continuam salvos por idioma no navegador. Reiniciar uma rodada limpa essa alternância de partidas aleatórias; o jogo não mistura palpites ou palavras de línguas diferentes. Sem lista do idioma escolhido, o jogo informa que falta a lista, sem mudar para outro idioma silenciosamente.

O streak ao lado de HUBA cresce ao terminar qualquer partida, mesmo perdendo, tanto no Diário quanto no Aleatório. Não exige jogar os quatro jogos nem vencer. Conta no máximo uma vez por data; abrir ou abandonar uma partida não conta. As falhas técnicas que não encerram uma partida também não contam. O dia usa a mesma referência local já utilizada pelo sistema compartilhado de streaks.

O Musical tem uma sequência única: terminar uma partida Casual ou Desafiadora conta para ela, sem duplicar a contagem no mesmo dia. Na primeira execução, conserva-se a maior sequência ativa dos dois modos anteriores e o melhor recorde. Não se somam os dois valores, pois podem representar os mesmos dias. Os dados antigos do Desafiador são mantidos no armazenamento. Não há histórico completo de datas para reconstruir retroativamente a união dos modos; o streak geral novo começa a contar a partir desta versão.

Os streaks individuais de Bits, Wording e Streakal continuam com suas regras diárias anteriores. A descrição extra do cartão Streakal foi removida.

Verificações: `tests/idioma-streak.test.cjs` cobre migração, dias consecutivos, perdas, ambos os modos do Musical, alternância dos idiomas, persistência na navegação, áudio e preservação do tabuleiro. Também foram executados os testes existentes de carregamento, geração americana e Backspace.
