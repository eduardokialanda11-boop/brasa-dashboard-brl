# Refatorar o card semanal

## Implementação
- Consultar até sete linhas reais de `daily_volumes`, ordenadas cronologicamente, sem criar dados de volume.
- Montar uma janela de sete dias a partir do início da coleta atual; dias ainda sem registro aparecem como zero e ficam marcados como “Aguardando coleta”.
- Exibir rótulos com dia da semana e data, pontos verdes para registros reais e uma série cinza tracejada para espaços ainda não coletados.
- Simplificar o tooltip para uma única linha com BRL e USDC do registro real, sem valores compactos duplicados.
- Mostrar o contador dinâmico `X/7 dias reais` e adicionar o box “Solana no Brasil” com estágio da coleta, crescimento quando completar sete dias, média diária e pico.

## Detalhes técnicos
- Manter o resumo e a atualização automática de 60 segundos intactos.
- Calcular média, pico e crescimento somente com linhas reais retornadas pelo banco.
- Tratar divisões por zero e estados vazios sem percentuais inválidos.
