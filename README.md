# Brasa Points Dashboard

Crie um dashboard Brasa Points - tema dark premium, com verde #22c55e.

Brasa is the first REAL-ON-CHAIN index that estimates how much Brazilian PIX is turning into USDC on Solana.

The Problem: 140M Brazilians use PIX daily, but no one knows how much is leaving Brazil to become digital dollars on Solana. Banks charge 4-7% and hide the data.

What Brasa does:
1. TODAY's volume: How much PIX became USDC today? (Today: R$ 91,271 / 60 txs - 11/10/2026)
2. Savings: How much users saved vs banks? (Today: R$ 2,099.24)
3. Growth: Is Solana adoption growing or falling in Brazil? (Last 7 days: +71%, 71% collection rate)

How it works (Methodology - ESTIMATE, not official BCB data):
We track public hot wallets known as Brazilian BRL on-ramps (Transak Hot Wallet, BRLA via deBridge) and classify their outgoing USDC transfers on Solana as "PIX-intent" flow. BRL value = USDC * reference rate (R$ 5.19 avg).
On-chain proof: Mint address verifies official USDC token, signature proves transaction exists on Solana and is auditable on Solscan. The label "PIX origin" is a heuristic classification by our collector, not a bank proof. PIX itself is off-chain (BCB).

All 368 txs are 100% auditable: signature + Solscan link + BRL calculation (R$ 91,91 / 5,19 = 17,71 USDC).

Built on: Helius RPC (ingestion), Supabase (daily_volumes, real-time API), Lovable + React + TypeScript (dashboard).

This is an index/proxy, like inflation index - not official Central Bank data.

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
