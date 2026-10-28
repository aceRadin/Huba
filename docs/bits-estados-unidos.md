# Ativar o catálogo americano do Bits

O Bits passou a ler arquivos públicos em `dados/bits-us/`. Não consulta mais rankings pela conexão do jogador. Pop, Rock e Rap são coletados pelo gerador; Top é a união sem duplicatas. Nenhum MP3 nem endereço de prévia expirada é salvo nesses arquivos. O jogo renova a prévia pelo ID quando abre a música.

## O que você precisa fazer

1. Faça commit e push dos arquivos desta alteração para a branch principal do repositório.
2. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**. O workflow incluído publica o site inteiro, incluindo os catálogos. Se você já tiver outro workflow de publicação, mantenha apenas um responsável pela publicação para evitar disputas.
3. Em **Actions**, abra **Catálogo americano do Bits** e clique **Run workflow** na branch principal. O padrão usa um executor hospedado `ubuntu-latest`, mas NÃO presume que seu IP é americano: a coleta verifica `/infos` antes, durante e depois das consultas. Se a API identificar `US`, gera e publica; se identificar outro país ou falhar, o workflow termina sem substituir os dados.
4. Se o executor padrão não for identificado como `US`, forneça um executor Linux com conexão de saída nos EUA. Em **Settings → Actions → Runners → New self-hosted runner**, siga os comandos fornecidos pelo GitHub na máquina americana e adicione o rótulo `huba-us`.
5. Em **Settings → Secrets and variables → Actions → Variables**, crie a variável `HUBA_CATALOG_RUNNER` com o valor JSON `["self-hosted","linux","huba-us"]`. Não é senha nem chave. Execute o workflow novamente. A máquina precisa estar ligada e com o serviço do runner ativo; a infraestrutura/conexão americana fica por sua conta. O rótulo não comprova a região: o script continua verificando `US`.
6. Se o push do catálogo for recusado, confira se Actions pode escrever no repositório e se a proteção da branch permite o commit do bot. Não remova proteções sem avaliar; uma branch protegida pode exigir adaptar o fluxo para revisão/publicação.
7. Confira os passos **Salvar catálogo** e **Publicar** e abra `SEU_SITE/dados/bits-us/latest.json`. Deve conter `country: "US"`, a data e os três gêneros. Depois abra o Bits e confira o contador “catálogo EUA”.

O executor self-hosted deve ser dedicado ao projeto. Este workflow só é acionado por agenda ou manualmente, nunca por pull requests de terceiros. Não coloque senhas, tokens ou configurações de VPN nos arquivos públicos do site.

## Atualização e falhas

A execução está agendada diariamente para 03:15 UTC (00:15 de São Paulo). Agendas do Actions podem atrasar: o início não é pontual garantido. Também pode executar manualmente.

Cada dia tem um arquivo `AAAA-MM-DD.json` que não é sobrescrito. Todos os jogadores usam o dia de São Paulo, inclusive quem joga fora do Brasil. `latest.json` serve ao Aleatório. O Diário só usa o arquivo exato daquele dia; se ele ainda não foi publicado, informa indisponibilidade sem escolher outro desafio. Não há fallback regional. Entre a meia-noite e a primeira publicação do dia, o Diário fica aguardando.

Se a geração falhar, o Aleatório usa o último `latest.json` já publicado; diários já publicados continuam intactos. Antes da primeira geração americana bem-sucedida, nenhum catálogo de produção existe e o Bits informa que ele ainda não foi publicado. Não foi inventado um catálogo americano usando resultados brasileiros. As partidas antigas e seus streaks continuam salvos; os novos diários americanos usam uma chave própria.

Não é necessário cadastrar chave do Deezer. Se a rede americana não conseguir consultar a API, será preciso outra conexão de saída que ela aceite. As prévias continuam sujeitas à disponibilidade regional do áudio de cada visitante, mesmo com a seleção dos EUA igual para todos.

## Testar localmente

Use Node.js 22 ou superior:

```sh
node --test tests/bits-us.test.mjs
node scripts/gerar-bits-us.mjs
```

O primeiro comando usa respostas simuladas. O segundo consulta o Deezer real e deve recusar uma conexão reconhecida como Brasil. Depois de gerar com sucesso nos EUA, publique os arquivos junto com o site. Não edite versões diárias existentes; isso mudaria desafios em andamento.

O workflow publica explicitamente o site após salvar o catálogo: commits feitos pelo `GITHUB_TOKEN` não devem ser usados para presumir que outro workflow de push será disparado.
