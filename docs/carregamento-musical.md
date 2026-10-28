# Carregamento progressivo de músicas

Atualização do Bits: o jogo agora usa `jogos/bits/rankings.js`, com os rankings de Pop (132), Rock (152) e Rap/Hip Hop (116). Top combina os três, sem duplicatas. Cada ranking pede até 300 faixas de uma vez, pois o endpoint pode omitir `next` mesmo com mais resultados disponíveis. As fontes abaixo que descrevem playlists próprias do Bits e seu primeiro lote de uma faixa documentam a implementação anterior; Musical e Streakal mantêm o carregamento progressivo descrito. O arquivo antigo de playlists do Bits permanece preservado, sem ser carregado.

## Antes e depois

Antes, cada jogo percorria todas as páginas de cada playlist do gênero, uma fonte após outra, e só então iniciava a partida. As novas tentativas de algumas consultas aconteciam imediatamente. Musical e Streakal tinham implementações quase iguais dessa consulta.

Agora, `js/deezer.js` cuida das consultas e os jogos continuam cuidando das suas próprias regras:

| Modo aleatório | Mínimo inicial | Motivo |
| --- | ---: | --- |
| Musical | 5 músicas válidas | Permite cinco perguntas e até cinco alternativas. Se o gênero inteiro tiver apenas quatro músicas, o Casual mantém o comportamento anterior de quatro perguntas; o Desafiador exige cinco. |
| Bits | 1 música válida | O alvo já pode tocar e ser encontrado. As sugestões continuam chegando; buscas sem correspondência informam que a lista ainda está incompleta. |
| Streakal | 2 músicas válidas | Duas alternativas na primeira pergunta. Se uma próxima pergunta exigir mais músicas do que já chegaram, ela aguarda sem alterar placar, rodada ou dificuldade. |

O primeiro pedido usa esse mínimo como `limit`. Se vierem músicas inválidas ou repetidas, o jogo aguarda mais páginas. Não são considerados válidos registros sem ID, artista, título ou endereço HTTPS de prévia. Uma URL preenchida não garante que o arquivo de áudio ainda esteja acessível: a reprodução tem seu próprio tratamento de falhas.

Depois, o carregador segue o endereço `next` devolvido pelo Deezer. Ele mantém o deslocamento informado e aumenta `limit` para 100 nas páginas seguintes. As demais playlists também usam páginas de 100, evitando centenas de pedidos pequenos. Novos resultados são anexados à lista, sem mover os índices já usados pelas perguntas. O contador mostra apenas faixas únicas daquele gênero e indica conclusão ou pausa.

## Consultas, cache e recuperação

- Nada é consultado ao abrir o hub ou a seleção de gêneros.
- Há uma fila com uma requisição por vez e pelo menos 250 ms entre seus inícios, incluindo renovação de prévias. Consultas de áudio têm prioridade sobre páginas ainda na fila.
- Falhas temporárias recebem até duas novas tentativas, após 500 ms e 1 s. Erro de quota (código 4) usa 2 s e 4 s. Erros permanentes conhecidos não são repetidos automaticamente. Como o transporte é JSONP, não há acesso aos cabeçalhos HTTP ou a `Retry-After`.
- Depois de esgotar as tentativas, a página problemática fica pendente. O contador oferece **Retomar**; páginas concluídas e músicas já recebidas são preservadas.
- Duplicatas são removidas por ID e por artista/título normalizado. Não há mistura de gêneros.
- Sair da partida ou selecionar outro gênero cancela o carregamento anterior. Resultados atrasados são descartados. Uma página cancelada antes de concluir pode precisar ser solicitada novamente.
- O cache fica na memória da página aberta. Não persiste depois de recarregar/navegar para outro documento e não coordena limites entre abas ou dispositivos.
- Musical e Bits agora tentam renovar a mesma prévia pelo ID antes de oferecer outra faixa. O Streakal mantém a renovação ao abrir cada pergunta e a recuperação da mesma faixa em caso de falha. Eventos de erro simultâneos não disparam recuperações duplicadas.
- Falhas técnicas não contam como erro do jogador. No Streakal, ficar sem prévias disponíveis não finaliza nem registra uma derrota; o jogador pode tentar novamente. O trecho de uma pergunta permanece o mesmo ao repetir Play.

## Por que o diário ainda espera?

Os três jogos escolhem o diário usando um sorteador com semente baseada no dia e no gênero. Esse sorteio também depende da lista completa: Musical e Streakal usam seu tamanho, e Bits escolhe uma posição nessa lista. Começar com um prefixo variável produziria desafios diferentes conforme a velocidade da conexão.

