# Resumo pelo último dia disponível

## Alterações
- Remover o filtro pela data atual no resumo.
- Consultar `daily_volumes` por data decrescente e usar somente o registro mais recente.
- Manter zero apenas quando a tabela estiver realmente vazia.
- Preservar o gráfico com até sete registros reais em ordem cronológica.
- Atualizar a regra permanente do projeto para refletir essa fonte do resumo.

## Validação
- Confirmar no painel o volume BRL, USDC e `tx_count` retornados pelo último registro.
- Verificar carregamento, atualização automática e ausência de erros.
