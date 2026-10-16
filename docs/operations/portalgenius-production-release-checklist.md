# PortalGenius — Production release checklist (single Supabase project)

**Status:** release review; no production writes or merge authorized by this checklist.
**Operator evidence date:** 16 October 2026.
**Supabase project:** `Portal Genius` / `vpglikrkvsnoyjvluigs`.
**Cloudflare Production origin:** `https://portalgenius.pages.dev`.

This procedure uses **the existing production database only**. No second hosted QA
database or destructive synthetic QA is required. Never copy credentials,
student records, backup files, Auth tokens or personal data into GitHub,
chat transcripts, CI logs or the repository.

## 1. Auth and account safety — operator-confirmed PASS

- From the clean review checkout at `621b869`, the operator ran
  `npm ci`, all 101 unit tests, and the Vite/TypeScript build: PASS.
- The first live `npm run qa:production:readonly` was BLOCKED because
  Supabase public signup was not disabled.
- After the operator changed the global Auth setting, the **second**
  live read-only preflight returned:
  `PRODUCTION_READ_ONLY_PREFLIGHT_PASS: API health and Auth signup-off`.
- The operator independently confirmed the existing administrator can
  still log in. **Hosted signup-off and existing-admin-login checks PASS.**

This does **not** prove Cloudflare deployment runtime variables, availability
of backups, acceptance of non-deliverable Auth aliases in hosted provisioning,
or any new user workflow.

## 2. Database permissions — remote metadata read-only review

- Database `ACTIVE_HEALTHY`, Postgres 17, Tokyo.
- 21 application tables checked: all have RLS enabled.
- 19 tables have no direct `anon` or `authenticated` SELECT or write
  grants. The other two, `accounts` and `account_roles`, allow
  `authenticated` SELECT of the current user's own row via `auth.uid()`
  policies only, with no direct client write grant.
- Supabase Security Advisor still lists 19 informational
  `rls_enabled_no_policy` findings; these match the explicitly closed
  direct-table-access design and should not be "fixed" by opening
  public RLS policies.

These are metadata checks, not a replacement for end-to-end authorization
testing in the live deployment.

## 3. Backup and recovery — OPEN

Supabase's official backup documentation states **daily automatic backups
are provided to Pro, Team and Enterprise projects**, and recommends
regular Supabase CLI `db dump` exports for Free-tier projects.
This project has **no independently verified restore point** at this stage.

Operator requirements **before enabling account creation or making new
production academic-data writes**:

1. Open [PortalGenius Database Backups](https://supabase.com/dashboard/project/vpglikrkvsnoyjvluigs/database/backups/scheduled)
   and establish the actual project backup availability/retention.
2. If automatic backups are unavailable, use the official
   [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups)
   and [CLI dump guide](https://supabase.com/docs/reference/cli/supabase-db-dump)
   to export a backup with approved database credentials on a trusted
   machine. Store it **outside the Git repository** in an encrypted,
   access-controlled, off-device location.
3. The default `supabase db dump` excludes managed schemas such as
   `auth` and `storage`, and the default dump is schema-only.
   Explicit data export and a separate, reviewed recovery plan for
   Auth identities, session secrets, configuration and any Storage
   objects are required. A schema-only `dump.sql` is **not** a
   complete production recovery plan.
4. Verify backup files exist, are readable, and have an integrity hash;
   plan a restore rehearsal to a non-production/disposable environment
   before relying on backups. **Do not restore to Production** as a test.

No database password, connection URI or backup is to be committed or
shared. Do not claim `BACKUP_PASS` until actual backup and recovery
evidence are reviewed.

## 4. Cloudflare Production binding — OPEN

After deploying reviewed code and **before** activating account creation,
check the live Cloudflare Pages **Production** deployment and its active
environment configuration, not just `wrangler.toml` in Git:

- `APP_ENV=production`
- `APP_ORIGIN=https://portalgenius.pages.dev`
- `EXPECTED_SUPABASE_PROJECT_REF=vpglikrkvsnoyjvluigs`
- `SUPABASE_URL=https://vpglikrkvsnoyjvluigs.supabase.co`
- Supabase publishable key matches the intended project.
- `SUPABASE_SECRET_KEY` and `SESSION_ENCRYPTION_KEY` exist **only
  as encrypted secrets**, with no secret value revealed to reviewers.
- `ACCOUNT_PROVISIONING_ENABLED` and
  `ACCOUNT_PROVISIONING_RELEASE` are both **unset** at initial release.

A public API health PASS confirms only the API is reachable; it does
not authenticate which secret values Cloudflare deployed or verify
that its runtime project binding is correct. Preview cannot authorize
database writes.

## 5. Password and provisioning risks — OPEN / explicitly deferred

- Supabase Security Advisor warns that leaked-password detection is
  disabled. Official docs state the feature is **Pro Plan and above**;
  it is not a Free-tier setting that can simply be switched on.
  Do not upgrade billing without a separate operator decision.
  Use existing strong-password checks, high-entropy generated temporary
  passwords, login rate limiting and mandatory first-login change as
  compensating safeguards; accept/record remaining risk separately.
  [Docs](https://supabase.com/docs/guides/auth/password-security).
- Hosted Supabase's acceptance of `@auth.portalgenius.invalid`
  Auth admin-created identities is **not verified**. Local Docker
  GoTrue acceptance alone is not hosted proof. Do not create disposable
  hosted test accounts or automatically retry uncertain provisioning.
- The production creation gate requires **two independent runtime flags**,
  set only after a separate deliberate release approval. Both remain
  unset. Production password reset stays **hard OFF** in code pending
  unknown/pending-state reconciliation.

## 6. Final release decision

| Gate | Status |
| --- | --- |
| Existing administrator login | OPERATOR PASS |
| Public signup disabled (live Auth GET) | OPERATOR PASS |
| API Production health (live GET) | OPERATOR PASS |
| Local/CI tests and build | PASS at reviewed commits |
| Application RLS / direct-table grant metadata | READ-ONLY VERIFIED |
| Backup availability, restore rehearsal | OPEN |
| Cloudflare live environment/secret binding parity | OPEN |
| Hosted staff Auth alias and first real-user handoff | OPEN |
| Production staff creation | OFF |
| Production password reset | HARD OFF |
| PR #6 merged/deployed | NO; Draft |

**Review recommendation:** maintain Draft PR #6 and keep both production
release flags unset. Once backup and deployment parity are verified,
perform a deliberate code merge with staff-creation OFF. Enabling first
real-user creation is a separate, explicitly reviewed operation.