Por isso, **o início antecipado se aplica ao aleatório**. No diário, o carregamento também é paginado e o contador cresce, mas a partida só começa depois de todas as fontes terminarem com sucesso. Se uma página falhar, o diário aguarda uma retomada em vez de usar um catálogo parcial. A lista é ordenada antes do sorteio e fica fixa durante a partida. No Streakal, o sorteio do debuff diário também usa o gerador com semente; a probabilidade e as regras não foram alteradas.

Isso elimina a dependência da velocidade e da ordem de chegada **para um mesmo catálogo**. Ainda há uma limitação do modelo original: playlists editadas durante o dia, remoções de faixas e diferenças nas respostas do Deezer entre regiões podem mudar o próprio catálogo. Garantir um desafio mundial imutável mesmo nessas situações exige publicar um manifesto estático/versionado de desafios, por exemplo gerado previamente. Não foi introduzido backend nem um catálogo substituto nesta alteração.

No Bits aleatório, uma busca não encontrada enquanto a lista está incompleta não é tratada como palpite inválido nem consome tentativa. A consulta digitada permanece e as sugestões são atualizadas automaticamente a cada lote. Apenas uma música efetivamente selecionada pode ser enviada. O catálogo de sugestões completo continua disponível quando o carregamento termina; se a rede falhar, o aviso orienta retomar.

## Arquivos

- `js/deezer.js`: fila, JSONP, paginação, cache, cancelamento e contagem.
- `jogos/musicle/musicle.js`, `jogos/bits/bits.js`, `jogos/streakal/streakal.js`: integração, preservação das listas da partida e recuperação do áudio.
- Os três `index.html` desses jogos: inclusão do módulo compartilhado e atualização da versão dos scripts.
- `tests/deezer-progressivo.test.cjs`: testes automatizados no Chromium/Chrome.
- `README.md` e este documento: explicação e reprodução dos testes.

As fontes continuam em `playlists.js` para Musical/Streakal e em `jogos/bits/playlists.js` para Bits, conforme a escolha confirmada nesta alteração. Nenhum desses arquivos foi editado. Categorias, temas, doações e dados de progresso foram preservados.

## Testes e medição

O teste usa `node:test` e Playwright. Instale/disponibilize Playwright e seu Chromium no ambiente de desenvolvimento e execute:

```sh
node --test tests/deezer-progressivo.test.cjs
```

Para usar instalações já existentes, as variáveis opcionais são `HUBA_PLAYWRIGHT_MODULE` (caminho do pacote), `HUBA_CHROME` (executável do Chrome) e `HUBA_GIT` (executável do Git). Quando `HUBA_GIT` estiver configurado, a comparação usa os scripts presentes em `HEAD`; para reproduzir a comparação após fazer commit da otimização, será preciso apontar esse trecho do teste para a revisão anterior.

Na execução de 28/10/2026, os 14 testes reportados passaram, sem erros JavaScript nas páginas verificadas. Cobrem entrada antecipada, deduplicação, atualização automática das sugestões, cinco perguntas/alternativas, cancelamento, cache, troca rápida de gênero, retomada após quota/falha permanente, diário com duas latências, recuperação simultânea do áudio e 40 acertos no Streakal. Um teste adicional dentro da suíte usa o áudio nativo do Chrome e arquivos WAV simulados nos três jogos para verificar reprodução e repetição do trecho.

Comparação local com o código anterior, duas playlists, 300 faixas únicas no total e 180 ms de latência simulada por resposta:

| Jogo | Antes: até entrar | Agora: até entrar | Redução aproximada |
| --- | ---: | ---: | ---: |
| Musical | 830 ms | 333 ms | 60% |
| Bits | 833 ms | 246 ms | 70% |
| Streakal | 849 ms | 353 ms | 58% |

São medições de uma execução controlada, não uma previsão do tempo real do Deezer. A primeira partida começou após um pedido de playlist; o catálogo completo fez cinco pedidos, contra quatro antes, porque o primeiro lote é menor. Portanto, a melhoria é no **tempo até jogar**, e não uma promessa de baixar o catálogo completo mais rápido ou com menos pedidos. O limite de ritmo é intencional.

O Deezer real e suas prévias assinadas não foram usados para esses números. Os testes substituem somente suas respostas e arquivos de áudio; não acrescentam links às playlists do projeto.
