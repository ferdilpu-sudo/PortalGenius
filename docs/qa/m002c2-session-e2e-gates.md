# M-002C2 — BFF session HTTP / multi-role release gate

Status: **NOT RUN**. This document is a test contract, **not** QA evidence.
Updated: 16 October 2026, after local GoTrue provider QA 9/9 PASS.

## Scope

The latest local Docker Auth provider check confirmed technical alias creation,
password update and deletion, disabled anonymous signup and concurrent *GoTrue*
token refresh. It **did not** exercise PortalGenius session cookies, Pages BFF
routes, app sessions SQL version/lease or hosted Auth signup settings.

Until the following test executes against an **isolated synthetic environment**,
do not merge PR #6 as a release-ready feature or enable account create/reset
on production. Do not reuse the administrator's real session or LayarBelajar.

## Required preflight

1. Separate application test origin from Production, with isolated Supabase DB
   and Auth storage. Confirm project ref/env binding cannot point to hosted
   PortalGenius or unrelated environments, and disabled public signup.
2. Create synthetic admin and teacher A/B, counselor A/B and principal only in
   this environment. No real student profiles, names or guardians; use fabricated
   records, short-lived accounts and a deterministic cleanup manifest.
3. Record only status codes, opaque test labels, session version numbers and
   synthetic IDs. Never print cookies, tokens, passwords, Auth aliases or secrets.
4. Require explicit operator confirmation that isolation/cleanup are working
   before any synthetic create operations.
5. Use real POST/GET requests through PortalGenius Pages handlers; only tests
   that go through the actual BFF + local database can close this gate.

## HTTP assertions

| Gate | Preconditions and action | Expected |
| --- | --- | --- |
| Revoke/replay | Login synthetic teacher; GET session, logout with valid Origin/CSRF; replay exact *previous* cookie to GET session | HTTP 401; no prior profile/CSRF returned |
| Parallel refresh | Expiry is near; issue at least 2 simultaneous GET /api/v1/auth/session requests carrying same synthetic cookie | No identity crossover; at most one DB refresh lease owner; other requests wait for committed version; valid sessions resolve to same actor |
| Lease conflict | Hold a synthetic refresh lease and trigger GET session until timeout | Bounded busy/unavailable, never old/wrong credentials, unbounded wait or privilege escalation |
| Refresh/logout race | Hold/rotate token and logout concurrently | All subsequent replay requests denied (HTTP 401); stale refresh cannot resurrect revoked session |
| Password reset | Admin resets synthetic teacher, then replay old cookie | HTTP 401; must_change_password true on fresh sign-in; old password fails |
| Role isolation | Login teacher A/B, counselor A/B, principal and call GET /api/v1/students, accounts, assignments | Teacher/counselor see only active assigned synthetic students; principal bulk student list forbidden; teacher accounts/admin assignment lists HTTP 403 |
| Origin + CSRF | Tamper Origin and X-CSRF-Token on protected mutating route | HTTP 403, no persistent writes |
| Signup-off hosted parity | Anonymous Supabase Auth signUp on isolated provider with signup disabled | Denied; no Auth identity created |
| Cleanup | Delete all synthetic data and Auth users, leave no reset pending | 0 QA fixture rows, 0 tokens logged |

A 503 from an unconfigured Preview backend is **not** evidence of a successful
role/refresh test. Anonymous/Origin-only tests remain separate gates.

## Release decision

Pass requires a machine-readable summary with per-gate evidence and independent
assertion that synthetic data were cleared. A local GoTrue provider PASS or
GitHub unit CI PASS alone does not satisfy these tests.

Open dependencies: isolated BFF test runner and migration strategy, deterministic
fixture teardown, real session replay/refresh concurrency, non-admin hosted role
boundary checks, production public signup setting verification, and operator
reset-pending reconciliation procedure. Tracked by
https://github.com/ferdilpu-sudo/PortalGenius/issues/2.

## Implemented local BFF Session E2E harness (16 October 2026)

**Status: CODE PREPARED / OPERATOR EXECUTION NOT RUN.** This is the first
bounded slice of session E2E, not the full matrix above.

Files: `scripts/qa-local-auth.ps1 -SessionE2E`,
`scripts/qa/localSessionE2E.mjs`,
`scripts/qa/localSessionFixtures.sql`. This mode starts a brand-new
Supabase Docker project with **only** the M-001 identity/session foundation
migration and QA-only helper SQL copied into its random temporary directory.
The helpers are NOT under `supabase/migrations` and must never be applied
to a hosted project. The standalone `9 checks` GoTrue provider tests run first.

