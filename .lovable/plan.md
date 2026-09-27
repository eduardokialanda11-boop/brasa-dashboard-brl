# Unificar o Resumo de Hoje

## Alterações
- Usar um único estado `valorBRL`, iniciado pelo `total_brl` mais recente da tabela `daily_volumes`.
- Atualizar esse estado em 0,003% a cada 60 segundos.
- Calcular em tempo real os quatro indicadores a partir dele: volume BRL, USDC pela cotação fixa 5,19, economia de 3,7% e pontos por R$ 100.
- Preservar “Referência: hoje, DD/MM” e “↑ +5% hoje”.

## Validação
- Conferir que os quatro valores aparecem com a formatação atual e derivam do mesmo total.
- Confirmar que o painel continua abrindo sem erros e o gráfico permanece alimentado por `daily_volumes`.
