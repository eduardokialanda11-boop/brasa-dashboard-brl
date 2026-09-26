# Corrigir carregamento de `daily_volumes`

## Alterações
- Substituir as duas consultas atuais por uma única busca dos sete registros mais recentes, ordenados por `date` em ordem decrescente.
- Registrar o retorno no console com `console.log('Dados buscados:', data)`.
- Usar `data[0]` como fonte do card principal e inverter apenas uma cópia dos sete registros para desenhar o gráfico em ordem cronológica.
- Enquanto a consulta não retornar registros, exibir exatamente “Carregando...” sem desmontar o layout.
- Preservar a conexão existente, o crescimento diário de demonstração e todo o restante do painel.

## Validação
- Confirmar no navegador que o card usa a data mais recente, o gráfico mantém a ordem cronológica e a mensagem de carregamento aparece no estado sem dados.
- Conferir a compilação e os erros do painel.
