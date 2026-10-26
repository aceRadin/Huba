# HUBA — Musical, Wording e Bits

## Como publicar

Envie o **conteúdo desta pasta** para a raiz do repositório do GitHub Pages. É necessário ter `index.html`, `playlists.js`, `css/`, `js/`, `dados/` e `jogos/` na raiz.

## Como definir as playlists (Musical e Bits)

Edite o **único arquivo `playlists.js` na raiz**. Existem duas listas independentes: `musical` e `bits`.

Exemplo de linha dentro da lista `bits`:

```js
'rock: https://www.deezer.com/playlist/123456',
```

Também aceita `rock: playlist:123456` ou nomes de artistas separados por vírgula. Mantenha as aspas e as vírgulas entre as linhas. No Bits, use as categorias `pop`, `anime`, `rock` ou `metal`: a categoria `geral` combina as quatro. No Musical, os nomes de gêneros são livres.

**IMPORTANTE:** o arquivo que você edita é público. Não adicione chaves de API privadas, tokens ou senhas. Depois de editar, faça **Commit** e **Push origin** no GitHub Desktop. As playlists passam a ser as mesmas para todos os visitantes.

Os jogos iniciam as consultas ao Deezer automaticamente ao abrir suas páginas. O carregamento de playlists permanece paginado, consultando `next` até o fim; prévias ausentes e duplicatas são ignoradas. Conforme tamanho da playlist e a disponibilidade da API, isso pode demorar ou falhar. **Não é possível garantir que todas as faixas sejam reproduzíveis.**

Removi os controles de adicionar músicas e arquivos locais das interfaces de Musical e Bits. A configuração anterior em `localStorage` deixa de ser utilizada, mas não foi apagada. Estatísticas e salvamentos dos jogos são preservados.

## Testar

Use Live Server no VS Code ou GitHub Pages. Confira se os cartões de categorias aparecem depois do carregamento e se as prévias estão disponíveis. Não dependa de abrir diretamente por `file://` para testar o site completo.

## Direitos musicais

Usar o Deezer e prévias no site público depende das respectivas permissões e condições de uso; hospedagem no GitHub Pages não fornece direitos de reprodução nem elimina essas restrições.
