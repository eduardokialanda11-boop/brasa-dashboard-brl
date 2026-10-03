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
- Read the latest available row by descending date for the summary and up to seven chronological rows for the chart exclusively from `daily_volumes`.
- Never write to `daily_volumes` from the frontend; `public.criar_dia_certo()` via `pg_cron` exclusively creates daily volume rows.
- Refresh by rereading `daily_volumes` every 60 seconds and after its realtime changes; never increment source values in browser state.
- Future point-entry flows write only `pontos`, `posicao`, and `valor_brl` to `historico_ponto`, then refetch the latest row.
- Treat `transactions` as a read-only proof source, always show its three latest real rows regardless of date, and never substitute demo signatures when no verifiable rows exist; proof claims must remain auditable.
- Calculate dashboard growth from chronological `daily_volumes`; never append missing or future dates to the chart.
