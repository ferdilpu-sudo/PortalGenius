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
- Add actual lint and formatter tools, pinned in lockfile with scripts and
  blocking CI; `tsc` does not qualify as lint.
- Review before moving PR #6 from Draft; production `ACCOUNT_PROVISIONING_ENABLED`
  remains absent/off and the explicit production-host block remains mandatory.

Evidence must be redacted labels, links to CI and QA project identifiers only.
Never post keys, session tokens, cookies, passwords, or real account details.