The BFF harness binds Node's HTTP server to `127.0.0.1:55325` and calls
PortalGenius's actual Pages handler functions (not mocks). It uses a
**strictly pinned localhost exception** in `verifyEnv` permitted only with
`APP_ENV=local` and `EXPECTED_SUPABASE_PROJECT_REF=LOCAL_QA_ONLY`.
Production and staging still require HTTPS and their own Supabase project ref.

### Windows execution

From the existing `PortalGenius-M002C2-QA` clone, with Docker Desktop running:

```powershell
cd "$HOME\Documents\GitHub\PortalGenius-M002C2-QA"
git pull --ff-only origin feat/m002c2-account-provisioning-gates
powershell -NoProfile -File .\scripts\qa-local-auth.ps1 -SessionE2E
```

The new suite must demonstrate:

- **HTTP login/session** for a synthetic teacher, and teacher A/B isolation.
- Cross-Origin logout attempt refused (403) without revoking legitimate cookie.
- Valid logout followed by replay of the old cookie denied (401), other actor unaffected.
- Two parallel HTTP session GETs with near-expired encrypted tokens:
  same synthetic actor and precisely one database version transition.
- Held refresh lease returns a bounded busy response; logout still revokes;
  old cookie replay returns 401.
- Teardown removes synthetic account bindings and Auth identities, then
  CLI stops/clears only the isolated stack.

Expected marker **only after operator execution**:
`LOCAL_BFF_SESSION_QA_PASS: 5 gates; localhost only; no hosted project accessed`
and `LOCAL_BFF_SESSION_QA_CLEANUP_PASS: synthetic users removed`.

Never send passwords, API keys, cookies, encrypted tokens or full environment
output. Return only the PASS/BLOCKED lines. If the local stack reports failure,
keep the PR Draft, do not turn on provisioning/reset in Production, and correct
the precise fixture/handler issue first.

**Still unverified after local pass:** hosted Supabase signup OFF, real
Cloudflare Pages vs local Node handler parity, teacher/counselor/student
assignment HTTP isolation, reset pending reconciliation, browser Secure cookie
semantics, and the remainder of issue #2.

## Local operator startup failure and remediation (16 October 2026)

Operator ran `-SessionE2E` and observed `LOCAL_BFF_QA_SCHEMA_READY` followed by `LOCAL_QA_SUPABASE_COMMAND_FAILED: start (exit 1)` and local stack STOP. BFF HTTP tests **did not begin**; their outcome remains **NOT RUN**. Review of QA-only `scripts/qa/localSessionFixtures.sql` found an invalid bare `$` PostgreSQL function body delimiter in `pg_qa_unbind_staff`; corrected to matching `$qa$` tags. Added `tests/unit/localSessionFixtures.test.mjs` to detect malformed/unbalanced function bodies in future CI. Hardened the local CLI harness to classify start failures without printing unfiltered output or credentials. [Quality CI 56/56 PASS, Windows parser and build PASS](https://github.com/ferdilpu-sudo/PortalGenius/actions/runs/38854909769). **Fix awaits operator Docker re-test**. The earlier standalone local Auth 9/9 PASS is unchanged. Neither PR merge nor Production provisioning is authorized by these results.

## Operator acceptance — LOCAL BFF SESSION E2E PASS (16 October 2026)

After updating the QA branch, the operator ran `powershell -NoProfile -File .\scripts\qa-local-auth.ps1 -SessionE2E` on Windows Docker, reporting:

```text
LOCAL_AUTH_PROVIDER_QA_PASS: 9 checks; no hosted project accessed
PASS BFF login and session on isolated local HTTP
PASS BFF simultaneous requests keep teacher A/B identities separate
PASS BFF hostile Origin refused without revoking session
PASS BFF revoked cookie replay denied HTTP 401, teacher B unaffected
PASS BFF concurrent near-expiry HTTP refresh commits one lease/version
PASS BFF lease busy bounded and logout replay HTTP 401
LOCAL_BFF_SESSION_QA_CLEANUP_PASS: synthetic users removed
LOCAL_BFF_SESSION_QA_PASS: 5 gates; localhost only; no hosted project accessed
LOCAL_AUTH_QA_STOP: stopping only our isolated project
```

**Accepted:** locally hosted PortalGenius handler HTTP session replay after revoke, per-user isolation for two synthetic teachers, malicious Origin rejection, parallel refresh version/lease guard, bounded lease busy and logout replay; synthetic staff cleanup. The script's `5 gates` aggregate label covers six individual BFF PASS lines. Auth provider 9-check suite also passed locally.

**Still open:** real deployed Cloudflare Pages (hosted) parity; the hosted Supabase signup-off setting; HTTP student/assignment scoping across teacher A/B, counselor A/B and principal; admin reset-pending manual reconciliation; authentic browser-cookie behavior; lint/format gates. Local PASS is not proof of those. Keep PR #6 Draft and Production provisioning/password reset OFF.
