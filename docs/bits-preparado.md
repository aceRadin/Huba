# Catálogo do Bits preparado pelo GitHub Actions

O workflow **Publicar HUBA** agora busca as 15 músicas mais populares de cada ID em `jogos/bits/artistas.js`, uma vez por artista distinto. Não usa rankings de gênero nem exige país americano. Musical, Streakal e `playlists.js` continuam iguais.

O Diário utiliza somente as primeiras 5 posições; o Treino utiliza até 15. Faixas repetidas, sem prévia ou com outro artista principal continuam sendo filtradas. Uma faixa inválida no Top 5 não é substituída pela sexta posição. Portanto, o total válido pode ser menor que esses limites.

## Como publicar

1. No GitHub Desktop, faça **Commit** das alterações e **Push origin** para `main`.
2. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions** se ainda não estiver selecionado.
3. Em **Actions → Publicar HUBA**, acompanhe a publicação. O push já dispara o workflow; também é possível usar **Run workflow** na branch `main`.
4. Quando terminar com sucesso, atualize o site com **Ctrl+Shift+R**.

Não precisa criar token, fornecer chave ou executar scripts no computador. A primeira execução consulta os 125 artistas e pode levar alguns minutos, mas essa espera fica no Actions. Os jogadores recebem os arquivos prontos.

## O que o navegador carrega

O pequeno `dados/bits-artistas/config.js` informa a data e os nomes dos arquivos. Ao clicar em Rock, apenas o arquivo de Rock é baixado; Pop e Rap funcionam da mesma forma. Top baixa os três e remove duplicatas. O mesmo arquivo contém as posições necessárias para os dois modos e é reutilizado ao alternar entre eles. Os nomes incluem uma versão para evitar misturar arquivos de publicações diferentes.

O carregador e a validação existentes continuam montando o catálogo e as sugestões. O Diário aguarda o arquivo completo e ordena as músicas antes do sorteio com a data de São Paulo; a velocidade da conexão não muda a escolha. O áudio não é embutido nesses arquivos: continua vindo do Deezer, com recuperação da mesma faixa por ID quando a prévia expira.

Se o download do catálogo falhar, clicar novamente no gênero tenta baixar outra vez. Na versão publicada não há troca silenciosa para consultas ao vivo: isso poderia produzir diários diferentes entre jogadores.

## Atualização diária e falhas

A geração está agendada para **00h de São Paulo (03h UTC)**, além de push e execução manual. O GitHub pode atrasar tarefas agendadas. Durante a virada do dia, o Diário pode pedir para aguardar a atualização; atualizar a página após a publicação resolve. Treino pode continuar usando o catálogo anterior.

O cache do Actions conserva a lista na mesma data e configuração. Publicar ajustes de layout no mesmo dia reutiliza essa lista. Alterar artistas ou o gerador pode produzir uma nova versão; prefira fazer essas mudanças antes de iniciar os desafios do dia. O cache do GitHub é temporário e pode ser removido pelo serviço; não é um arquivo histórico permanente.

Falhas de API têm novas tentativas com espera crescente. Se a geração continuar falhando, o workflow interrompe a publicação; o site anterior permanece publicado. Confira o passo **Preparar músicas do Bits** e tente **Re-run all jobs**. Uma falha prolongada pode deixar o Diário aguardando a lista daquele dia. Não há backend obrigatório.

## Uso local e testes

O `config.js` presente no repositório tem `enabled:false`. Abrir o código diretamente no computador mantém o carregamento ao vivo e o cache diário anteriores. O Actions substitui essa configuração somente no site preparado para publicação. Os arquivos gerados não precisam entrar no Git.

Testes com respostas simuladas verificam geração, reutilização da lista do dia, falhas, limites, sugestões, mesma música diária em duas conexões, troca de modo durante download e recuperação do áudio. Em uma simulação com dois artistas e 80 ms de atraso no arquivo, Rock entrou em aproximadamente 337 ms com **1 arquivo e 0 consultas de artistas**. Isso não mede a velocidade real do GitHub Pages ou do Deezer. O ganho estrutural é substituir 36/50/40/125 consultas de artistas por 1/1/1/3 arquivos de catálogo, conforme o gênero.
