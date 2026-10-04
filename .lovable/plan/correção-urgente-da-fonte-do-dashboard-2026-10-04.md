# Correção urgente da fonte do dashboard

## Alterações
- Restaurar a marca BRASA no canto esquerdo do cabeçalho e manter o indicador REAL-ON-CHAIN ao lado.
- Trocar resumo, acumulado e gráfico para leituras exclusivas de `daily_summary_brt`.
- Usar sempre o registro mais recente no resumo, preservando valores quando o dia atual ainda não foi consolidado.
- Exibir a referência como último dado on-chain quando a data mais recente for anterior a 04/10/2026.
- Simplificar “Ver provas” para as 20 transações reais mais recentes de `pix_onchain_events`, com assinatura, valor, horário e link Solscan.
- Manter atualização a cada 60 segundos e por mudanças em `daily_summary_brt`.

## Validação
- Confirmar que não restaram leituras de `daily_volumes`, `transactions`, `get_brasa_historical_trend` ou filtro por data selecionada.
- Abrir o dashboard e o modal em tela móvel, verificando dados, referência e ausência de erros.
