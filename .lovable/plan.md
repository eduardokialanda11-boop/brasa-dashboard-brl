# Atualização em tempo real do volume

## Alteração
- Assinar novos registros de `pix_onchain_events` pelo canal em tempo real.
- Quando uma nova transação chegar, atualizar imediatamente o painel relendo os totais reais.
- Manter a atualização de segurança a cada 60 segundos.
- Encerrar corretamente o canal ao sair da página para evitar assinaturas duplicadas.

## Confiabilidade
O evento será usado como sinal de atualização, enquanto `daily_volumes` continuará sendo a fonte dos indicadores. Isso evita dupla contagem quando a mesma transação ou a página for recarregada.
