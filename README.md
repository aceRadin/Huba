# HUBA — Catálogo musical único

Agora **Musical e Bits usam a mesma lista** de playlists em `playlists.js`, na raiz. O arquivo contém somente `window.HUBA_MUSICAS.fontes`. Para adicionar outro jogo musical, consulte essa mesma propriedade. Os jogos continuam com lógica e estatísticas próprias.

## Configurar

Abra `playlists.js` e edite os IDs ou links dentro da lista `fontes`. Os IDs enviados foram preservados. Cada linha tem o formato:

```js
'rock: playlist:1306931615, playlist:4047160366'
```

As categorias configuradas são `rock`, `metal`, `pop` e `anime`; o Bits também combina as quatro em `geral`.

## Publicar no GitHub Pages

1. Descompacte e copie **o conteúdo interno** desta pasta para a **raiz** do repositório (não aninhe outra pasta HUBA).
2. Confira se existem `index.html` e `playlists.js` **lado a lado** na raiz.
3. No GitHub Desktop, clique **Commit** e **Push origin**.
4. Em GitHub → Actions, confira se o Pages publicou o último commit.
5. Abra `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/playlists.js`. Você deve ver a lista com `fontes:`. Se mostrar 404, conteúdo anterior, ou uma página HTML, o caminho/branch/publicação estão errados.
6. Atualize as páginas do Musical e do Bits com Ctrl+Shift+R. Os scripts de configuração receberam `?v=2` para ajudar a evitar cache antigo.

**Atenção:** se o GitHub Pages usar uma branch ou pasta diferente de `main` / `/(root)`, publique os arquivos **nesse local configurado**.

## Sobre funcionamento

As fontes são as mesmas para Musical e Bits. Ambos consultam o Deezer independentemente quando a página é aberta; por isso o número exato de prévias disponíveis pode variar conforme falhas da API ou limites de acesso. O Musical e o Bits podem ter jogos e filtros de exibição diferentes, mas partem das mesmas playlists. Não há servidor nem chave privada no site.

Se o arquivo `playlists.js` for encontrado e as músicas ainda não aparecerem, inspecione F12 → Console e Rede (Network); pode ser um problema separado de disponibilidade da API Deezer.

O uso público de prévias deve respeitar as condições do Deezer e os direitos musicais aplicáveis.

## Atualização Bits — Enter e botões

- Confirmar palpite agora fica antes de Pular (+ trecho).
- Enter escolhe a primeira sugestão se o dropdown estiver aberto.
- Se estiver fechado e houver uma música selecionada, Enter confirma mesmo sem foco no campo de busca.
- Enter em outros botões mantém seu comportamento natural.


## Rodapé de apoio e sugestões
O rodapé discreto aparece na página inicial e em todos os jogos. Configure seus links de Patreon, Buy Me a Coffee e o e-mail para sugestões em `js/apoio-config.js`. Enquanto os URLs não forem informados, Patreon/Buy Me a Coffee ficam desativados (nenhum endereço fictício é enviado). O botão Apoio abre um formulário: o visitante pode copiar a sugestão; o envio por e-mail fica disponível quando você configurar `buymeacoffee`. Não existe banco de dados nem envio automático no GitHub Pages.

## Indicador de carregamento
Musical e Bits mostram `Loading…` nos cartões enquanto carregam as fontes, sem exibir contagens por categoria. Após o carregamento, o total de faixas aparece no canto inferior direito. Os resultados de desafios diários finalizados continuam visíveis nos cartões.


## Painel de apoio

O rodapé compacto aparece no HUBA e nos três jogos, com botões Buy Me a Coffee e Patreon. Configure os links em `js/apoio-config.js`. Botões ficam desabilitados enquanto não forem configurados. O botão Sugestões foi removido.

O catálogo atualizado de 16 playlists está em `playlists.js`.

### Musical — alternativas com capa

As quatro opções agora aparecem lado a lado, com a capa do Deezer e os nomes da música e do artista. Sem imagem disponível, aparece um ícone musical. Arquivos alterados: `jogos/musicle/index.html`, `jogos/musicle/musicle.js`, e novo `jogos/musicle/musical-opcoes.css`.
