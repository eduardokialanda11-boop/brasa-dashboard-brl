# Remover mocks e escritas automáticas

## Alterações
- Excluir do navegador toda criação automática em `daily_volumes`, incluindo INSERT, atualização diária e tratamento de conflito.
- Remover o crescimento visual por intervalo e qualquer valor inicial fixo; nenhum indicador mudará sem um novo registro real.
- Buscar o registro mais recente de `historico_ponto`, ordenado por `created_at` decrescente, para alimentar o resumo somente com valores retornados pela base.
- Manter o gráfico dos últimos sete dias como leitura de `daily_volumes`, sem INSERT, UPDATE ou UPSERT.
- Preservar estados de carregamento e base vazia sem preencher números simulados.
- Não criar uma tela de cadastro que não existe hoje. Quando houver inclusão de valores, ela gravará apenas `pontos`, `posicao` e `valor_brl` em `historico_ponto` e fará uma nova leitura após sucesso.

## Consistência
- Atualizar as regras internas e o roadmap para registrar que `public.criar_dia_certo()` via `pg_cron` é o único responsável por criar o volume diário.
- Validar que o código da página não contém temporizador, aleatoriedade nem escrita em `daily_volumes`, e conferir o painel no navegador.
