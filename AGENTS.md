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
- Default the daily summary to the latest `daily_volumes` date, refetch an exact row when selected, total all real rows, and chart the seven latest rows chronologically.
- Never write to `daily_volumes` from the frontend; `public.criar_dia_certo()` via `pg_cron` exclusively creates daily volume rows.
- Refresh by rereading `daily_volumes` every 60 seconds and after its realtime changes; never increment source values in browser state.
- Future point-entry flows write only `pontos`, `posicao`, and `valor_brl` to `historico_ponto`, then refetch the latest row.
- Treat `pix_onchain_events` as the read-only proof source: show its 50 latest events and export only its real rows; never substitute demo signatures when no verifiable rows exist.
- Calculate dashboard growth from chronological `daily_volumes`; never append missing or future dates to the chart.
