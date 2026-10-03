# Usar os últimos 7 volumes reais

## Alteração
- Consultar os sete registros mais recentes de `daily_volumes`.
- Ordenar esses sete registros cronologicamente para o gráfico.
- Usar o registro verificado mais recente no resumo do topo, evitando que uma linha incompleta zere valores existentes.
- Manter atualização a cada 60 segundos e estados vazios sem dados simulados.

## Detalhe técnico
A consulta será feita em ordem decrescente com `limit(7)` e invertida somente para exibição. Usar `ascending: true` diretamente com `limit(7)` retornaria os sete registros mais antigos da tabela.
