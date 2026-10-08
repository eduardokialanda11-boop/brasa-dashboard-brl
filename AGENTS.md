<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep all dashboard currency presentation in `src/utils/format.ts` so cards and charts use identical locale-safe formatting.
- Aggregate dashboard totals and chronological real chart days from paginated, unfiltered `pix_onchain_events` reads in `src/utils/onchain-summary.ts`; one shared aggregator prevents divergent totals. Default daily reads use UTC midnight to match the requested CURRENT_DATE condition; historical date selection retains nearest-real-day fallback.
- Refresh by rereading `pix_onchain_events` every 60 seconds and after its realtime changes; never increment source values in browser state.
- Future point-entry flows write only `pontos`, `posicao`, and `valor_brl` to `historico_ponto`, then refetch the latest row.
- Treat only the 20 latest `pix_onchain_events` rows as the proof source, reading signature, BRL amount, and block time without substitutes.
- Calculate dashboard growth from chronological event aggregates; never append missing or future dates to the chart.
