# Correção do dólar de referência

## Alterações
- Usar `usd_brl_rate` quando for maior que zero.
- Quando a cotação estiver nula ou zerada, calcular `total_brl / total_usdc`.
- Exibir “—” somente quando não houver USDC suficiente para calcular, nunca `R$ 0,00`.
- Trocar o subtítulo para “PTAX calculado on-chain”.

## Validação
- Confirmar que o registro atual exibe aproximadamente `R$ 5,19`.
- Verificar o painel em celular sem erros ou cortes.
