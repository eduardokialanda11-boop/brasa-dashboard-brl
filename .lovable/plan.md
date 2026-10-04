# Ajustes de economia, data e crescimento do BRASA

## Implementação
- Reorganizar o bloco de economia com título, valor diário, badge `+3,7% vs bancos tradicionais` e legenda calculada com os valores reais.
- Adicionar um seletor de data premium no cabeçalho, iniciado na última data disponível.
- Ao trocar a data, reler `daily_summary_brt`, atualizar BRL, USDC e transações do card Dia e, sem registro exato, mostrar o dia real mais próximo com o aviso de coleta iniciada em 27/09.
- Manter `daily_summary_brt` como fonte oficial do dashboard; `pix_onchain_events` continua restrita às provas auditáveis, evitando divergência entre cards e gráfico.
- Melhorar o tooltip do gráfico para incluir data, BRL, USDC e transações do ponto selecionado.
- Adicionar o resumo de média, melhor dia e crescimento somente quando houver sete dias reais comparáveis.
- Incluir controle `7D / 30D / Tudo`, mantendo somente 7D ativo e explicando que 30D depende de 30 dias de coleta.
- Adicionar uma linha tracejada de tendência calculada a partir dos mesmos registros reais do gráfico.

## Validação
- Conferir a troca de data com registro existente e data sem coleta.
- Validar tooltip, tendência, textos e estados em celular e desktop.
- Confirmar carregamento sem erros e sem números simulados.
