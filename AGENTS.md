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
- Read the latest verified summary row (`total_usdc > 0` or `tx_count > 0`) and the latest seven chronological chart rows exclusively from `daily_volumes`; incomplete newer rows must not zero previously verified metrics.
- Never write to `daily_volumes` from the frontend; `public.criar_dia_certo()` via `pg_cron` exclusively creates daily volume rows.
- Refresh the dashboard by rereading verified sources every 60 seconds and after `pix_onchain_events` inserts; never increment source values in browser state.
- Future point-entry flows write only `pontos`, `posicao`, and `valor_brl` to `historico_ponto`, then refetch the latest row.
- Treat `transactions` as a read-only proof source, always show its three latest real rows regardless of date, and never substitute demo signatures when no verifiable rows exist; proof claims must remain auditable.
- Calculate daily growth from real `transactions` grouped by the UTC date in `timestamp`; with fewer than three collected dates, label the dashboard as the start of real collection instead of showing a percentage.
