# Resumo diário e acumulado Brasa

## Alterações
- Separar o resumo em dois cards: “Hoje”, com seletor de data, e “Acumulado Total”.
- Inicializar o seletor com a data mais recente de `daily_volumes` e consultar novamente a linha ao mudar a data.
- Somar BRL, USDC e transações de todas as linhas reais de `daily_volumes`, sem valores simulados.
- Manter pontos, economia e PTAX calculados a partir do dia selecionado.
- Preservar gráfico, provas on-chain, atualização a cada 60 segundos e acompanhamento em tempo real.

## Validação
- Conferir carregamento inicial, troca de data e totais em telas mobile e desktop.
- Verificar o estado sem dados e a ausência de erros no navegador.
