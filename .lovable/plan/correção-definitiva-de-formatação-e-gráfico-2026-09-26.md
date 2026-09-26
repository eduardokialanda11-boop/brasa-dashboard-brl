# Correção definitiva de formatação e gráfico

## O que será alterado
- Centralizar a formatação de reais, reais compactos e dólares em `src/utils/format.ts`.
- Aplicar esses formatadores aos cards, tooltip e eixo Y, sem alterar os cálculos atuais.
- Migrar o histórico para `brasa_chart`, preservando até 1.440 amostras e recuperando-as após atualizar a página.
- Interromper a linha em intervalos maiores que 10 minutos, mantendo visualmente o último valor sem ligar pontos distantes.
- Exibir horários únicos em `HH:MM` no eixo X, com marcações espaçadas em aproximadamente quatro horas.

## Validação
- Conferir o painel no navegador, incluindo recarregamento da página e renderização do gráfico.
- Verificar desktop e celular, console e estado de compilação.

## Detalhes técnicos
- O gráfico continuará recebendo o mesmo `volumeBRL`; somente sua série histórica e apresentação serão ajustadas.
- O conjunto persistido será limitado com `slice(-1440)` e lido com validação defensiva.
