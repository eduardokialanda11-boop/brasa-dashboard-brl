# Dashboard Brasa Points

## Objetivo
Criar um dashboard dark premium que apresente a pontuação e posição mais recentes, histórico em gráfico e conexão configurável.

## Implementação
- Definir o sistema visual em preto, grafite e verde `#22c55e`, com tipografia forte, bordas de 16px e estados de carregamento/erro.
- Substituir a tela inicial pelo dashboard responsivo, priorizando o card de 9.2M pontos, posição e gráfico histórico.
- Usar Chart.js para linha suavizada, preenchimento translúcido e eixos formatados em horário e milhões.
- Integrar `@supabase/supabase-js` no navegador, buscando `historico_ponto` em ordem crescente por `criado_em`.
- Adicionar campos de URL e ANON KEY no rodapé, com ação para conectar e salvar a configuração apenas no navegador.
- Exibir dados demonstrativos de 1.2M a 9.2M enquanto a conexão não estiver configurada, sem inventar dados como se fossem reais.
- Atualizar os metadados da página e validar visualmente em celular e desktop.

## Detalhes técnicos
- A chave anônima é pública e será usada somente pelo cliente; nenhuma chave privada será armazenada.
- Os dados reais substituirão automaticamente a demonstração após uma conexão bem-sucedida.
- A consulta respeitará as permissões configuradas na tabela remota.
