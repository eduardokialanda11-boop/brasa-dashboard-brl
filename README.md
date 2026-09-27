# Brasa Points Dashboard

Crie um dashboard Brasa Points - tema dark premium, com verde #22c55e.



CONEXÃO SUPABASE:

- URL: https://npxytlxjnoqpyoukpppi.supabase.co

- Tabela: historico_ponto

- Colunas: pontos (int), posicao (int), criado_em (timestamp)



FUNCIONALIDADES:

1. Conecte usando @supabase/supabase-js e busque todos os dados ordenados por criado_em ASC

2. Card grande no topo: "9.2M PONTOS" com último valor da tabela / 1M

3. Abaixo: "Posição #12" com valor da coluna posicao

4. Gráfico de linha com Chart.js: eixo X = horário, eixo Y = pontos em milhões, linha verde neon, área preenchida, curva suave, subindo de 1.2M até 9.2M

5. Deixe 2 inputs no rodapé para URL e ANON KEY pra eu conectar

6. Design: fundo #0a0a0a, cards #1a1a1a com borda #333, bordas 16px, fonte bold



Código limpo e comentado para eu aprender.

This project was built with [Lovable](https://lovable.dev).

https://brasa-dashboard-brl.lovable.app/
## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/058c9f83-295b-4cb7-b5c3-ac35af5624a3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
