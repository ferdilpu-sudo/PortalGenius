# M-002C2E — Hosted QA isolation and parity

Status: **READ-ONLY SAFETY PREFLIGHT IMPLEMENTED; HOSTED PARITY NOT RUN**.
Updated: 16 October 2026. This procedure does not activate account provisioning.

## Why Preview is not yet a safe synthetic test environment

The tracked `wrangler.toml` currently uses `https://portalgenius.pages.dev` and
the production Supabase project reference `vpglikrkvsnoyjvluigs`, even though
`APP_ENV=staging`. A Preview URL is **not proof of database separation**.
Never provision synthetic Auth users, run SQL fixtures, or replay cookies on a
Preview that has not independently proven its Supabase binding.

## Gate E1: isolated read-only hosted preflight

1. Create a **separate** Supabase QA project and a separate Cloudflare Pages
   staging/Preview deployment that binds only to that QA project. Use no
   production secret keys, databases, Auth users, administrator passwords or
   student records. All schema migrations must be reviewed and applied only
   to the isolated QA project.
2. Configure staging `APP_ORIGIN` to the exact QA deployment HTTPS origin,
   `APP_ENV=staging`, `SUPABASE_URL` and
   `EXPECTED_SUPABASE_PROJECT_REF` to the **same isolated QA** Supabase
   project. Configure appropriate staging secrets in the platform UI, never in
   source, console logs, issue comments or shell history.
3. Disable **Allow new users to sign up** in the isolated Supabase Auth project.
   Verify runtime Auth settings, not the dashboard checkbox alone.
4. Execute the read-only command with placeholders resolved to the isolated
   environment (use a nonsecret publishable key only):

```powershell
$env:QA_PAGES_ORIGIN = 'https://YOUR-ISOLATED-PREVIEW.pages.dev'
$env:QA_SUPABASE_PROJECT_REF = 'YOUR-ISOLATED-20-CHAR-REF'
$env:QA_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YOUR-QA-PUBLIC-KEY'
node --experimental-strip-types .\scripts\qa\hostedQaPreflight.mjs
Remove-Item Env:QA_PAGES_ORIGIN,Env:QA_SUPABASE_PROJECT_REF,Env:QA_SUPABASE_PUBLISHABLE_KEY
```

The command makes **two GET requests only**: the Pages
`/api/v1/qa/environment` runtime identifier probe and the same isolated
Supabase project's `/auth/v1/settings` endpoint. It checks exact origin,
project reference, and `disable_signup=true`. It refuses production origin
and production Supabase reference before performing network requests.
Redirects, missing configuration, unexpected body/status and signup enabled
all block PASS; errors are redacted. The QA endpoint returns only public
origin/ref, and returns 404 on Production or mismatched bindings.

Expected success:

```text
HOSTED_QA_READ_ONLY_PRECHECK_PASS: isolated binding and signup-off visible
HOSTED_QA_MUTATION_GATES_NOT_RUN: synthetic E2E still blocked
```

**This is E1 only, not hosted E2E acceptance.** A 404 on the current Preview
is the expected safe failure until separate staging bindings exist.

## Gate E2: hosted synthetic tests (NOT RUN)

After E1 PASS and operator review of isolation, implement a separate bounded
runner using synthetic accounts only. Test: `.invalid` alias create/login/
password update/delete and cleanup; cookie replay after revoke; parallel
refresh/lease/logout race; teacher A/B and counselor A/B active student scope;
principal list 403, actor spoof resistance, anonymous and direct RLS denials;
admin reset pending/unknown outcomes; and cleanup-before-PASS. Run no E2
mutation until an isolated project's cleanup mechanism and exact project
identity have independent evidence.

## Gate E3: recovery, quality and release (NOT RUN)

- Document and verify manual reconciliation of
  `private.staff_password_reset_ops` pending state. Never mark a reset
  completed from a timeout alone or reissue an uncertain password.
- Independent TypeScript-AST security lint and repository-wide source whitespace
  policy are already wired into `npm run lint` and `npm run format:check` and
  blocking CI. They are **not** a full ESLint/Biome/Prettier ruleset or
  automated code formatter. Adopt a standard pinned lint/formatter tool with
  committed lockfile, and review any repository-wide style migration before
  closing the complete E3 quality gate.
- Review before moving PR #6 from Draft; production `ACCOUNT_PROVISIONING_ENABLED`
  remains absent/off and the explicit production-host block remains mandatory.

Evidence must be redacted labels, links to CI and QA project identifiers only.
Never post keys, session tokens, cookies, passwords, or real account details.

## E1 runner and quality checkpoint — 16 October 2026

- Draft PR #6 adds `.github/workflows/m002c2e-hosted-preflight.yml`, a
  **manual-only** GitHub Actions definition with `contents: read`, environment
  `hosted-qa` and mandatory isolated QA inputs. The workflow itself cannot
  yet be manually dispatched until its file exists on the **default branch**.
  Do not merge PR #6 solely to make this button available. See
  [manual runner instructions](m002c2e-hosted-preflight-action.md).
- Safe alternative prior to that: invoke the existing local read-only preflight
  script with strictly QA-only environment variables. It rejects Production
  origin/ref before any network call.
- PR Quality [run 38870055207](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38870055207)
  **PASS**: AST lint PASS, whitespace format policy PASS, 69/69 unit tests,
  typecheck, build, Windows PowerShell parse and npm audit (0 vulnerabilities).
  These tests provide **code quality evidence only**, not hosted E1 evidence.
- Neither an isolated Supabase QA project nor an isolated Pages deployment
  is yet available in the connected project inventory. **Hosted E1/E2 remain
  BLOCKED**, and Production account provisioning/reset remain disabled.

## E3 incremental formatter and triage checkpoint — 16 October 2026

- `prettier@3.6.2` is pinned directly in `package.json` and
  `package-lock.json` with registry integrity; the blocking CI command
  `npm run format:standard:check` runs the actual Prettier formatter check on
  `package.json`, `package-lock.json` and `.prettierrc.json`.
- Independent TypeScript-AST security lint and source whitespace checks still
  cover implementation source. **Do not claim ESLint/Biome full lint policy
  or repo-wide Prettier**: legacy compact TS/JS and documents must be migrated
  in separately reviewed, nonfunctional batches.
- `server/accounts/classifyResetReconciliation.ts` offers pure, read-only
  classification of reset case evidence. No API uses it to reopen pending
  operations, and all outcomes forbid password disclosure, automatic retry
  and ledger mutation.
- [Quality CI 38878649233](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38878649233)
  **PASS:** `npm ci`, pinned Prettier check, AST lint, whitespace check,
  77/77 unit tests, typecheck, build, audit 0 and Windows syntax.
- Hosted E1 and E2 **NOT RUN**, reset recovery mutation **NOT IMPLEMENTED**,
  PR #6 **Draft**, Production provisioning/reset **OFF**.
