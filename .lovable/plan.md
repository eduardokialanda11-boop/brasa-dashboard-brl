# Efeito de atualização ao vivo

## O que será alterado
- Manter o valor diário recebido de `daily_volumes` como base do resumo.
- Criar um estado visual para o volume de hoje e incrementá-lo em 0,003% a cada 60 segundos, sem recarregar a página nem gravar linhas adicionais.
- Reiniciar o valor visual corretamente sempre que um registro mais recente for recebido da base.
- Usar o valor crescente no card “Volume hoje”, preservando os demais indicadores e o gráfico semanal.
- Exibir “↑ +5% hoje” abaixo do valor principal.
- Complementar o status “AO VIVO” com ponto verde pulsante e o texto “atualiza a cada 60s”.

## Validação
- Confirmar que o painel abre com o valor atual, apresenta os novos textos e continua compilando sem erros.
- Conferir o resultado em tela pequena e desktop, sem sobreposição no cabeçalho ou no card.
