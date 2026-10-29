# Bits: músicas populares por artista

**Publicação atual:** o GitHub Actions prepara os arquivos dos artistas antes de publicar. Consulte [catálogo preparado: ativação e funcionamento](bits-preparado.md). A descrição de consultas diretas e cache de sessão abaixo corresponde ao uso local do código; na versão publicada, o navegador baixa os arquivos prontos por gênero.

Limites atuais: **Diário = cinco faixas por artista; Treino = quinze**. Os catálogos e URLs de consulta são separados, para o Diário nunca aproveitar músicas extras já carregadas no Treino. A seleção diária usa uma chave de progresso própria dessa versão; os dados das versões anteriores continuam guardados.

O Diário guarda as respostas já obtidas em `sessionStorage`, por artista, limite e data de São Paulo. Recarregar a mesma aba no mesmo dia reutiliza esse cache; no dia seguinte ele é descartado. Bloqueios de armazenamento não impedem jogar, apenas desativam essa otimização. Prévias expiradas continuam sendo renovadas por ID. Esse cache é próprio do Bits; Musical e Streakal mantêm seu carregamento.

Diminuir para cinco reduz os dados transferidos, mas mantém uma consulta por artista no primeiro carregamento: Rock 36, Pop 50, Rap 40 e Top 125 artistas distintos. O maior ganho do cache é nas atualizações e retornos posteriores, não uma promessa de eliminar toda a espera na primeira visita. Em teste local com dois artistas e respostas simuladas de 80 ms, o Diário levou 362 ms sem cache e 1 ms após recarregar, com zero novas consultas de catálogo. Não é uma medição da API real nem do catálogo completo.

O Bits agora usa exclusivamente `jogos/bits/artistas.js`: 36 artistas de Rock, 50 de Pop e 40 de Rap, conforme a lista solicitada. São 125 artistas distintos, pois Doja Cat aparece nas duas últimas categorias. Top intercala e reúne os três gêneros, sem repetir artistas ou faixas.

Os nomes foram identificados na API do Deezer e os IDs ficam fixos na configuração. Isso evita pesquisas por nome durante o jogo e confusão com artistas homônimos. Foram ajustadas grafias como Metallica, AC/DC, Lynyrd Skynyrd, Sum 41 e Mötley Crüe; Tupac Shakur aparece como 2Pac no Deezer. Ghost, Europe, Survivor, ROSÉ e outros nomes ambíguos foram conferidos para usar o artista conhecido, em vez do primeiro resultado da busca.

Cada fonte consulta `/artist/ID/top?limit=5` ou `limit=15`, conforme o modo. O carregador não segue `next` nessas fontes e nunca incorpora registros além do limite. Faixas repetidas ou sem prévia não entram, portanto alguns artistas podem contribuir com menos músicas. Os máximos teóricos antes da filtragem são: Diário — Rock 180, Pop 250, Rap 200, Top 625; Treino — Rock 540, Pop 750, Rap 600, Top 1.875.

Também é conferido o ID do artista principal da faixa. O Deezer pode incluir no Top de Europe um remix cujo artista principal é David Guetta, por exemplo. Essas entradas não são incorporadas: o jogo não acrescenta outro artista nem busca faixas além do limite para completar artificialmente a quantidade.

O Treino começa com as primeiras faixas válidas e continua carregando em segundo plano. No Top, os artistas são intercalados por gênero e o início aguarda pelo menos três fontes, para não depender só do primeiro artista de Rock. O contador cresce; consultas já concluídas são reutilizadas ao alternar gêneros. Sair ou trocar de modo pausa o carregamento. Falhas permitem retomar sem perder o que já chegou. O Diário aguarda todas as fontes e ordena o catálogo antes de sortear, para não depender da velocidade da conexão. Como as listas populares do Deezer podem mudar ou variar conforme a região, a igualdade entre dispositivos continua dependendo de receberem o mesmo catálogo.

As sugestões, volume, trechos, tentativas, doações, idiomas, treino ilimitado e streaks continuam iguais. Os diários por artista têm uma chave própria; os antigos dados de rankings americanos não são apagados. O áudio continua sendo recuperado por ID quando falha.

## Abrir e publicar

Não é mais necessário publicar `dados/bits-us/latest.json`, esperar a geração diária nem ter conexão americana. Os artistas são carregados como JavaScript e as músicas por JSONP, inclusive abrindo `index.html` diretamente no computador, com internet. Ainda é necessário acesso à API do Deezer e ao servidor das prévias.

O workflow ativo é `.github/workflows/publicar-huba.yml`, **Publicar Hubdle**: publica em push na branch `main` ou execução manual. A geração americana agendada foi retirada do fluxo. Os arquivos e ferramentas antigos foram preservados para referência, mas o Bits não os carrega. Musical e Streakal mantêm suas playlists compartilhadas sem alterações.

## Alterar artistas

Edite o array do gênero em `jogos/bits/artistas.js`, mantendo `id` e `name`. O ID é o número no endereço do artista no Deezer. A ferramenta opcional `node scripts/resolver-artistas-bits.mjs` resolve entradas com `id: 0`; `--refresh` revisa todas. Ela busca nomes equivalentes e prefere o homônimo com mais seguidores, mas revise os resultados antes de publicar: popularidade não substitui uma conferência de identidade.

Os testes em `tests/bits-artistas.test.cjs` e `tests/deezer-progressivo.test.cjs` verificam configuração, limites de cinco/quinze, Top sem duplicatas, cache após reload e expiração, sugestões, diários, falhas e abertura local sem catálogo americano.
