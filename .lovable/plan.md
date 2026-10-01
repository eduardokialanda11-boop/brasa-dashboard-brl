# Prova on-chain, metodologia e confiabilidade

## Provas on-chain
- Consultar a tabela `transactions` junto das leituras atuais, filtrando pela data do registro diário mais recente.
- Abrir um modal pelo total de transações e pelo botão “Ver provas”, com totais verificados calculados das linhas retornadas.
- Exibir USDC, BRL, horário, carteira abreviada e link seguro para a assinatura no Solscan.
- Quando não houver transações, mostrar um estado de coleta pendente sem criar assinaturas, valores ou links falsos.

## Metodologia
- Adicionar o card “Como funciona” em três colunas no computador e uma no celular.
- Explicar carteiras monitoradas, critério de detecção, hash único e cálculo estimado de economia.
- Adicionar uma explicação acessível ao indicador de economia.

## Confiabilidade e tendência
- Exibir no resumo a última sincronização, próxima leitura, status e carteiras monitoradas.
- Incluir progresso de cobertura semanal e destacar crescimento ou correção quando houver sete dias reais.
- Ajustar os eixos do gráfico para domínio dinâmico, datas horizontais e menos rótulos no celular.

## Segurança dos dados
- Manter `daily_volumes` e `transactions` somente leitura no navegador.
- Não apresentar transações demonstrativas como prova on-chain; o estado vazio informará claramente que as assinaturas ainda não foram coletadas.
