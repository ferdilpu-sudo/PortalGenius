# PortalGenius — Single-project production rollout (operator decision)

Date: 16 October 2026. Status: **CODE READY ON DRAFT PR #6; NOT DEPLOYED OR ENABLED**.

## Scope decision

The operator has declined a separate hosted QA Supabase project and
explicitly selected the existing **Portal Genius** Supabase project.
Do not reuse `layarbelajar-staging`, create a replacement hosted QA
project, pause another project, or enable a paid upgrade.

- Existing project ref: `vpglikrkvsnoyjvluigs` (Tokyo).
- Expected application origin: `https://portalgenius.pages.dev`.
- Existing `wrangler.toml` binding is updated on PR #6 to
  `APP_ENV=production`, matching the Production origin.
- Supabase remote migrations through
  `20261015154828_m002c2_staff_password_reset` were confirmed applied
  by read-only metadata queries. Do not reapply them.
- Read-only 16 October inventory: one administrator, zero staff roles,
  zero students, zero reset operations. No school/student records inspected.
- The operator's local Docker E2E 9 Auth / 5 session / 7 role gates
  previously passed. Those are LOCAL evidence, not hosted acceptance.

## Strict release boundaries

The production role/account data is **real**, so no synthetic fixture
inserts, auth deletions, table cleanup procedures, credential replay, or
destructive automated tests may run on this project.

1. PR #6 remains Draft until source changes and CI are reviewed.
2. The Accounts admin screen may display live account summaries read-only.
   The create panel gets capabilities from an admin-only, authenticated
   `GET /api/v1/accounts/capabilities` request. If the endpoint is
   unavailable or locked, the panel fails closed.
3. New account creation requires `ACCOUNT_PROVISIONING_ENABLED=enabled`
   AND `ACCOUNT_PROVISIONING_RELEASE=reviewed-v1`, with exact Production
   origin and project ref. Neither switch is committed to
   `wrangler.toml`. **Do not set either before a separate deliberate
   operator release decision, reviewed backup/restore readiness and CI
   acceptance.** These toggles supplement admin authorization, CSRF and
   idempotency checks; they are not credentials.
4. Production password reset remains **hard locked by code**, regardless
   of creation flags. Reconciliation of unknown password-update outcomes
   remains unsolved; enabling staff creation must not enable reset.
5. Operator identity verification is required for any *real* staff.
   The password is generated server-side, displayed once and is not
   written to GitHub, database notes, shared logs, screenshots, browser
   storage or email aliases.
6. Do not put Supabase secret/service keys or session encryption keys
   into committed files, public Cloudflare variables, UI data, or logs.
   Confirm that public signup is disabled before activating staff
   creation, using the actual Supabase Auth dashboard/settings.

## Rollout gates (no separate hosted QA project)

| Gate | Current status |
| --- | --- |
| Production project identity/migration metadata | Read-only verified |
| Production account/staff/student/reset counts | Read-only verified |
| Production APP_ENV correction | Implemented in Draft PR |
| Local Docker Auth + session + role E2E | Operator PASS (earlier) |
| Staff-create admin UI + guarded capability route | Implemented in Draft PR |
| CI typecheck/unit/build/lint/format | Verify latest PR commit |
| Hosted production Auth signup setting | Not independently verified |
| Backup and recovery review | Not performed in this increment |
| Staff creation on Production | **OFF — no real staff created** |
| Production admin reset | **OFF — recovery gate unresolved** |

## Next development without hosted QA

Review the PR and merge only after code/CI review and existing production
login regression acceptance. Keep runtime provisioning OFF after merge.
Then obtain specific approval to enable the two production create flags
for a single *real* staff account with verified identity and a recovery
plan. Do not use this application as a production testing sandbox.
Implement staff records, enrollment, and teaching assignments as
independent, reviewed migrations and admin workflows. Existing database
rows must remain intact.

## Read-only Production preflight — optional operator command

A separate script was added to make the **same production project** safe
to inspect without provisioning a QA Supabase project.

From a checkout of Draft PR #6 (with Node 22 and the committed
`wrangler.toml`), run:

```powershell
npm run qa:production:readonly
```

The script performs exactly two HTTP **GET** requests:

1. `https://portalgenius.pages.dev/api/v1/health`, confirming the expected
   PortalGenius API health payload.
2. `https://vpglikrkvsnoyjvluigs.supabase.co/auth/v1/settings`, using
   **only the publishable key** already present in tracked `wrangler.toml`.
   It requires `disable_signup: true` from live Supabase Auth.

Any mismatch, missing setting, redirect, unexpected payload or network
error fails closed. No credentials are printed and the script never
makes POST/PUT/PATCH/DELETE requests. Only record the PASS/BLOCKED label,
not raw network responses.

**Limits of evidence:** source `wrangler.toml` is not definitive proof
of deployed Cloudflare secret/variable settings, the API health handler
does not prove the live Supabase binding, and the public Auth settings
do not prove backup/restore capability. Dashboard verification of
production variables, signup controls, Auth provider email-alias
compatibility, backups and first-real-account onboarding is still
required separately. Do not infer permission to enable provisioning
from a passing GET-only script.

The CI test `tests/unit/productionReadOnlyPreflight.test.mjs`
uses a fake fetch implementation, including negative tests for wrong
project/host, signup enabled and redirects; **CI never invokes the live
GET requests**. The existing separate hosted QA runner remains retained
as non-release legacy material and should not be used to claim
an isolated environment exists.

## Operator live preflight — signup still enabled (16 October 2026)

The Windows operator executed `npm run qa:production:readonly` from
`PortalGenius-PR6-Review` at commit `621b869` after a clean
`npm ci`, **101/101 unit PASS** and local build PASS.

The command output was **`PRODUCTION_PUBLIC_SIGNUP_NOT_DISABLED`**.
Because the script checks the PortalGenius health payload first and
then Supabase Auth `/auth/v1/settings`, this confirms the health probe
passed and the live Auth server did **not** return
`disable_signup=true`. It is a **hosted security gate BLOCKED**, not
an infrastructure/test failure that can be ignored.

Required operator dashboard action (no database SQL / account fixture):

1. Open
   `https://supabase.com/dashboard/project/vpglikrkvsnoyjvluigs/auth/providers`
   for the **Portal Genius** project only.
2. Find the global **Allow new users to sign up** option and switch it
   **OFF**, saving the configuration. Do **not** disable the Email
   provider or password sign-in; existing username/password logins must
   remain functional. UI labels may vary.
3. Rerun `npm run qa:production:readonly` from the checked-out PR
   branch and record just PASS/BLOCKED labels, without passwords,
   cookies, API keys or full Auth settings responses.
4. Independently confirm existing administrator login after the
   setting change before merge/production activation. The preflight
   does not exercise login and a read-only PASS cannot replace
   interactive operator acceptance.

Source: https://supabase.com/docs/guides/auth/general-configuration

**Do not enable the two Production provisioning release flags,
merge PR #6, run synthetic hosted QA or create a staff account** merely
to resolve this finding. The Supabase project itself has not been
modified through the project tooling in this step.
