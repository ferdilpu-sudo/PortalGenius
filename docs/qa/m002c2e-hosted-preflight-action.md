# GitHub Actions manual Hosted QA E1

The dedicated workflow `.github/workflows/m002c2e-hosted-preflight.yml` is
**manual dispatch only**. It runs no fixture setup, no Auth account mutation,
no schema migration, and no credential replay.

Before running, configure the GitHub Actions environment named `hosted-qa`
with the exact values for a **separate PortalGenius QA** deployment and
Supabase project:

| Environment key | Type | Value |
| --- | --- | --- |
| `QA_PAGES_ORIGIN` | Variable | Full HTTPS origin of isolated QA Pages deployment |
| `QA_SUPABASE_PROJECT_REF` | Variable | 20-character reference of isolated QA Supabase project |
| `QA_SUPABASE_PUBLISHABLE_KEY` | Secret | Publishable key for the same isolated QA project |

Do **not** reuse the PortalGenius production Supabase project or
`layarbelajar-staging`. Do not configure Production `SUPABASE_SECRET_KEY`
or the Production application session encryption key in this environment.

For intended manual operation:

1. Verify with two maintainers that the Pages QA deployment really uses a
   separate Supabase project and that public signup is disabled.
2. **Important:** GitHub Actions requires a `workflow_dispatch` workflow
   to exist on the default branch before the Actions UI will offer
   **Run workflow**. This workflow currently exists only in Draft PR #6
   and therefore cannot yet be manually dispatched. **Do not merge the
   provisioning PR merely to activate the QA workflow.** Once independently
   reviewed and available on the default branch, choose
   `M002C2E isolated hosted QA preflight` in Actions and select the
   intended QA-enabled ref.
3. Until then, execute the same read-only
   `node --experimental-strip-types scripts/qa/hostedQaPreflight.mjs`
   locally using the QA-only environment placeholders documented in
   `m002c2e-hosted-parity.md`. The target refusal rules are identical.
4. Record the run URL (where available) and only the safe PASS/BLOCKED
   labels; never copy raw API keys or session tokens.
5. If missing configuration, mismatched runtime binding, unexpected
   response, non-HTTPS target, disabled key, or public signup enabled,
   keep Hosted E1 **BLOCKED**. Do not substitute another environment.

The runner checks configuration presence and runs
`scripts/qa/hostedQaPreflight.mjs`, which itself rejects the known
Production origin/ref before any request. The script issues only two GET
requests: Pages runtime binding probe and Supabase Auth public settings.
GitHub workflow completion is not hosted E2E proof and must never
automatically enable `ACCOUNT_PROVISIONING_ENABLED`.

Current status: E1 **CODE/CI READY, HOSTED NOT RUN** until isolated QA
resources and variables are available. PR #6 must remain Draft.
