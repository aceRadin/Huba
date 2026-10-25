# HUBA — Hub de jogos

Projeto organizado para hospedagem estática, incluindo GitHub Pages.

## Estrutura

- `index.html` — página inicial, com os cartões Musicle, Termo e Bits (futuro jogo), além de espaços vazios.
- `css/style.css` — estilos gerais do site.
- `css/palavras.css` — estilos do Termo, Dueto e Quarteto.
- `js/comum.js` — utilidades e sequências diárias compartilhadas.
- `js/inicio.js` — configura os cartões da página inicial.
- `dados/palavra.json` e `dados/words.json` — dicionários usados no Termo.
- `jogos/musicle/index.html` e `jogos/musicle/musicle.js` — jogo Musicle.
- `jogos/termo/index.html` e `jogos/termo/termo.js` — **um único jogo de palavras** com os três modos Termo, Dueto e Quarteto, nas opções Diário e Aleatório.

O cartão **Bits** está desativado até seu jogo ser desenvolvido. Os outros seis espaços da página inicial estão vazios e reservados para novos jogos.

## Publicação no GitHub Pages

Envie **o conteúdo desta pasta** para a raiz do repositório do GitHub, com `index.html` na raiz. Nas configurações do repositório, em Settings → Pages, use `Deploy from a branch`, `main` e `/(root)`.

## Testar localmente

A partir desta pasta execute `python -m http.server 8000` e abra `http://localhost:8000`. Os JSONs do jogo de palavras são carregados com `fetch`, que pode falhar se você abrir o HTML diretamente por `file://`.

## Adicionar um novo jogo

1. Crie `jogos/nome-do-jogo/index.html` (e seu JavaScript, se necessário).
2. Acrescente no array `games` de `js/inicio.js` um objeto como `{name:'Meu Jogo',path:'jogos/nome-do-jogo/'}`.
3. Para ativar o Bits futuramente, substitua `{name:'Bits',ready:false}` por `{name:'Bits',path:'jogos/bits/'}` após criar essa pasta.

Não é necessário modificar os arquivos do Musicle ou do Termo para criar um jogo independente.

## Observações

Os identificadores das estatísticas e do `localStorage` foram mantidos. O uso das prévias do Deezer em publicação pública e as licenças dos dicionários de terceiros devem ser analisados separadamente.
