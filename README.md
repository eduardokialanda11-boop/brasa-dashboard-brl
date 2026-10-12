Brasa — Solana Analytics for Brazil's Digital Dollar Economy

Brasa is an on-chain analytics dashboard that estimates potential PIX-related flows into USDC on Solana.

The project aims to make digital dollar activity connected to Brazil more observable through transaction analysis, historical indicators, and verifiable blockchain records.

«Important: Brasa provides estimates, not official PIX statistics. Public blockchain data can verify transactions on Solana, but cannot independently prove that funds originated from PIX.»

The Problem

Brazil's PIX payment system is widely used, while stablecoins such as USDC provide access to digital dollars through blockchain networks.

However, publicly available on-chain data alone cannot reliably identify which stablecoin transfers originated from PIX. This makes it difficult to measure the relationship between Brazilian payment activity and the digital dollar economy.

Brasa explores how public blockchain data can help make this activity more transparent.

What Brasa Does

- Daily activity: Estimates the BRL value associated with monitored USDC transfers.
- Historical trends: Tracks activity over time to help identify potential changes in transaction volume.
- Transaction evidence: Provides access to recorded transaction signatures and blockchain explorer links where available.
- Estimated cost comparisons: Aims to compare potential transaction costs with traditional alternatives, subject to a clearly defined methodology and reliable fee data.

How It Works

Brasa collects publicly available Solana blockchain data and analyzes USDC transfers associated with selected on-ramp wallets.

The processing workflow is:

1. Data collection: Helius provides access to Solana blockchain data.
2. Wallet monitoring: The collector monitors selected wallets associated with on-ramp activity.
3. Transaction analysis: Eligible outgoing USDC transfers are recorded and analyzed according to the project's classification rules.
4. Data storage and processing: Supabase stores transaction data and supports the dashboard's data access and updates.
5. Visualization: The dashboard presents activity indicators and historical trends.

Methodology and Limitations

Brasa classifies selected transfers as potentially PIX-related based on monitored wallets and transaction patterns.

This classification is a heuristic, not proof of payment origin. A transfer from a monitored wallet does not establish that the underlying funds came from PIX.

The BRL equivalent is calculated using a reference USD/BRL exchange rate:

Estimated BRL value = USDC amount × reference USD/BRL rate

This is an approximate conversion. The reference rate may differ from the rate applied to an individual transaction.

Brasa is an independent analytics project and does not represent official data from Brazil's Central Bank (BCB).

On-Chain Verification

Where transaction signatures are available, users can inspect the corresponding records through a Solana blockchain explorer such as Solscan.

These records can help verify transaction details, including the token transfer and its on-chain execution. They do not independently establish the original off-chain payment method.

Technology Stack

- Helius: Access to Solana blockchain data.
- Supabase: Database, data processing, and dashboard data access.
- Lovable: Dashboard development and interface.
- React and TypeScript: Frontend technologies used by the dashboard.

Live Product

Access the Brasa dashboard:

https://points-pulse-dash.lovable.app/

Project Status

Brasa is an evolving analytics project. Current work focuses on improving data quality, documenting wallet classification rules, validating transaction calculations, and making the distinction between verified on-chain activity and estimated PIX attribution clear.

Vision

Brasa aims to help Brazilian users, fintechs, and Solana developers better understand digital dollar activity connected to Brazil through transparent, auditable, and data-driven analytics.

---

Built independently with Helius, Supabase, and Lovable.