# Índice Brasa V2 Live

## Objetivo
Trocar o resumo atual pelo índice real de PIX para USDC calculado para 12 carteiras monitoradas, sem valores simulados.

## Alterações
- Consultar o serviço `hyper-action` ao abrir o painel e atualizar periodicamente apenas com novas leituras reais.
- Usar os campos reais já retornados pelo serviço (`volume_hoje_brl`, `volume_hoje_usdc` e `economia_brl`), aceitando também os nomes previstos (`total_brl` e `total_usdc`) para compatibilidade.
- Exibir quatro indicadores: PIX convertido em USDC, USDC na Solana, economia contra bancos e variação dos últimos sete dias.
- Calcular a variação de sete dias com os registros persistidos em `daily_volumes`; se não houver base comparável, mostrar “—”, sem estimar.
- Manter o gráfico de sete dias alimentado por `daily_volumes`.
- Mostrar “Sincronizando 12 carteiras on-chain...” enquanto o serviço ainda não retornar dados válidos.
- Atualizar o selo do cabeçalho e o texto de metodologia no rodapé.
- Preservar o tema Brasa, a adaptação para celular e a conexão atual do gráfico.

## Validação
- Conferir o painel em telas de computador e celular.
- Confirmar que nenhum valor antigo ou simulado aparece durante carregamento ou falha.
- Confirmar que o serviço real e a tabela histórica são consultados sem erros visíveis.
