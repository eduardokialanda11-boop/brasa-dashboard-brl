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
- Read today's summary and the latest seven chronological chart rows exclusively from `daily_volumes`; this keeps every visible metric tied to the same real source.
- Never write to `daily_volumes` from the frontend; `public.criar_dia_certo()` via `pg_cron` exclusively creates daily volume rows.
- Do not simulate dashboard values in browser state or timers; refresh displayed values only from database reads.
- Future point-entry flows write only `pontos`, `posicao`, and `valor_brl` to `historico_ponto`, then refetch the latest row.
