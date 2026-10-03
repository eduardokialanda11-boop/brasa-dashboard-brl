# Dashboard com dados diários on-chain

## Alterações
- Ler o resumo exclusivamente da linha de hoje em `daily_volumes`, usando a data de São Paulo.
- Ler até sete linhas reais de `daily_volumes` em ordem cronológica para o gráfico.
- Remover a assinatura de `pix_onchain_events` e acompanhar inserções/atualizações da própria `daily_volumes`.
- Atualizar os dados também a cada 60 segundos e mostrar o horário local da última leitura.
- Exibir no gráfico apenas datas existentes, sem completar dias futuros ou criar quedas artificiais.
- Manter as três transações reais mais recentes somente na janela de provas on-chain.

## Validação e publicação
- Verificar resumo, gráfico e ausência de erros em telas mobile e desktop.
- Publicar a versão validada no endereço público do projeto.
