# Idioma e sequências diárias

O botão Português / English fica no canto superior direito de todas as páginas. A escolha é salva no navegador em `huba:language:v1` e não reinicia as partidas.

`js/idioma.js` reúne as traduções de textos fixos, mensagens numéricas, dicas e rótulos acessíveis. O módulo conserva o texto original de cada elemento e acompanha os textos novos gerados pelos jogos. Assim, a troca de idioma não substitui formulários, tabuleiros ou controles de áudio. Títulos de músicas, artistas, letras digitadas e respostas não são traduzidos. Para acrescentar mensagens, inclua a tradução em `phrases` ou um padrão para os valores dinâmicos e teste os dois sentidos da troca.

No Wording, o idioma da interface e o das palavras são escolhas separadas: a seleção de palavras em Português/English continua disponível. Sem preferência anterior de palavras salva, uma nova página usa o idioma da interface como padrão. Alterar a interface durante a partida preserva as palavras já sorteadas.

O streak ao lado de HUBA cresce ao terminar qualquer partida, mesmo perdendo, tanto no Diário quanto no Aleatório. Não exige jogar os quatro jogos nem vencer. Conta no máximo uma vez por data; abrir ou abandonar uma partida não conta. As falhas técnicas que não encerram uma partida também não contam. O dia usa a mesma referência local já utilizada pelo sistema compartilhado de streaks.

O Musical tem uma sequência única: terminar uma partida Casual ou Desafiadora conta para ela, sem duplicar a contagem no mesmo dia. Na primeira execução, conserva-se a maior sequência ativa dos dois modos anteriores e o melhor recorde. Não se somam os dois valores, pois podem representar os mesmos dias. Os dados antigos do Desafiador são mantidos no armazenamento. Não há histórico completo de datas para reconstruir retroativamente a união dos modos; o streak geral novo começa a contar a partir desta versão.

Os streaks individuais de Bits, Wording e Streakal continuam com suas regras diárias anteriores. A descrição extra do cartão Streakal foi removida.

Verificações: `tests/idioma-streak.test.cjs` cobre migração, dias consecutivos, perdas, ambos os modos do Musical, alternância dos idiomas, persistência na navegação, áudio e preservação do tabuleiro. Também foram executados os testes existentes de carregamento, geração americana e Backspace.
