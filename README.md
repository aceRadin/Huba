# HUBA — jogos para navegador

Versão organizada para GitHub Pages, com **três páginas principais de jogos**:

- `index.html` — página inicial. Os cartões Musical, Worg e Bits estão ativos; os demais continuam vazios.
- `jogos/musicle/index.html` — Musical (antigo Musicle) (categorias, áudio local e playlists Deezer).
- `jogos/termo/index.html` — Worg com os modos Termo, Dueto e Quarteto, Diário e Aleatório.
- `jogos/bits/index.html` — Bits, jogo de reconhecer músicas por trechos progressivamente mais longos.

## Organização

```text
index.html
css/style.css
css/palavras.css
js/comum.js
js/inicio.js
dados/palavra.json
dados/words.json
jogos/
  musicle/
    index.html
    musicle.js
  termo/
    index.html
    termo.js
  bits/
    index.html
    bits.css
    config.js
    bits.js
```

Para adicionar um novo jogo, crie `jogos/novo-jogo/index.html` e inclua sua página no array `games` em `js/inicio.js`. Os outros jogos não precisam ser alterados.

## Bits: como jogar

- Cinco categorias: **Geral** (todas), **Pop**, **Anime**, **Rock** e **Metal**.
- Duas colunas na página do Bits: **Diário** (uma resposta por categoria e data) e **Aleatório** (repetível).
- Uma única música por partida; **seis tentativas**. Trechos: 1, 2, 4, 7, 11 e 16 segundos, sempre a partir da introdução.
- Digite artista ou música para localizar uma opção e confirme seu palpite. Pular ou errar desbloqueia um trecho maior.
- Progresso do Diário, estatísticas e streak são salvos no `localStorage`; o streak **Bits** aparece no cartão da página inicial.
- A lista padrão de artistas por categoria pode ser editada em `jogos/bits/config.js`.
- O menu **Fontes de músicas e configurações** permite escolher outros artistas ou playlists Deezer ou carregar arquivos do próprio computador. Playlists Deezer têm paginação pelo campo `next`.
- A pesquisa e as respostas do Bits se limitam às músicas carregadas (com prévias válidas); uma música não presente na lista não pode ser escolhida.

### Limites conhecidos

- As fontes Deezer são consultadas diretamente do navegador por JSONP; seu funcionamento depende da disponibilidade e das regras da API. **O uso público ou comercial de prévias precisa de autorização apropriada.** Não há faixas de áudio comerciais incluídas no projeto.
- O desafio diário é determinístico **enquanto os jogadores tiverem o mesmo catálogo carregado**. A API pode retornar catálogos diferentes ou mudar seus resultados, então não há garantia de que todos receberão a mesma música globalmente. Um catálogo fixo/licenciado seria necessário para isso.
- As estatísticas são locais ao navegador e à origem do site, não sincronizadas entre dispositivos.
- Os áudios locais não são enviados nem hospedados pelo site, e precisam ser escolhidos novamente após recarregar.
- A playlist pode conter faixas sem prévia; elas são ignoradas.

## Testar e publicar

Em desenvolvimento, na raiz do projeto:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000/`. Em `file://`, o navegador pode impedir chamadas e armazenamento; por isso recomenda-se Live Server ou servidor local.

No GitHub Pages, envie **o conteúdo desta pasta para a raiz do repositório**, com `index.html`, `css`, `js`, `jogos` e `dados` lado a lado. Ative Pages em `main` / `/(root)`.

O uso do Deezer e a licença dos dicionários de terceiros devem ser revisados antes de uma publicação pública ou monetização.

### Bits — melhorias do player

O Bits possui volume/mudo próprio (salvo no navegador), linha do tempo dividida em seis segmentos proporcionais aos trechos de 1, 2, 4, 7, 11 e 16 segundos, pulo que não interrompe áudio em reprodução e indicação amarela de palpites com artista correto e música incorreta. Todas essas mudanças ficam apenas em `jogos/bits/`.

- **Bits:** músicas já usadas como palpite deixam de aparecer nas sugestões da rodada e não podem consumir outra tentativa, inclusive após retomar o desafio diário.

## Teclado e navegação (atualização)

- **Esc** retorna da partida para a seleção de modos/categorias de cada jogo. Não redireciona automaticamente para o HUBA. No Worg, Esc fecha as estatísticas primeiro.
- **Worg:** Backspace apaga letras que estejam à direita mesmo se o cursor tiver voltado à primeira casa; a tecla Espaço continua inserindo o marcador `·`.
- **Musical:** quando uma prévia falha, aparece **Sortear outra música**. A substituição ocorre apenas naquela pergunta, sem registrar erro ou consumir tentativa. Em desafios diários a substituição após falha pode diferir de outros navegadores, porque a disponibilidade de áudio não é universal.
- Os diretórios `jogos/musicle/` e `jogos/termo/` são mantidos para preservar links e evitar alterações desnecessárias; os nomes exibidos passam a ser **Musical** e **Worg**. Chaves de armazenamento permanecem inalteradas.

- **Bits:** se a prévia não tocar, **Sortear outra música** reinicia as tentativas daquela rodada sem penalidade. Quando necessário, a resposta diária salva muda neste navegador.
