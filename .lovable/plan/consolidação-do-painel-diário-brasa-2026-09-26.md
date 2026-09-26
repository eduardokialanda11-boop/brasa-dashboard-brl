# Consolidação do painel diário Brasa

## Alterações
- Consolidar o card principal para mostrar volume em reais, volume USDC, economia versus bancos com 3,7% e pontos Brasa, todos vindos do registro mais recente de `daily_volumes`.
- Limitar o gráfico “Volume nos últimos 7 dias” às sete linhas mais recentes, apresentadas em ordem cronológica pelas datas disponíveis.
- Garantir que não exista o gráfico antigo de evolução dos pontos nem qualquer solicitação de chave ao abrir.
- Manter a conexão pelas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` já configuradas.

## Verificação
- Conferir o painel no navegador, incluindo o conteúdo do card, as datas do gráfico e a ausência do gráfico antigo.
- Confirmar o estado de compilação e os erros do navegador.
