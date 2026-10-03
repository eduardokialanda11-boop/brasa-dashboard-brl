# Modal de provas on-chain auditável

## Alterações
- Trocar a fonte do modal para as 50 entradas mais recentes de `pix_onchain_events`.
- Mostrar assinatura abreviada, USDC, horário e link externo para a transação no Solscan.
- Exibir no topo o total diário de transações, as 12 carteiras e a fonte Solana RPC + Helius.
- Adicionar exportação CSV paginada de todas as assinaturas reais disponíveis e cópia de até cinco assinaturas.
- Avisar quando registros antigos não tiverem assinatura e manter um estado vazio honesto quando não houver provas.

## Comportamento auditável
- O total diário continuará vindo de `daily_volumes`.
- O CSV e a cópia usarão somente assinaturas realmente existentes em `pix_onchain_events`; nenhum hash será simulado.
- Se a tabela ainda estiver vazia, os botões ficarão indisponíveis e o modal explicará a ausência dos registros.

## Validação
- Abrir o modal em celular e computador.
- Verificar estado vazio, textos, controles e ausência de erros.
