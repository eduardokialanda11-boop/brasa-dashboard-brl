# Atualização diária automática da demo

## O que será alterado
- Ao abrir a página, consultar o registro mais recente de `daily_volumes`.
- Comparar a data dele com a data atual em UTC (`YYYY-MM-DD`).
- Quando ainda não existir uma linha de hoje, inserir uma linha simulada com crescimento de 5% sobre `total_brl` e `total_usdc`.
- Calcular `economy_brl` como 3,7% do novo volume, definir `points_generated` como 34.000 e preservar a última cotação do dólar.
- Após a tentativa de inserção, buscar novamente o resumo e os sete dias do gráfico.
- Manter a atualização visual a cada minuto sem criar novas linhas repetidamente.
- Substituir o rodapé pelo aviso completo de dados V1 simulados e futura indexação on-chain.

## Segurança e consistência
- Usar os nomes reais já retornados pela tabela (`economy_brl` e `points_generated`).
- Tratar conflito de data como sucesso caso duas pessoas abram o painel ao mesmo tempo.
- Se a tabela estiver vazia, manter todos os indicadores em zero e o estado de espera atual.
- Se a base bloquear inserções públicas, o painel continuará mostrando os dados existentes e sinalizará reconexão; a permissão de escrita precisará ser liberada na base.
