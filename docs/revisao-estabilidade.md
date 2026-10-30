# Revisão de estabilidade — 30/10/2026

## O que mudou e por quê

1. **Data única:** js/comum.js define o dia em São Paulo. Os quatro jogos guardam a data da partida. O resultado de ontem não é salvo como um palpite de hoje.
2. **Musical:** o salvamento passa a incluir músicas das perguntas e alternativas por ID e a posição do trecho. Uma música substituída continua sendo a mesma ao retomar. O registro antigo ainda pode ser lido.
3. **Streakal:** salva a partida durante o jogo e ao chegar à escolha de dificuldade. O gerador de números aleatórios expõe seu estado para continuar exatamente de onde parou. Não muda limite, regra de dificuldade ou debuff.
4. **Reservas:** Musical e Bits deixam de usar Math.random para reservas diárias. Streakal usa uma semente separada para a reserva. O resultado identifica que houve substituição. Uma reserva não consome uma tentativa ou zera o placar por erro técnico.
5. **Agenda:** scripts/preparar-catalogos.mjs prepara hoje e dois dias futuros. O catálogo de uma data já preparada é imutável, incluindo as fontes. Cada data usa sua própria semente, mesmo quando compartilha metadados musicais com outra data.
6. **Retenção:** a agenda e seus arquivos ficam no cache do Actions. A recuperação pública evita trocar o catálogo de um dia em uso caso o cache seja eliminado. São mantidas referências a sete dias passados. Uma aba mais antiga deve atualizar a página.
7. **Publicação:** package.json/package-lock.json tornam os testes reproduzíveis. O workflow exige testes antes de publicar e verifica saúde após o deploy. São duas oportunidades diárias de atualização, sem depender de publicar à meia-noite.
8. **Acessibilidade:** casas do Wording têm descrições de letra, posição e resultado para leitores de tela; controles são navegáveis com Tab. Movimento reduzido desativa animações do tabuleiro. Cores e HUDs permanecem.
9. **Apresentação:** páginas recebem descrição, ícone e metadados de compartilhamento com imagem PNG. Os endereços atuais apontam ao GitHub Pages; serão ajustados somente numa migração futura.
10. **Diagnóstico:** js/diagnostico.js coleta erros apenas na memória da aba. HUBA_DIAGNOSTICS.report() ajuda a investigar um problema sem serviços externos nem envio de dados pessoais.

## Como verificar

Execute npm test e npm run test:browsers. O teste diarios-regressao cobre meia-noite, fuso diferente, reservas e retomada. agenda.test cobre antecipação, imutabilidade e falha de geração. Os testes dos catálogos preparados mantêm cobertura de paginação, seleção por gênero e ausência de consultas desnecessárias à API.

Depois do Push, espere o workflow Publicar Hubdle ficar verde, inclusive o passo Verificar site publicado. A geração real pode falhar se o Deezer estiver indisponível: nesse caso a publicação não substitui o site com um catálogo incompleto. O endereço dados/saude.json informa readyThrough, o último dia preparado.

## Limites que permanecem

- Não existe garantia de disponibilidade do áudio do Deezer. Renovação e reservas reduzem o impacto, mas não criam uma prévia que o serviço deixou de oferecer.
- A reserva cobre duas datas futuras; uma interrupção mais longa precisa de intervenção. A agenda não usa o relógio de um servidor em tempo real: um dispositivo com data incorreta pode receber um aviso de catálogo indisponível.
- Resultados com música reserva não são estritamente comparáveis aos sem reserva. Ainda não há ranking público.
- A API direta usada na cópia local não tem a mesma garantia de catálogo imutável da versão publicada.
- WebKit automatizado não é um teste em iPhone físico. Navegadores antigos e extensões que bloqueiam áudio continuam exigindo verificações específicas.
- Não foi criada telemetria remota. As falhas de publicação aparecem no Actions; os erros do jogador ficam na própria aba.
- A autorização comercial do Deezer precisa ser obtida separadamente. Esta revisão não adiciona anúncios nem afirma que o uso comercial está autorizado.

O arquivo compartilhado playlists.js e o link Buy Me a Coffee foram preservados. Não foi realizada migração de domínio/servidor nem apagamento de estatísticas.
