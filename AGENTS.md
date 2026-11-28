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

- Keep stack-layer types, starter presets, and explicitly illustrative sample diffs in `src/lib/pipeline-data.ts` so future setup screens share one typed source of truth.
- Keep database schema changes in Lovable Database-managed Drizzle migrations so repository history stays aligned with the applied database.
- Accounts use Lovable Cloud managed OAuth via `@/integrations/lovable`, with session state shared through `AuthProvider` in the root route; private per-user data lives in `public.profiles`, auto-created by an auth trigger.
- Workspace = the signed-in user (`workspace_id = auth.uid()`) in `stack_items`, `owners`, `alerts`, `scores`; owner-only RLS keeps it private without a membership table until teams exist.
- Workspace matching, severity and scoring are deterministic (`src/lib/reliability.ts`, tested); the LLM classifies each global change once, so per-user scans cost no AI calls.
- Penalties and score thresholds live as constants in `src/lib/reliability.ts` so tuning never touches the formula.
- Brand marks come from Simple Icons (CC0) path data in `src/components/brand/BrandIcon.tsx`; vendors without a mark fall back to a lettered tile, never a fabricated logo.
