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
- Aggregate dashboard totals and real chart days from paginated `pix_onchain_events` reads in `src/utils/onchain-summary.ts`; derive daily cards immediately from the shared calendar Date and cached real days, using America/Sao_Paulo boundaries. Explicit empty dates show no records, not another day's rows; default selection starts on the latest real day.
- Refresh by rereading `pix_onchain_events` every 60 seconds and after its realtime changes; never increment source values in browser state.
- Future point-entry flows write only `pontos`, `posicao`, and `valor_brl` to `historico_ponto`, then refetch the latest row.
- Reuse paginated dashboard events for proofs, newest first, filtering by the resolved card date with the shared Sao Paulo event-day helper and identical token eligibility; sharing the source and calendar boundary prevents divergent daily counts and keeps exports scoped to the displayed day.
- Calculate dashboard growth from chronological event aggregates; never append missing or future dates to the chart.
- Derive daily savings from the selected-day volume and historical savings from accumulated volume through the shared rewards helper; separate bases prevent date-independent daily figures.
- Keep transaction conversion math in a browser-safe helper and layer details in a nested dialog; the daily event ratio is a derived reference, not official PTAX, and returning must preserve the proof list.
- Keep token eligibility and paired-value exchange math in `src/utils/event-policy.ts`; cards and proofs share them to prevent inconsistent inclusion or reference rates.
- Serialize dashboard refreshes and verify paginated row counts through `src/utils/paginated-events.ts`; preserve the last successful read and visibly flag failures rather than replacing it with partial totals.
